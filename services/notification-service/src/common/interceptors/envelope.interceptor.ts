import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, map } from 'rxjs';
import { Request } from 'express';

/**
 * Enveloppe uniforme (pattern api-core GOURSI-020c) : { success, data, timestamp, requestId }.
 * requestId propagé en réponse (header X-Request-Id) pour le tracing.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: Request = context.switchToHttp().getRequest();
    const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    req.res?.setHeader('X-Request-Id', requestId);
    const timestamp = new Date().toISOString();
    return next.handle().pipe(
      map((data) => ({ success: true, data, timestamp, requestId })),
    );
  }
}
