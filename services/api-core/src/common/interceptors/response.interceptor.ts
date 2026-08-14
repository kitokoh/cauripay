import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '@cauripay/shared-types';

/**
 * Enveloppe toutes les réponses : { success, data, timestamp, requestId }.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const requestId = randomUUID();
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        timestamp: new Date().toISOString(),
        requestId,
      })),
    );
  }
}
