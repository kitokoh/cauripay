import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { UssdSessionDto } from './dto/ussd-session.dto';

describe('UssdController (GOURSI-027c)', () => {
  it('POST session → délègue au service et renvoie { text, endOfSession }', async () => {
    const service = { handle: jest.fn().mockResolvedValue({ text: 'CauriPay *100#', endOfSession: false }) };
    const controller = new UssdController(service as unknown as UssdService);
    const result = await controller.session({ sessionId: 'sess-1', msisdn: '+23566000001', input: 'fr' });
    expect(service.handle).toHaveBeenCalledWith('sess-1', '+23566000001', 'fr');
    expect(result).toEqual({ text: 'CauriPay *100#', endOfSession: false });
  });
});

describe('UssdSessionDto — validation', () => {
  it('payload valide → 0 erreur', async () => {
    const dto = plainToInstance(UssdSessionDto, { sessionId: 'sess-1', msisdn: '+23566000001', input: 'fr' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('sessionId manquant → erreur', async () => {
    const dto = plainToInstance(UssdSessionDto, { msisdn: '+23566000001', input: 'fr' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'sessionId')).toBe(true);
  });

  it('msisdn invalide → erreur', async () => {
    const dto = plainToInstance(UssdSessionDto, { sessionId: 's', msisdn: 'pas-un-numero', input: 'fr' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'msisdn')).toBe(true);
  });
});
