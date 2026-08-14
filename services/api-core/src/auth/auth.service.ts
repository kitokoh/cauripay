import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisProvider, REDIS } from '../common/redis.module';
import { Inject } from '@nestjs/common';
import { validatePhoneNumber } from '@cauripay/validation-rules';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { WalletType, KycLevel } from '@prisma/client';

const LOGIN_MAX_ATTEMPTS = 3;
const LOGIN_LOCK_MINUTES = 30;
const OTP_TTL_SECONDS = 300;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS) private readonly redis: RedisProvider,
  ) {}

  /** POST /auth/register — User + Wallet + KycRecord en une $transaction. */
  async register(dto: { phone: string; password: string; fullName?: string; email?: string }) {
    if (!validatePhoneNumber(dto.phone)) {
      throw new ConflictException({ code: 'INVALID_PHONE', message: 'Numéro invalide (+235)' });
    }
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException({
        code: 'PHONE_ALREADY_REGISTERED',
        message: 'Numéro déjà enregistré',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userId = randomUUID();
    const walletId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          phone: dto.phone,
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          kycLevel: KycLevel.BASIC,
          wallets: {
            create: { id: walletId, type: WalletType.CUSTOMER, currency: 'XAF' },
          },
          kycRecord: { create: { status: 'PENDING', level: KycLevel.BASIC, documents: [] } },
        },
      });
    });

    return { userId, walletId, message: 'Inscription réussie' };
  }

  /** POST /auth/login — JWT + verrouillage 3 essais (Redis 30 min). */
  async login(dto: { phone: string; password: string }) {
    const lockKey = `lock:${dto.phone}`;
    const attempts = Number((await this.redis.get(lockKey)) ?? '0');
    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_LOCKED',
        message: 'Compte verrouillé 30 min',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      const next = await this.redis.incr(lockKey);
      if (next === 1) await this.redis.expire(lockKey, LOGIN_LOCK_MINUTES * 60);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants invalides',
      });
    }

    await this.redis.del(lockKey);
    return this.issueTokens(user.id, user.phone, user.kycLevel);
  }

  /** POST /auth/verify-otp — OTP SMS 6 chiffres (Redis TTL 5 min). */
  async verifyOtp(dto: { phone: string; otp: string }) {
    const stored = await this.redis.get(`otp:${dto.phone}`);
    if (!stored || stored !== dto.otp) {
      throw new UnauthorizedException({ code: 'INVALID_OTP', message: 'OTP invalide ou expiré' });
    }
    await this.redis.del(`otp:${dto.phone}`);
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user)
      throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'Utilisateur inconnu' });
    return { verified: true };
  }

  /** POST /auth/refresh — nouveau JWT à partir d'un refresh token (jwt-service vérifie). */
  async refresh(dto: { refreshToken: string }) {
    try {
      const payload = await this.jwt.verifyAsync(dto.refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return this.issueTokens(user.id, user.phone, user.kycLevel);
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH',
        message: 'Refresh token invalide',
      });
    }
  }

  /** POST /auth/change-mpin — modification du PIN (mPinHash). */
  async changeMpin(userId: string, dto: { oldMpin: string; newMpin: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.mPinHash && !(await bcrypt.compare(dto.oldMpin, user.mPinHash))) {
      throw new UnauthorizedException({ code: 'INVALID_MPIN', message: 'Ancien PIN invalide' });
    }
    const newHash = await bcrypt.hash(dto.newMpin, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { mPinHash: newHash } });
    return { message: 'PIN modifié' };
  }

  /** Émet un OTP (utilisé en dev / simulateur SMS). */
  async requestOtp(phone: string): Promise<{ otp: string; ttlSeconds: number }> {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.set(`otp:${phone}`, otp, OTP_TTL_SECONDS);
    return { otp, ttlSeconds: OTP_TTL_SECONDS };
  }

  private issueTokens(userId: string, phone: string, kycLevel: string) {
    const payload = { sub: userId, phone, kycLevel };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }
}
