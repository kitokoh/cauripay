import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard, ApiKeyRequest } from './api-key.guard';
import { sha256Hex } from '../utils/hashing';

type Row = Record<string, unknown> & { id: string };

class FakePrisma {
  rows: Row[] = [];

  apiKey = {
    findUnique: async (args: { where: Record<string, unknown> }) => {
      return (
        this.rows.find((r) =>
          Object.entries(args.where).every(([k, v]) => r[k] === v),
        ) ?? null
      );
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = this.rows.find((r) => r.id === args.where.id)!;
      Object.assign(row, args.data);
      return row;
    },
  };
}

function buildGuard(rows: Row[]) {
  const prisma = new FakePrisma();
  prisma.rows = rows;
  const guard = new ApiKeyGuard(prisma as never);
  return { guard, prisma };
}

function request(overrides: Partial<ApiKeyRequest> = {}): ApiKeyRequest {
  return {
    headers: {},
    method: 'GET',
    ...overrides,
  } as unknown as ApiKeyRequest;
}

function context(req: ApiKeyRequest) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as never;
}

describe('ApiKeyGuard (GOURSI-050a)', () => {
  const owner = 'user-1';
  const activeSk = `sk_test_${'a'.repeat(32)}`;
  const activePk = `pk_test_${'b'.repeat(24)}`;
  const revokedSk = `sk_test_${'c'.repeat(32)}`;

  const activeRows: Row[] = [
    { id: 'sk-row-1', name: 'clé', pairId: 'pair-1', keyPrefix: 'sk_test_', keyHash: sha256Hex(activeSk), mode: 'TEST', status: 'ACTIVE', ownerUserId: owner, revokedAt: null },
    { id: 'pk-row-1', name: 'clé', pairId: 'pair-1', keyPrefix: 'pk_test_', keyHash: sha256Hex(activePk), mode: 'TEST', status: 'ACTIVE', ownerUserId: owner, revokedAt: null },
    { id: 'sk-row-2', name: 'révoquée', pairId: 'pair-2', keyPrefix: 'sk_test_', keyHash: sha256Hex(revokedSk), mode: 'TEST', status: 'REVOKED', ownerUserId: owner, revokedAt: new Date() },
  ];

  it('accepte une clé sk_ valide et attache { apiKeyId, mode, ownerUserId }', async () => {
    const { guard, prisma } = buildGuard(activeRows);
    const req = request({
      method: 'POST',
      headers: { authorization: `Bearer ${activeSk}` },
    });
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(req.apiKey).toEqual({
      apiKeyId: 'sk-row-1',
      mode: 'TEST',
      ownerUserId: owner,
    });
    // lastUsedAt mis à jour (best effort)
    await new Promise((r) => setTimeout(r, 5));
    expect(prisma.rows.find((r) => r.id === 'sk-row-1')!.lastUsedAt).toBeInstanceOf(Date);
  });

  it('accepte pk_ en lecture seule (GET)', async () => {
    const { guard } = buildGuard(activeRows);
    const req = request({ headers: { authorization: `Bearer ${activePk}` } });
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(req.apiKey?.apiKeyId).toBe('pk-row-1');
  });

  it('refuse pk_ sur une écriture (POST) → 401', async () => {
    const { guard } = buildGuard(activeRows);
    const req = request({
      method: 'POST',
      headers: { authorization: `Bearer ${activePk}` },
    });
    await expect(guard.canActivate(context(req))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context(req))).rejects.toMatchObject({
      response: { code: 'INVALID_API_KEY' },
    });
  });

  it('clé révoquée → 401 API_KEY_REVOKED', async () => {
    const { guard } = buildGuard(activeRows);
    const req = request({ headers: { authorization: `Bearer ${revokedSk}` } });
    await expect(guard.canActivate(context(req))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context(req))).rejects.toMatchObject({
      response: { code: 'API_KEY_REVOKED' },
    });
  });

  it('clé inconnue → 401 INVALID_API_KEY (et comparaison temps constant)', async () => {
    const { guard } = buildGuard(activeRows);
    const req = request({ headers: { authorization: `Bearer sk_test_${'z'.repeat(32)}` } });
    await expect(guard.canActivate(context(req))).rejects.toMatchObject({
      response: { code: 'INVALID_API_KEY' },
    });
  });

  it('Authorization absente → 401 MISSING_API_KEY', async () => {
    const { guard } = buildGuard(activeRows);
    await expect(guard.canActivate(context(request()))).rejects.toMatchObject({
      response: { code: 'MISSING_API_KEY' },
    });
  });

  it('préfixe inconnu (ni sk_ ni pk_) → 401 INVALID_API_KEY', async () => {
    const { guard } = buildGuard(activeRows);
    const req = request({ headers: { authorization: 'Bearer abc_def_123' } });
    await expect(guard.canActivate(context(req))).rejects.toMatchObject({
      response: { code: 'INVALID_API_KEY' },
    });
  });
});
