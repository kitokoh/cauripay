import { ApiKeysService } from './api-keys.service';
import { sha256Hex } from '../../common/utils/hashing';

type Row = Record<string, unknown> & { id: string };

/** Mini-fake Prisma (mémoire) — uniquement les méthodes utilisées par ApiKeysService. */
class FakePrisma {
  rows: Row[] = [];
  private seq = 1;

  apiKey = {
    create: async (args: { data: Record<string, unknown> }) => {
      const row: Row = {
        id: `key_${this.seq++}`,
        ...args.data,
        createdAt: new Date(),
        revokedAt: null,
        lastUsedAt: null,
      };
      this.rows.push(row);
      return row;
    },
    findMany: async (args: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
      let out = this.rows.filter((r) =>
        Object.entries(args.where).every(([k, v]) => r[k] === v),
      );
      if (args.select) {
        out = out.map((r) =>
          Object.fromEntries(Object.keys(args.select!).map((k) => [k, r[k]])),
        ) as Row[];
      }
      return out;
    },
    findUnique: async (args: { where: Record<string, unknown> }) => {
      return (
        this.rows.find((r) =>
          Object.entries(args.where).every(([k, v]) => r[k] === v),
        ) ?? null
      );
    },
    updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const targets = this.rows.filter((r) =>
        Object.entries(args.where).every(([k, v]) => r[k] === v),
      );
      for (const r of targets) {
        Object.assign(r, args.data);
      }
      return { count: targets.length };
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = this.rows.find((r) => r.id === args.where.id)!;
      Object.assign(row, args.data);
      return row;
    },
  };

  async $transaction<T>(arg: unknown): Promise<T> {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<T>)(this);
    }
    return Promise.all(arg as Promise<unknown>[]) as Promise<T>;
  }
}

describe('ApiKeysService', () => {
  const owner = 'user-123';

  const makeService = () => {
    const prisma = new FakePrisma();
    return { service: new ApiKeysService(prisma as never), prisma };
  };

  it('crée une paire sk_/pk_ et ne stocke QUE des hashes sha256 + préfixes (jamais en clair)', async () => {
    const { service, prisma } = makeService();
    const result = await service.create(owner, 'Ma clé sandbox');

    expect(result.secretKey).toMatch(/^sk_test_[A-Za-z0-9_-]{32}$/);
    expect(result.publicKey).toMatch(/^pk_test_[A-Za-z0-9_-]{24}$/);
    expect(result.keyPrefix).toBe('sk_test_');

    // 2 lignes stockées (sk + pk), aucun secret en clair
    expect(prisma.rows).toHaveLength(2);
    const hashes = prisma.rows.map((r) => r.keyHash);
    for (const h of hashes) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
      expect(typeof h).toBe('string');
    }
    // Le secret n'apparaît nulle part dans le store
    const serialized = JSON.stringify(prisma.rows);
    expect(serialized).not.toContain(result.secretKey);
    expect(serialized).not.toContain(result.publicKey);
    // Le hash stocké correspond bien au sha256 de la clé secrète
    expect(prisma.rows.find((r) => r.keyPrefix === 'sk_test_')!.keyHash).toBe(
      sha256Hex(result.secretKey),
    );
  });

  it('ne retourne JAMAIS le secret deux fois : pas de méthode getSecret, list sans secret', async () => {
    const { service } = makeService();
    const created = await service.create(owner, 'clé');

    // Aucun chemin d'API ne re-sert le secret
    expect((service as unknown as Record<string, unknown>).getSecret).toBeUndefined();
    expect((service as unknown as Record<string, unknown>).findByHash).toBeUndefined();

    const list = await service.list(owner);
    expect(list).toHaveLength(1); // une entrée par paire (sk)
    const serialized = JSON.stringify(list);
    expect(serialized).not.toContain(created.secretKey);
    expect(serialized).not.toContain('keyHash');
    expect(list[0].keyPrefix).toBe('sk_test_');
  });

  it('deux créations → deux paires distinctes (clés aléatoires, ids distincts)', async () => {
    const { service } = makeService();
    const a = await service.create(owner, 'a');
    const b = await service.create(owner, 'b');
    expect(a.secretKey).not.toBe(b.secretKey);
    expect(a.id).not.toBe(b.id);
  });

  it('revoke → revokedAt posé sur les DEUX lignes de la paire (sk + pk)', async () => {
    const { service, prisma } = makeService();
    const created = await service.create(owner, 'clé');
    const revoked = await service.revoke(owner, created.id);

    expect(revoked.status).toBe('REVOKED');
    expect(revoked.revokedAt).toBeTruthy();
    const pairRows = prisma.rows.filter((r) => r.pairId === created.pairId);
    expect(pairRows).toHaveLength(2);
    for (const r of pairRows) {
      expect(r.status).toBe('REVOKED');
      expect(r.revokedAt).not.toBeNull();
    }
  });

  it('revoke d’une clé d’un autre utilisateur → 404', async () => {
    const { service } = makeService();
    const created = await service.create(owner, 'clé');
    await expect(service.revoke('other-user', created.id)).rejects.toThrow();
  });

  it('rotate → nouvelle sk (hash neuf), ancienne sk révoquée, même pairId', async () => {
    const { service, prisma } = makeService();
    const created = await service.create(owner, 'clé');
    const oldHash = prisma.rows.find((r) => r.id === created.id)!.keyHash;

    const rotated = await service.rotate(owner, created.id);

    expect(rotated.secretKey).toMatch(/^sk_test_/);
    expect(rotated.secretKey).not.toBe(created.secretKey);
    // ancienne ligne révoquée
    const oldRow = prisma.rows.find((r) => r.id === created.id)!;
    expect(oldRow.status).toBe('REVOKED');
    expect(oldRow.revokedAt).not.toBeNull();
    // nouvelle ligne active avec un hash différent
    const newRow = prisma.rows.find((r) => r.id === rotated.id)!;
    expect(newRow.status).toBe('ACTIVE');
    expect(newRow.keyHash).toBe(sha256Hex(rotated.secretKey));
    expect(newRow.keyHash).not.toBe(oldHash);
    expect(newRow.pairId).toBe(created.pairId);
    // la pk_ reste valide (même paire)
    expect(prisma.rows.filter((r) => r.pairId === created.pairId)).toHaveLength(3);
  });
});
