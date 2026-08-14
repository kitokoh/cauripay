import { ArgumentsHost, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter — erreur plate (GOURSI-020c)', () => {
  function makeHost(requestOverride?: Request) {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const request =
      requestOverride ?? ({ method: 'POST', url: '/api/v1/ussd/session', headers: {} } as unknown as Request);
    const getResponse = (): Response => response;
    const getRequest = (): Request => request;
    const host = {
      switchToHttp: () => ({ getResponse, getRequest }),
    } as unknown as ArgumentsHost;
    return { response, host };
  }

  it('HttpException 400 → { code, message, timestamp, requestId } plat', () => {
    const { response, host } = makeHost();
    const filter = new AllExceptionsFilter();
    filter.catch(new BadRequestException({ code: 'BAD_REQUEST', message: 'payload invalide' }), host);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BAD_REQUEST', message: 'payload invalide', requestId: expect.any(String) }),
    );
  });

  it('erreur inconnue → 500 INTERNAL_ERROR', () => {
    const { response, host } = makeHost();
    const filter = new AllExceptionsFilter();
    filter.catch(new Error('boom'), host);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
  });

  it('réutilise le X-Request-Id entrant s’il existe', () => {
    const reqWithId = { method: 'GET', url: '/api/v1/health', headers: { 'x-request-id': 'req-42' } } as unknown as Request;
    const { response, host } = makeHost(reqWithId);
    const filter = new AllExceptionsFilter();
    filter.catch(new InternalServerErrorException('x'), host);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req-42' }));
  });
});
