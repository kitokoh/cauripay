import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Filtre global d'exceptions : format d'erreur stable
 * { success: false, error: { code, message, details }, timestamp, requestId }.
 * Log des requêtes lentes via le Logger.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = randomUUID();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const code =
      exception instanceof HttpException
        ? ((exception.getResponse() as { code?: string }).code ?? exception.name)
        : 'INTERNAL_ERROR';

    const message =
      exception instanceof HttpException
        ? ((exception.getResponse() as { message?: string }).message ?? exception.message)
        : exception instanceof Error
          ? exception.message
          : 'Erreur interne';

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status} (${code})`);
    }

    response.status(status).json({
      success: false,
      error: { code, message, details: null },
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
