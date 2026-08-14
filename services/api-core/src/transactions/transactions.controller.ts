import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@cauripay/shared-types';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post('transfer')
  @ApiOperation({ summary: 'Transfert P2P (orchestration complète via ledger)' })
  transfer(
    @CurrentUser('sub') userId: string,
    @Body() dto: { receiverPhone: string; amountMinor: number; idempotencyKey: string },
  ) {
    return this.transactions.transfer(userId, dto);
  }

  @Post('cash-in')
  @Roles(UserRole.AGENT, UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: 'Cash-in (agent)' })
  cashIn(
    @CurrentUser('sub') agentId: string,
    @Body() dto: { customerPhone: string; amountMinor: number; idempotencyKey: string },
  ) {
    return this.transactions.cashIn(agentId, dto);
  }

  @Post('cash-out')
  @Roles(UserRole.AGENT, UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: 'Cash-out (agent)' })
  cashOut(
    @CurrentUser('sub') agentId: string,
    @Body() dto: { customerPhone: string; amountMinor: number; idempotencyKey: string },
  ) {
    return this.transactions.cashOut(agentId, dto);
  }

  @Post(':id/reverse')
  @Roles(UserRole.SUPPORT_L2, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reversal (SUPPORT_L2+)' })
  reverse(@Param('id') id: string, @Body() dto: { reason: string; idempotencyKey: string }) {
    return this.transactions.reverse(id, dto);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Reçu partageable' })
  receipt(@Param('id') id: string) {
    return this.transactions.receipt(id);
  }
}
