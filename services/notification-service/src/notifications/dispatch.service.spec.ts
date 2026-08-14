import { Notification } from '../prisma/client';
import { DispatchService } from './dispatch.service';
import { BackoffService } from './backoff.service';

describe('DispatchService — cycle de vie (GOURSI-026a/d)', () => {
  const buildNotification = (overrides: Partial<Notification> = {}): Notification =>
    ({
      id: 'notif-1',
      userId: 'user-1',
      type: 'TRANSACTION',
      channel: 'SMS',
      title: 'Virement reçu',
      body: 'Vous avez reçu 10 000 FCFA',
      data: null,
      status: 'PENDING',
      attempts: 0,
      nextRetryAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as unknown as Notification;

  let prisma: { notification: { update: jest.Mock } };
  let registry: { get: jest.Mock };
  let publisher: { publishFailedNotification: jest.Mock };
  let service: DispatchService;

  beforeEach(() => {
    prisma = { notification: { update: jest.fn().mockResolvedValue({}) } };
    registry = { get: jest.fn() };
    publisher = { publishFailedNotification: jest.fn().mockResolvedValue(undefined) };
    service = new DispatchService(
      prisma as never,
      registry as never,
      new BackoffService(),
      publisher as never,
    );
  });

  const mockAdapter = (send: jest.Mock) => ({ name: 'SMS', send }) as never;

  it('succès canal → statut SENT + deliveredAt', async () => {
    registry.get.mockReturnValue(mockAdapter(jest.fn().mockResolvedValue(undefined)));

    await service.dispatchNotification(buildNotification());

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: expect.objectContaining({
        status: 'SENT',
        deliveredAt: expect.any(Date),
        lastError: null,
      }),
    });
  });

  it('échec canal → attempts+1 + nextRetryAt planifié (PENDING, pas de DLQ)', async () => {
    registry.get.mockReturnValue(
      mockAdapter(jest.fn().mockRejectedValue(new Error('provider down'))),
    );

    await service.dispatchNotification(buildNotification());

    const call = prisma.notification.update.mock.calls[0][0] as {
      data: { attempts: number; status: string; nextRetryAt: Date; lastError: string };
    };
    expect(call.data.attempts).toBe(1);
    expect(call.data.status).toBe('PENDING');
    expect(call.data.nextRetryAt).toBeInstanceOf(Date);
    expect(call.data.nextRetryAt.getTime()).toBeGreaterThan(Date.now());
    expect(call.data.lastError).toBe('provider down');
    expect(publisher.publishFailedNotification).not.toHaveBeenCalled();
  });

  it('le délai de rejeu suit le backoff (1er échec → +30 s)', async () => {
    registry.get.mockReturnValue(
      mockAdapter(jest.fn().mockRejectedValue(new Error('boom'))),
    );
    const before = Date.now();

    await service.dispatchNotification(buildNotification());

    const call = prisma.notification.update.mock.calls[0][0] as {
      data: { nextRetryAt: Date };
    };
    const delta = call.data.nextRetryAt.getTime() - before;
    expect(delta).toBeGreaterThanOrEqual(30_000 - 100);
    expect(delta).toBeLessThanOrEqual(30_000 + 100);
  });

  it('4e échec (attempts=3) → statut FAILED + republish dead.letters avec le payload d’origine', async () => {
    registry.get.mockReturnValue(
      mockAdapter(jest.fn().mockRejectedValue(new Error('définitif'))),
    );

    await service.dispatchNotification(buildNotification({ attempts: 3 }));

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: expect.objectContaining({ status: 'FAILED', attempts: 4, lastError: 'définitif' }),
    });
    expect(publisher.publishFailedNotification).toHaveBeenCalledTimes(1);
    expect(publisher.publishFailedNotification).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'TRANSACTION',
      channel: 'SMS',
      title: 'Virement reçu',
      body: 'Vous avez reçu 10 000 FCFA',
      data: undefined,
      lastError: 'définitif',
    });
  });

  it('canal inconnu → FAILED immédiat (ni send, ni retry, ni DLQ)', async () => {
    registry.get.mockReturnValue(undefined);

    await service.dispatchNotification(buildNotification({ channel: 'PIGEON' as never }));

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: expect.objectContaining({
        status: 'FAILED',
        lastError: expect.stringContaining('Canal inconnu'),
      }),
    });
    expect(publisher.publishFailedNotification).not.toHaveBeenCalled();
  });
});
