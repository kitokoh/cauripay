import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Enveloppe d'erreur uniforme (GOURSI-020c) :
 * { success:false, error: { code, message, details }, timestamp, requestId }.
 * Log de toute erreur 5xx (stacktrace complète) — jamais avalée.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) ?? randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Erreur interne';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = httpCodeToCode(status);
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        message = (b.message as string) ?? exception.message;
        code = (b.code as string) ?? httpCodeToCode(status);
        details = b.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(`[${requestId}] ${request.method} ${request.url} → ${status}`, (exception as Error)?.stack);
    } else {
      this.logger.warn(`[${requestId}] ${request.method} ${request.url} → ${status} (${code})`);
    }

    response.status(status).json({
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}

function httpCodeToCode(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMITED';
    default: return 'HTTP_' + status;
  }
}
