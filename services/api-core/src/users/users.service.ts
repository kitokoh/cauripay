import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        kycLevel: true,
        createdAt: true,
      },
    });
    if (!user)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Utilisateur inconnu' });
    return user;
  }

  async kycStatus(userId: string) {
    const record = await this.prisma.kycRecord.findUnique({ where: { userId } });
    if (!record)
      throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Aucun dossier KYC' });
    return {
      status: record.status,
      level: record.level,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt,
    };
  }
}
