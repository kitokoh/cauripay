import { ApiKeysService } from './api-keys.service';

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  beforeEach(() => {
    service = new ApiKeysService();
  });

  it('crée une clé sandbox (sk_) et renvoie le secret une seule fois', () => {
    const { key, secret } = service.create('dev1');
    expect(secret.startsWith('sk_')).toBe(true);
    expect(key.mode).toBe('sandbox');
    // la clé stockée est hachée — jamais en clair
    expect(key).not.toHaveProperty('keyHash');
  });

  it('authentifie une clé valide', () => {
    const { secret } = service.create('dev1');
    const authed = service.authenticate(secret);
    expect(authed).not.toBeNull();
    expect(authed?.developerId).toBe('dev1');
  });

  it('une clé révoquée → 401 (null)', () => {
    const { key, secret } = service.create('dev1');
    service.revoke(key.id);
    expect(service.authenticate(secret)).toBeNull();
  });

  it('rotation : nouvelle clé exploitable, ancienne révoquée', () => {
    const { key: oldKey, secret: oldSecret } = service.create('dev1');
    const rotated = service.rotate('dev1', oldKey.id);
    expect(rotated.secret).not.toBe(oldSecret);
    expect(service.authenticate(oldSecret)).toBeNull();
    expect(service.authenticate(rotated.secret)).not.toBeNull();
  });
});
