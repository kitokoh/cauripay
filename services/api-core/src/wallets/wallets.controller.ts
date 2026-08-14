import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LedgerClientService } from '../ledger-client/ledger-client.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

/**
 * Solde & historique — la vérité vient du LEDGER (GOURSI-023f) : JAMAIS Prisma.
 */
@ApiTags('wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly ledger: LedgerClientService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me/balance')
  @ApiOperation({ summary: 'Solde disponible + gelé (source : ledger-service)' })
  async myBalance(@CurrentUser() user: { sub: string }) {
    const wallet = await this.requireActiveWallet(user.sub);
    return this.ledger.getBalance(wallet.id);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Historique paginé (source : ledger-service)' })
  async myHistory(
    @CurrentUser() user: { sub: string },
    @Query('page') page = '0',
    @Query('size') size = '50',
  ) {
    const wallet = await this.requireActiveWallet(user.sub);
    return this.ledger.getHistory(wallet.id, Number(page), Number(size));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Solde d’un wallet (interne)' })
  async balance(@Param('id') id: string) {
    return this.ledger.getBalance(id);
  }

  private async requireActiveWallet(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { wallets: true } });
    const wallet = user?.wallets.find((w) => w.status === 'ACTIVE');
    if (!wallet) throw new NotFoundException({ code: 'WALLET_INACTIVE', message: 'Aucun wallet actif' });
    return wallet;
  }
}
