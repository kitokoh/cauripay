import 'reflect-metadata';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter (GOURSI-020c)', () => {
  const makeHost = (): {
    http: { getResponse: jest.Mock; getRequest: jest.Mock };
    response: { status: jest.Mock; json: jest.Mock };
  } => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const http = {
      getResponse: jest.fn().mockReturnValue({ status, json }),
      getRequest: jest.fn().mockReturnValue({ id: 'req-1' }),
    };
    return { http, response: { status, json } };
  };

  const call = (filter: GlobalExceptionFilter, exception: unknown, host: ReturnType<typeof makeHost>): void =>
    filter.catch(exception, { switchToHttp: () => host.http } as unknown as ArgumentsHost);

  it('normalise une HttpException en enveloppe d’erreur', () => {
    const filter = new GlobalExceptionFilter();
    const host = makeHost();
    call(filter, new HttpException('Interdit', HttpStatus.FORBIDDEN), host);
    expect(host.http.getResponse().status).toHaveBeenCalledWith(403);
    const envelope = host.response.json.mock.calls[0][0] as Record<string, unknown>;
    expect(envelope).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Interdit' },
      requestId: 'req-1',
    });
  });

  it('normalise une erreur de validation (message[] → details.fields)', () => {
    const filter = new GlobalExceptionFilter();
    const host = makeHost();
    const bad = new HttpException(
      { message: ['montant invalide', 'devise invalide'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    call(filter, bad, host);
    const envelope = host.response.json.mock.calls[0][0] as {
      error: { code: string; details: { fields: string[] } };
    };
    expect(envelope.error.code).toBe('BAD_REQUEST');
    expect(envelope.error.details.fields).toHaveLength(2);
  });

  it('ne fuit JAMAIS le détail d’une erreur interne (500 générique)', () => {
    const filter = new GlobalExceptionFilter();
    const host = makeHost();
    call(filter, new Error('secret interne: connexion DB refusée'), host);
    expect(host.http.getResponse().status).toHaveBeenCalledWith(500);
    const envelope = host.response.json.mock.calls[0][0] as { error: { message: string } };
    expect(envelope.error.message).toBe('Erreur interne du serveur');
  });
});
