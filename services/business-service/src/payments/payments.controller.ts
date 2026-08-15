import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentRouterService } from './payment-router.service';
import { RailPayment } from '@goursi/payment-rail-contracts';

@ApiTags('business/payments')
@Controller('business/payments')
export class PaymentsController {
  constructor(private readonly router: PaymentRouterService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initie un paiement marchand (routé par rail)' })
  initiate(@Body() dto: { rail?: string; payment: RailPayment }) {
    return this.router.initiate(dto.payment, dto.rail);
  }
}
