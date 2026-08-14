import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { REDIS } from '../common/redis.module';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  };
  type PrismaMock = {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  const prismaMock: PrismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
  };
  const jwtMock = { sign: jest.fn(() => 'token'), verifyAsync: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: REDIS, useValue: redisMock },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('register', () => {
    it('rejette un numéro invalide', async () => {
      await expect(
        service.register({ phone: '123', password: 'secret' }),
      ).rejects.toThrow(ConflictException);
    });

    it('crée User + Wallet + KycRecord en une $transaction', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const result = await service.register({
        phone: '+23566000001',
        password: 'secret',
        fullName: 'Test User',
      });
      expect(result.walletId).toBeDefined();
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('verrouille après 3 essais', async () => {
      redisMock.get.mockResolvedValue('3');
      await expect(
        service.login({ phone: '+23566000001', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('incrémente le compteur sur identifiants invalides', async () => {
      redisMock.get.mockResolvedValue(null);
      redisMock.incr.mockResolvedValue(1);
      redisMock.expire.mockResolvedValue(1);
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ phone: '+23566000001', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(redisMock.incr).toHaveBeenCalledWith('lock:+23566000001');
    });

    it('retourne des tokens sur succès', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+23566000001',
        passwordHash: await bcrypt.hash('secret', 4),
        kycLevel: 'BASIC',
      });
      const result = await service.login({ phone: '+23566000001', password: 'secret' });
      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('token');
    });
  });

  describe('changeMpin', () => {
    it('modifie le PIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', mPinHash: null });
      prismaMock.user.update.mockResolvedValue({});
      const result = await service.changeMpin('u1', { oldMpin: '', newMpin: '123456' });
      expect(result.message).toBe('PIN modifié');
    });
  });
});
