import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LedgerClientService } from '../ledger/ledger-client.service';

/** Soldes & historique — JAMAIS via Prisma, toujours via ledger-service. */
@ApiTags('wallets')
@Controller('wallets/me')
export class WalletsController {
  constructor(private readonly ledger: LedgerClientService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Solde de mon wallet (ledger)' })
  balance(@Query('walletId') walletId: string) {
    return this.ledger.balance(walletId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique paginé (ledger)' })
  history(@Query('walletId') walletId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.ledger.history(walletId, cursor, limit ? Number(limit) : 50);
  }
}
