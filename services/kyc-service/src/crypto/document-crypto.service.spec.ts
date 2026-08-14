import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentCryptoService } from './document-crypto.service';

describe('DocumentCryptoService (GOURSI-024a)', () => {
  const KEY = 'clé-dev-déterministe-32-octets-!!!!!!';

  async function build(key: string): Promise<DocumentCryptoService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentCryptoService,
        { provide: ConfigService, useValue: { get: (p: string) => (p === 'env.kycEncryptionKey' ? key : undefined) } },
      ],
    }).compile();
    return moduleRef.get(DocumentCryptoService);
  }

  it('chiffre et déchiffre un document (round-trip AES-256-GCM)', async () => {
    const svc = await build(KEY);
    const plaintext = Buffer.from('document-identité-binaire');
    const encrypted = svc.encrypt(plaintext);
    expect(encrypted).not.toContain(plaintext.toString('base64'));
    expect(Buffer.from(encrypted, 'base64').length).toBeGreaterThan(plaintext.length);
    expect(svc.decrypt(encrypted).toString()).toBe(plaintext.toString());
  });

  it('produit un IV différent à chaque chiffrement (indistinguable)', async () => {
    const svc = await build(KEY);
    const plaintext = Buffer.from('même-document');
    const a = svc.encrypt(plaintext);
    const b = svc.encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it('refuse une clé absente', async () => {
    await expect(build('')).rejects.toThrow(/KYC_ENCRYPTION_KEY/);
  });
});
