import { BulkService } from './bulk.service';
import { ForbiddenException, ConflictException } from '@nestjs/common';

const CSV_OK = `destinataire,telephone,montant,reference
Jean,+23566000001,5000,ref-001
Awa,+23566000002,10000,ref-002`;

const CSV_BAD = `destinataire,telephone,montant,reference
Jean,123,5000,ref-001
Awa,+23566000002,abc,`;

describe('BulkService', () => {
  let service: BulkService;

  beforeEach(() => {
    service = new BulkService();
  });

  it('valide un CSV correct en < 5 s (2 lignes OK)', () => {
    const start = Date.now();
    const b = service.upload('m1', 'maker1', CSV_OK);
    expect(Date.now() - start).toBeLessThan(5000);
    expect(b.status).toBe('DRAFT');
    expect(b.lines.every((l) => l.valid)).toBe(true);
  });

  it('rapporte des erreurs précises par ligne', () => {
    const b = service.upload('m1', 'maker1', CSV_BAD);
    expect(b.lines[0]?.valid).toBe(false);
    expect(b.lines[0]?.errors.join()).toContain('téléphone invalide');
    expect(b.lines[1]?.errors.join()).toContain('montant invalide');
  });

  it('refuse > 10 000 lignes', () => {
    const header = 'destinataire,telephone,montant,reference\n';
    const rows = Array.from({ length: 10001 }, (_, i) => `P${i},+23566000001,100,ref-${i}`).join('\n');
    expect(() => service.upload('m1', 'maker1', header + rows)).toThrow(ConflictException);
  });

  it('maker ≠ checker : 403 si le maker approuve sa batch', () => {
    const b = service.upload('m1', 'maker1', CSV_OK);
    service.submit(b.id, 'maker1');
    expect(() => service.approve(b.id, 'maker1')).toThrow(ForbiddenException);
  });

  it('workflow complet DRAFT → APPROVED → COMPLETED', () => {
    const b = service.upload('m1', 'maker1', CSV_OK);
    service.submit(b.id, 'maker1');
    const approved = service.approve(b.id, 'checker9');
    expect(approved.status).toBe('APPROVED');
    const done = service.execute(b.id);
    expect(done.status).toBe('COMPLETED');
    expect(done.lines.filter((l) => l.valid)).toHaveLength(2);
  });

  it('export CSV contient le rapport exact', () => {
    const b = service.upload('m1', 'maker1', CSV_OK);
    const csv = service.exportCsv(b.id);
    expect(csv).toContain('statut,erreurs');
    expect(csv).toContain('OK'); // ligne valide
    expect(csv).not.toContain('ERREUR');
  });
});
