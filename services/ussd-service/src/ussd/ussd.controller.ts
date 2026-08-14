import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UssdEngine } from './ussd.engine';

@ApiTags('ussd')
@Controller('ussd')
export class UssdController {
  constructor(private readonly engine: UssdEngine) {}

  /** Endpoint USSD standard (type USSD push/pull) — compatible agrégateurs opérateurs. */
  @Post()
  @ApiOperation({ summary: 'Session USSD (phone + saisie)' })
  handle(@Body() dto: { phone: string; input: string; sessionId?: string }) {
    return this.engine.handle(dto.phone, dto.input);
  }
}
