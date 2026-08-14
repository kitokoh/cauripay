import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { headers: {}, method: 'GET', url: '/api/v1/dev/api-keys' };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  return { json, status, response, request, host };
}

describe('AllExceptionsFilter — enveloppe d’erreur IMBRIQUÉE (GOURSI-020c)', () => {
  const filter = new AllExceptionsFilter();

  it('429 → { success:false, error:{ code:"RATE_LIMITED", message }, timestamp, requestId }', () => {
    const host = makeHost();
    filter.catch(
      new HttpException({ code: 'RATE_LIMITED', message: 'Quota dépassé : 1000 req/min' }, HttpStatus.TOO_MANY_REQUESTS),
      host.host,
    );
    expect(host.status).toHaveBeenCalledWith(429);
    const body = host.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error).toEqual({ code: 'RATE_LIMITED', message: 'Quota dépassé : 1000 req/min', details: undefined });
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.requestId).toBe('string');
  });

  it('erreur interne inconnue → 500 { error:{ code:"INTERNAL_ERROR" } } — jamais avalée', () => {
    const host = makeHost();
    filter.catch(new Error('boom'), host.host);
    expect(host.status).toHaveBeenCalledWith(500);
    const body = host.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('boom');
    expect(body.requestId).toBeTruthy();
  });

  it('404 NotFound → code NOT_FOUND', () => {
    const host = makeHost();
    filter.catch(new HttpException({ code: 'API_KEY_NOT_FOUND', message: 'introuvable' }, HttpStatus.NOT_FOUND), host.host);
    expect(host.status).toHaveBeenCalledWith(404);
    expect(host.json.mock.calls[0][0].error.code).toBe('API_KEY_NOT_FOUND');
  });
});
