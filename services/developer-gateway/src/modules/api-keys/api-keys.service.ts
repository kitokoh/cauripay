import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyMode, ApiKeyStatus } from '../../../node_modules/.prisma/developer-gateway-client';
import { sha256Hex } from '../../common/utils/hashing';

export const SECRET_KEY_PREFIX = 'sk_test_';
export const PUBLIC_KEY_PREFIX = 'pk_test_';

export interface CreatedApiKey {
  id: string;
  pairId: string;
  name: string;
  mode: ApiKeyMode;
  keyPrefix: string;
  secretKey: string; // retourné UNE seule fois — jamais re-stocké ni re-servi
  publicKey: string;
  createdAt: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  mode: ApiKeyMode;
  status: ApiKeyStatus;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

/**
 * Gestion des clés API sandbox (GOURSI-050a) :
 * - création d'une paire sk_test_<nanoid(32)> / pk_test_<nanoid(24)>
 * - stockage UNIQUEMENT des hashes sha256 + préfixes (jamais en clair)
 * - révocation (revokedAt) et rotation (nouvelle sk, ancienne révoquée)
 */
@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerUserId: string, name: string): Promise<CreatedApiKey> {
    const pairId = randomUUID();
    const secretKey = `${SECRET_KEY_PREFIX}${nanoid(32)}`;
    const publicKey = `${PUBLIC_KEY_PREFIX}${nanoid(24)}`;
    const createdAt = new Date();

    const skRow = await this.prisma.$transaction(async (tx) => {
      const sk = await tx.apiKey.create({
        data: {
          name,
          pairId,
          keyPrefix: secretKey.slice(0, 8),
          keyHash: sha256Hex(secretKey),
          mode: ApiKeyMode.TEST,
          status: ApiKeyStatus.ACTIVE,
          ownerUserId,
        },
      });
      await tx.apiKey.create({
        data: {
          name,
          pairId,
          keyPrefix: publicKey.slice(0, 8),
          keyHash: sha256Hex(publicKey),
          mode: ApiKeyMode.TEST,
          status: ApiKeyStatus.ACTIVE,
          ownerUserId,
        },
      });
      return sk;
    });

    return {
      id: skRow.id,
      pairId,
      name,
      mode: ApiKeyMode.TEST,
      keyPrefix: secretKey.slice(0, 8),
      secretKey,
      publicKey,
      createdAt: createdAt.toISOString(),
    };
  }

  /** Liste des paires de clés (une entrée par paire, jamais de hash ni de secret). */
  async list(ownerUserId: string): Promise<ApiKeyListItem[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        mode: true,
        status: true,
        createdAt: true,
        revokedAt: true,
        lastUsedAt: true,
      },
    });
    // Une entrée par paire : on ne montre que les lignes clé secrète (sk_)
    return keys.filter((k) => k.keyPrefix.startsWith('sk_'));
  }

  async revoke(ownerUserId: string, id: string) {
    const key = await this.requireOwnedKey(ownerUserId, id);
    const revokedAt = new Date();
    await this.prisma.apiKey.updateMany({
      where: { pairId: key.pairId },
      data: { status: ApiKeyStatus.REVOKED, revokedAt },
    });
    return { id, pairId: key.pairId, status: ApiKeyStatus.REVOKED, revokedAt: revokedAt.toISOString() };
  }

  /** Rotation : nouvelle clé secrète, l'ancienne est révoquée (la pk_ reste valide). */
  async rotate(ownerUserId: string, id: string) {
    const key = await this.requireOwnedKey(ownerUserId, id);
    if (!key.keyPrefix.startsWith('sk_')) {
      throw new NotFoundException({ code: 'API_KEY_NOT_FOUND', message: 'Rotation impossible sur une clé publique' });
    }
    const newSecret = `${SECRET_KEY_PREFIX}${nanoid(32)}`;
    const createdAt = new Date();
    const newRow = await this.prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: key.id },
        data: { status: ApiKeyStatus.REVOKED, revokedAt: new Date() },
      });
      return tx.apiKey.create({
        data: {
          name: key.name,
          pairId: key.pairId,
          keyPrefix: newSecret.slice(0, 8),
          keyHash: sha256Hex(newSecret),
          mode: ApiKeyMode.TEST,
          status: ApiKeyStatus.ACTIVE,
          ownerUserId,
        },
      });
    });
    return {
      id: newRow.id,
      pairId: key.pairId,
      name: key.name,
      mode: ApiKeyMode.TEST,
      keyPrefix: newSecret.slice(0, 8),
      secretKey: newSecret, // retourné UNE seule fois
      createdAt: createdAt.toISOString(),
    };
  }

  private async requireOwnedKey(ownerUserId: string, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.ownerUserId !== ownerUserId) {
      throw new NotFoundException({ code: 'API_KEY_NOT_FOUND', message: 'Clé API introuvable' });
    }
    return key;
  }
}
