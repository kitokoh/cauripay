import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor (GOURSI-020c)', () => {
  const makeContext = (requestId?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: '/api/v1/health', id: requestId }),
        getResponse: () => ({ getHeader: () => requestId }),
      }),
    }) as unknown as ExecutionContext;

  it('enveloppe la réponse dans { success, data, timestamp, requestId }', (done) => {
    const interceptor = new ResponseInterceptor();
    const handler = { handle: () => of({ ok: true }) };
    interceptor.intercept(makeContext('req-123'), handler as never).subscribe((envelope) => {
      expect(envelope).toMatchObject({
        success: true,
        data: { ok: true },
        requestId: 'req-123',
      });
      expect(typeof envelope.timestamp).toBe('string');
      done();
    });
  });
});
