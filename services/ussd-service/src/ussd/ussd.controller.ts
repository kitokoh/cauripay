import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UssdService } from './ussd.service';
import { UssdSessionDto } from './dto/ussd-session.dto';

/**
 * Endpoint opérateur USSD (GOURSI-027c) — PUBLIC (pas de JWT : la passerelle
 * USSD l'appelle côté serveur). Réponse : { text, endOfSession } enveloppée
 * par l'enveloppe uniforme { success, data, timestamp, requestId }.
 */
@ApiTags('ussd')
@Controller('ussd')
export class UssdController {
  constructor(private readonly ussd: UssdService) {}

  @Post('session')
  @ApiOperation({ summary: 'Point d\'entrée USSD *100# (appelé par la passerelle opérateur)' })
  @ApiResponse({ status: 201, description: '{ success, data: { text, endOfSession } }' })
  @ApiResponse({ status: 400, description: 'Payload invalide' })
  session(@Body() dto: UssdSessionDto) {
    return this.ussd.handle(dto.sessionId, dto.msisdn, dto.input);
  }
}
