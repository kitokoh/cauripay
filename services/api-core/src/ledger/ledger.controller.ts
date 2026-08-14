import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LedgerClientService } from './ledger-client.service';

/** Endpoints de lecture wallet — via ledger (JAMAIS Prisma pour les soldes). */
@ApiTags('wallets')
@Controller()
export class LedgerController {
  constructor(private readonly ledger: LedgerClientService) {}

  @Get('wallets/me/balance')
  @ApiOperation({ summary: 'Solde du wallet (via ledger-service)' })
  balance(@Query('walletId') walletId: string) {
    return this.ledger.balance(walletId);
  }

  @Get('wallets/me/history')
  @ApiOperation({ summary: 'Historique paginé (via ledger-service)' })
  history(@Query('walletId') walletId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.ledger.history(walletId, cursor, limit ? Number(limit) : 50);
  }

  @Get('wallets/:walletId/balance')
  @ApiOperation({ summary: 'Solde d’un wallet par id (via ledger)' })
  balanceById(@Param('walletId') walletId: string) {
    return this.ledger.balance(walletId);
  }
}
