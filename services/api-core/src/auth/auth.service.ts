import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { RedisClient, REDIS } from '../prisma/redis.module';
import { Inject } from '@nestjs/common';
import { hashSecret, verifySecret } from './password.util';
import { randomInt } from 'node:crypto';
import {
  KycLevel,
  UserRole,
  WalletStatus,
  WalletType,
} from '@goursi/shared-types';
import { validatePhoneNumber } from '@goursi/validation-rules';
import { User } from '@prisma/client';

const LOCKOUT_AFTER = 3;
const LOCKOUT_TTL_SECONDS = 30 * 60; // 30 min
const OTP_TTL_SECONDS = 5 * 60; // 5 min

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  // ── Inscription (GOURSI-021b) : User + Wallet + KycRecord en une $transaction ──

  async register(dto: { phone: string; fullName: string; password: string }): Promise<{ userId: string; otpSent: boolean }> {
    if (!validatePhoneNumber(dto.phone)) {
      throw new BadRequestException({ code: 'INVALID_PHONE', message: 'Téléphone invalide (+235XXXXXXXX)' });
    }
    if (dto.password.length < 8) {
      throw new BadRequestException({ code: 'WEAK_PASSWORD', message: 'Mot de passe : 8 caractères minimum' });
    }
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Ce numéro est déjà inscrit' });
    }

    const passwordHash = hashSecret(dto.password);
    const accountNumber = dto.phone.replace('+', ''); // 235XXXXXXXX → accountNumber unique

    // ADR-003 : wallet créé à l'inscription (BASIC), tout ou rien
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: dto.phone,
          fullName: dto.fullName,
          passwordHash,
          role: UserRole.CUSTOMER,
          kycLevel: KycLevel.BASIC,
        },
      });
      await tx.wallet.create({
        data: {
          accountNumber,
          type: WalletType.CUSTOMER,
          status: WalletStatus.ACTIVE,
          ownerId: created.id,
        },
      });
      await tx.kycRecord.create({
        data: { userId: created.id, requestedLevel: KycLevel.BASIC, status: 'PENDING' as never },
      });
      await tx.auditLog.create({
        data: { resourceType: 'User', resourceId: created.id, action: 'REGISTER', actorId: created.id },
      });
      return created;
    });

    await this.sendOtp(user, 'LOGIN');
    this.logger.log(`Inscription OK ${user.id} (${dto.phone})`);
    return { userId: user.id, otpSent: true };
  }

  // ── Login (GOURSI-021c) : JWT + verrouillage 3 essais (Redis 30 min) ──

  async login(dto: { phone: string; password: string }): Promise<AuthTokens> {
    if (!validatePhoneNumber(dto.phone)) {
      throw new BadRequestException({ code: 'INVALID_PHONE', message: 'Téléphone invalide' });
    }
    const lockKey = `auth:lock:${dto.phone}`;
    const locked = await this.redis.get(lockKey);
    if (locked) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_LOCKED',
        message: 'Compte verrouillé 30 min (trop de tentatives)',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user || !verifySecret(dto.password, user.passwordHash)) {
      const attempts = await this.redis.incr(`auth:fail:${dto.phone}`);
      if (attempts === 1) {
        await this.redis.expire(`auth:fail:${dto.phone}`, LOCKOUT_TTL_SECONDS);
      }
      if (attempts >= LOCKOUT_AFTER) {
        await this.redis.set(lockKey, '1', 'EX', LOCKOUT_TTL_SECONDS);
        await this.redis.del(`auth:fail:${dto.phone}`);
        await this.prisma.user.update({
          where: { id: user?.id ?? '00000000-0000-0000-0000-000000000000' },
          data: { status: 'LOCKED', lockedUntil: new Date(Date.now() + LOCKOUT_TTL_SECONDS * 1000) },
        }).catch(() => undefined);
        this.logger.warn(`Verrouillage ${dto.phone} (3 échecs)`);
      }
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Identifiants incorrects' });
    }

    if (!user.phoneVerified) {
      throw new UnauthorizedException({ code: 'PHONE_NOT_VERIFIED', message: 'Vérifiez votre téléphone (OTP)' });
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'ACCOUNT_SUSPENDED', message: 'Compte suspendu' });
    }

    await this.redis.del(`auth:fail:${dto.phone}`);
    await this.prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });
    this.logger.log(`Login OK ${user.id}`);
    return this.issueTokens(user);
  }

  // ── OTP (GOURSI-021d) : 6 chiffres, Redis TTL 5 min ──

  async sendOtp(user: User, purpose: 'LOGIN' | 'CASH_IN' | 'CASH_OUT'): Promise<void> {
    const code = randomInt(100000, 999999).toString();
    const codeHash = hashSecret(code);
    await this.redis.set(`otp:${purpose}:${user.phone}`, codeHash, 'EX', OTP_TTL_SECONDS);
    await this.prisma.otp.create({
      data: {
        userId: user.id,
        codeHash,
        purpose,
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      },
    });
    // Canal SMS branché via notification-service (événement) — simulé en dev.
    this.logger.log(`OTP ${purpose} émis pour ${user.phone} (dev: ${code})`);
  }

  async verifyOtp(dto: { phone: string; code: string; purpose?: string }): Promise<{ verified: boolean }> {
    const purpose = dto.purpose ?? 'LOGIN';
    const key = `otp:${purpose}:${dto.phone}`;
    const hash = await this.redis.get(key);
    if (!hash || !verifySecret(dto.code, hash)) {
      throw new BadRequestException({ code: 'INVALID_OTP', message: 'OTP invalide ou expiré' });
    }
    await this.redis.del(key);
    if (purpose === 'LOGIN') {
      await this.prisma.user.update({
        where: { phone: dto.phone },
        data: { phoneVerified: true },
      });
    }
    return { verified: true };
  }

  // ── Refresh (GOURSI-021e) ──

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Compte introuvable ou inactif' });
    }
    return this.issueTokens(user);
  }

  // ── Change MPIN (GOURSI-021f) ──

  async changeMpin(userId: string, dto: { oldMpin?: string; newMpin: string }): Promise<void> {
    if (!/^\d{6}$/.test(dto.newMpin)) {
      throw new BadRequestException({ code: 'INVALID_MPIN', message: 'MPIN : 6 chiffres' });
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 'NOT_FOUND', message: 'Utilisateur inconnu' });
    }
    if (dto.oldMpin && user.mPinHash && !verifySecret(dto.oldMpin, user.mPinHash)) {
      throw new BadRequestException({ code: 'INVALID_MPIN', message: 'Ancien MPIN incorrect' });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mPinHash: hashSecret(dto.newMpin) },
    });
    await this.prisma.auditLog.create({
      data: { resourceType: 'User', resourceId: userId, action: 'CHANGE_MPIN', actorId: userId },
    });
  }

  private issueTokens(user: User): AuthTokens {
    return {
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user),
      expiresIn: 15 * 60,
    };
  }
}
