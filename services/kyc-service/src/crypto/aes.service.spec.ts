import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AesService } from './aes.service';

describe('AesService (GOURSI-024a — documents chiffrés au repos)', () => {
  const key = 'a'.repeat(64);

  const build = async () => {
    const module = await Test.createTestingModule({
      providers: [
        AesService,
        { provide: ConfigService, useValue: { get: (p: string) => (p === 'env.encryptionKey' ? key : undefined) } },
      ],
    }).compile();
    return module.get(AesService);
  };

  it('chiffre/déchiffre en round-trip', async () => {
    const aes = await build();
    const enc = aes.encrypt('Passeport-123456');
    expect(enc).not.toContain('Passeport');
    expect(enc.split(':')).toHaveLength(3); // iv:tag:cipher
    expect(aes.decrypt(enc).toString()).toBe('Passeport-123456');
  });

  it('détecte toute altération (GCM)', async () => {
    const aes = await build();
    const enc = aes.encrypt('CNI-98765');
    const tampered = enc.slice(0, -2) + (enc.endsWith('AA') ? 'AB' : 'AA');
    expect(() => aes.decrypt(tampered)).toThrow();
  });

  it('deux chiffrements du même texte diffèrent (IV aléatoire)', async () => {
    const aes = await build();
    expect(aes.encrypt('same')).not.toBe(aes.encrypt('same'));
  });

  it('refuse de démarrer sans clé 32 octets (fail-fast)', () => {
    const fakeConfig = { get: () => 'trop-court' } as unknown as ConfigService;
    expect(() => new AesService(fakeConfig)).toThrow(/trop courte/);
  });
});
