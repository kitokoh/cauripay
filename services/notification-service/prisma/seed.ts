/**
 * Seed GOURSI-026 : configuration par défaut des canaux (ChannelConfig).
 * Exécution : `npm run prisma:seed` (ts-node prisma/seed.ts).
 * Idempotent — upsert par canal.
 */
import { PrismaClient, NotificationChannel, Prisma } from '../../../node_modules/.prisma/notification-client';

const prisma = new PrismaClient();

const DEFAULTS: Array<{ channel: NotificationChannel; config: Prisma.InputJsonValue }> = [
  { channel: NotificationChannel.SMS, config: { provider: 'generic-http', priority: 1, enabled: true } },
  { channel: NotificationChannel.EMAIL, config: { from: 'no-reply@goursi.africa', priority: 2, enabled: true } },
  { channel: NotificationChannel.PUSH, config: { provider: 'fcm', priority: 3, enabled: true } },
  { channel: NotificationChannel.WHATSAPP, config: { provider: 'whatsapp-business', priority: 4, enabled: true } },
];

async function main(): Promise<void> {
  for (const row of DEFAULTS) {
    await prisma.channelConfig.upsert({
      where: { channel: row.channel },
      update: { enabled: true, config: row.config },
      create: { channel: row.channel, enabled: true, config: row.config },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`ChannelConfig seed : ${DEFAULTS.length} canaux prêts`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
