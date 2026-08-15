import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CashInDto, CashOutDto, ConfirmCashInDto, ReverseDto, TransferDto } from './dto/transactions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@goursi/shared-types';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post('transfer')
  @ApiOperation({ summary: 'P2P : idempotence → KYC → frais → ledger (4 écritures)' })
  transfer(@CurrentUser() user: { sub: string }, @Body() dto: TransferDto) {
    return this.transactions.transfer(user.sub, dto);
  }

  @Post('cash-in')
  @Roles(UserRole.AGENT, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cash-in (agent) : OTP client → confirmation' })
  cashIn(@CurrentUser() user: { sub: string }, @Body() dto: CashInDto) {
    return this.transactions.cashIn(user.sub, dto);
  }

  @Post('cash-in/confirm')
  @Roles(UserRole.AGENT, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Confirmation cash-in avec OTP' })
  confirmCashIn(@CurrentUser() user: { sub: string }, @Body() dto: ConfirmCashInDto) {
    return this.transactions.confirmCashIn(user.sub, dto);
  }

  @Post('cash-out')
  @Roles(UserRole.AGENT, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cash-out (agent) : OTP client requis' })
  cashOut(@CurrentUser() user: { sub: string }, @Body() dto: CashOutDto) {
    return this.transactions.cashOut(user.sub, dto);
  }

  @Post(':id/reverse')
  @Roles(UserRole.SUPPORT_L2, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reversal (SUPPORT_L2+) : écritures miroir ledger' })
  reverse(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Body() dto: ReverseDto) {
    return this.transactions.reverse(user.sub, id, dto.reason);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Reçu partageable (SVG)' })
  receipt(@Param('id') id: string) {
    return this.transactions.receipt(id);
  }
}
