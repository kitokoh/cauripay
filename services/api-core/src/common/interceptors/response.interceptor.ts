import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiEnvelope } from '@goursi/shared-types';
import { REQUEST_ID_HEADER } from '../middlewares/request-id.middleware';

const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS ?? 1000);

/**
 * Interceptor global (GOURSI-020c) :
 * 1. enveloppe la réponse dans { success: true, data, timestamp, requestId } ;
 * 2. logge les requêtes lentes (durée > SLOW_REQUEST_MS, défaut 1000 ms).
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  private readonly logger = new Logger('SlowRequest');

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      map((data) => {
        const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
        if (elapsedMs > SLOW_REQUEST_MS) {
          this.logger.warn(
            `Requête lente ${elapsedMs.toFixed(0)} ms — ${request.method} ${request.originalUrl}`,
          );
        }
        return {
          success: true as const,
          data,
          timestamp: new Date().toISOString(),
          requestId: (request.id ?? response.getHeader(REQUEST_ID_HEADER) ?? '') as string,
        };
      }),
    );
  }
}
