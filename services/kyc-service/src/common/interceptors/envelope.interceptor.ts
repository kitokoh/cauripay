import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, map } from 'rxjs';
import type { Request } from 'express';

/** Enveloppe uniforme : { success, data, timestamp, requestId } + header X-Request-Id. */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: Request = context.switchToHttp().getRequest();
    const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    req.res?.setHeader('X-Request-Id', requestId);
    return next.handle().pipe(map((data) => ({ success: true, data, timestamp: new Date().toISOString(), requestId })));
  }
}
