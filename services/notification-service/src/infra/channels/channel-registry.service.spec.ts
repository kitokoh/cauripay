import { NotificationChannel } from '../../prisma/client';
import { ChannelRegistry } from './channel-registry.service';
import { NotificationChannelAdapter } from './channel.interface';

describe('ChannelRegistry (GOURSI-026a)', () => {
  const sms: NotificationChannelAdapter = {
    name: NotificationChannel.SMS,
    send: jest.fn().mockResolvedValue(undefined),
  };
  const email: NotificationChannelAdapter = {
    name: NotificationChannel.EMAIL,
    send: jest.fn().mockResolvedValue(undefined),
  };

  const registry = new ChannelRegistry([sms, email] as never);

  it('résout l’adaptateur SMS par nom de canal', () => {
    expect(registry.get(NotificationChannel.SMS)).toBe(sms);
  });

  it('résout l’adaptateur EMAIL par nom de canal', () => {
    expect(registry.get(NotificationChannel.EMAIL)).toBe(email);
  });

  it('canal inconnu → undefined (le dispatcher marque alors FAILED)', () => {
    expect(registry.get('PIGEON' as NotificationChannel)).toBeUndefined();
  });

  it('expose la liste des canaux enregistrés', () => {
    expect(registry.channels).toEqual([NotificationChannel.SMS, NotificationChannel.EMAIL]);
  });
});
