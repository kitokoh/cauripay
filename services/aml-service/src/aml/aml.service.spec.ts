import { AmlService } from './aml.service';

describe('AmlService', () => {
  let service: AmlService;

  beforeEach(() => {
    service = new AmlService();
  });

  it('score bas pour un utilisateur normal', () => {
    const { score, alert } = service.scoreUser({
      userId: 'u1',
      fullName: 'Jean Dupont',
      country: 'TD',
      transactionVolumeMinor: 10000,
    });
    expect(score).toBeLessThan(70);
    expect(alert).toBeUndefined();
  });

  it('déclenche une alerte sur nom sanctionné (GABAC)', () => {
    const { score, alert } = service.scoreUser({
      userId: 'u2',
      fullName: 'GABAC-TEST-PERSON',
      country: 'TD',
      transactionVolumeMinor: 0,
    });
    expect(score).toBeGreaterThanOrEqual(90);
    expect(alert).toBeDefined();
    expect(alert!.status).toBe('OPEN');
  });

  it('gèle via le workflow confirm', () => {
    const { alert } = service.scoreUser({
      userId: 'u3',
      fullName: 'GABAC-TEST-PERSON',
      country: 'TD',
      transactionVolumeMinor: 0,
    });
    const confirmed = service.updateAlert(alert!.id, 'confirm', 'officer1');
    expect(confirmed.status).toBe('CONFIRMED');
  });

  it('marque un faux positif', () => {
    const { alert } = service.scoreUser({
      userId: 'u4',
      fullName: 'GABAC-TEST-PERSON',
      country: 'TD',
      transactionVolumeMinor: 0,
    });
    const fp = service.updateAlert(alert!.id, 'false_positive', 'officer1');
    expect(fp.status).toBe('FALSE_POSITIVE');
  });

  it('filtre les alertes par statut', () => {
    service.scoreUser({
      userId: 'u5',
      fullName: 'GABAC-TEST-PERSON',
      country: 'TD',
      transactionVolumeMinor: 0,
    });
    service.scoreUser({
      userId: 'u6',
      fullName: 'GABAC-TEST-PERSON',
      country: 'TD',
      transactionVolumeMinor: 0,
    });
    expect(service.listAlerts('OPEN')).toHaveLength(2);
    expect(service.listAlerts('CONFIRMED')).toHaveLength(0);
  });
});
