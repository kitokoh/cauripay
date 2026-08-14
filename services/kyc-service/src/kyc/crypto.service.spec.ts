import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService (GOURSI-024a)', () => {
  const makeService = (key: string): CryptoService =>
    new CryptoService({ get: () => key } as unknown as ConfigService);

  it('refuse de démarrer sans clé ≥ 32 octets', () => {
    expect(() => makeService('too-short')).toThrow(/KYC_ENCRYPTION_KEY/);
  });

  it('chiffre puis déchiffre un document (roundtrip base64)', () => {
    const svc = makeService('0123456789abcdef0123456789abcdef');
    const doc = Buffer.from('{"id":"doc-1","name":"Alice"}').toString('base64');
    const encrypted = svc.encrypt(doc);
    // chiffré ≠ clair et au format iv:tag:cipher
    expect(encrypted).not.toContain('Alice');
    expect(encrypted.split(':')).toHaveLength(3);
    expect(svc.decrypt(encrypted)).toBe(doc);
  });

  it('deux chiffrements du même document diffèrent (IV aléatoire)', () => {
    const svc = makeService('0123456789abcdef0123456789abcdef');
    const doc = Buffer.from('same-doc').toString('base64');
    expect(svc.encrypt(doc)).not.toBe(svc.encrypt(doc));
  });

  it('échoue si l’intégrité est altérée (tag GCM invalide)', () => {
    const svc = makeService('0123456789abcdef0123456789abcdef');
    const encrypted = svc.encrypt(Buffer.from('doc').toString('base64'));
    const tampered = encrypted.slice(0, -4) + 'AAAA';
    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it('une autre clé ne peut pas déchiffrer', () => {
    const enc = makeService('0123456789abcdef0123456789abcdef');
    const dec = makeService('fedcba9876543210fedcba9876543210');
    const encrypted = enc.encrypt(Buffer.from('secret-doc').toString('base64'));
    expect(() => dec.decrypt(encrypted)).toThrow();
  });
});
