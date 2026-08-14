import { KycService } from './kyc.service';
import { DocumentCipher } from './document-cipher.service';
import type { ConfigService } from '@nestjs/config';

describe('KycService', () => {
  let service: KycService;
  let cipher: DocumentCipher;

  beforeEach(() => {
    cipher = new DocumentCipher({ get: () => 'test-key' } as unknown as ConfigService);
    service = new KycService(cipher);
  });

  it('soumet un dossier en PENDING avec documents chiffrés', () => {
    const record = service.submit('u1', {
      documents: [{ type: 'id_card', content: 'base64...' }],
    });
    expect(record.status).toBe('PENDING');
    expect(record.level).toBe('BASIC');
    expect(record.documents[0]).not.toContain('base64');
  });

  it('chiffre puis déchiffre correctement', () => {
    const payload = cipher.encrypt(JSON.stringify({ type: 'id_card', content: 'secret' }));
    const decrypted = JSON.parse(cipher.decrypt(payload).toString());
    expect(decrypted.content).toBe('secret');
  });

  it('approuve un dossier → VALIDATED', () => {
    service.submit('u2', { documents: [] });
    const record = service.approve('u2', 'reviewer1');
    expect(record.status).toBe('VALIDATED');
    expect(record.level).toBe('VERIFIED');
    expect(record.reviewedBy).toBe('reviewer1');
  });

  it('rejette un dossier → REJECTED', () => {
    service.submit('u3', { documents: [] });
    const record = service.reject('u3', 'reviewer1', 'document illisible');
    expect(record.status).toBe('REJECTED');
  });

  it('refuse un double submit', () => {
    service.submit('u4', { documents: [] });
    expect(() => service.submit('u4', { documents: [] })).toThrow();
  });

  it('liste la file pending (COMPLIANCE_OFFICER)', () => {
    service.submit('u5', { documents: [] });
    service.submit('u6', { documents: [] });
    service.approve('u5', 'r1');
    expect(service.pending()).toHaveLength(1);
  });
});
