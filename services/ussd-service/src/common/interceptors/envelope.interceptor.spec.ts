import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { EnvelopeInterceptor } from './envelope.interceptor';

describe('EnvelopeInterceptor — { success, data, timestamp, requestId }', () => {
  it('enveloppe la donnée et propage le X-Request-Id', async () => {
    const interceptor = new EnvelopeInterceptor();
    const setHeader = jest.fn();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-request-id': 'req-1' }, res: { setHeader } }),
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ text: 'CauriPay', endOfSession: false }) } as unknown as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result).toMatchObject({ success: true, data: { text: 'CauriPay', endOfSession: false }, requestId: 'req-1' });
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-1');
  });

  it('génère un requestId si absent', async () => {
    const interceptor = new EnvelopeInterceptor();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {}, res: { setHeader: jest.fn() } }) }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ text: 'ok', endOfSession: true }) } as unknown as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result).toMatchObject({ success: true });
    expect(typeof (result as { requestId: string }).requestId).toBe('string');
  });
});
