import { PrismaClient, KycLevel, WalletType, WalletStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // Utilisateur de démo
  const existing = await prisma.user.findUnique({ where: { phone: '+23566000001' } });
  if (!existing) {
    const userId = randomUUID();
    const walletId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          phone: '+23566000001',
          fullName: 'Dev Demo',
          email: 'demo@cauripay.test',
          passwordHash,
          kycLevel: KycLevel.VERIFIED,
          wallets: { create: { id: walletId, type: WalletType.CUSTOMER, status: WalletStatus.ACTIVE } },
          kycRecord: { create: { status: 'VALIDATED', level: KycLevel.VERIFIED, documents: [] } },
        },
      });
    });
    console.log('✓ Seed : utilisateur de démo créé (+23566000001 / password123)');
  } else {
    console.log('✓ Seed : utilisateur de démo déjà présent');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
