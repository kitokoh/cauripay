import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => jest.useRealTimers());

  it('envoie et persiste une notification', () => {
    const n = service.send({
      userId: 'u1',
      channel: 'SMS',
      to: '+23566000001',
      title: 'Test',
      body: 'Votre code OTP: 123456',
    });
    expect(n.status).toBe('SENT');
    expect(service.get(n.id)).toBeDefined();
  });

  it('liste par utilisateur', () => {
    service.send({ userId: 'u1', channel: 'EMAIL', to: 'a@b.c', title: 't', body: 'b' });
    service.send({ userId: 'u2', channel: 'EMAIL', to: 'd@e.f', title: 't', body: 'b' });
    expect(service.list('u1')).toHaveLength(1);
    expect(service.list()).toHaveLength(2);
  });
});
