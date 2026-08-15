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

const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

/**
 * Exception filter global (GOURSI-020c) : { success, error { code, message, details } }.
 * Les erreurs inattendues ne fuitent JAMAIS de détail interne (500 générique, log serveur).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { id?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request.id ?? (request.headers['x-request-id'] as string) ?? randomUUID();

    let message: string;
    let details: Record<string, unknown> | undefined;
    let code: string;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = CODE_BY_STATUS[status] ?? 'ERROR';
      } else if (body && typeof body === 'object') {
        const obj = body as { message?: string | string[]; code?: string; error?: string };
        message = Array.isArray(obj.message) ? obj.message.join('; ') : (obj.message ?? obj.error ?? 'Erreur');
        code = obj.code ?? CODE_BY_STATUS[status] ?? 'ERROR';
        if (Array.isArray((body as { message?: string[] }).message)) {
          details = { fields: (body as { message: string[] }).message };
        }
      } else {
        message = exception.message;
        code = CODE_BY_STATUS[status] ?? 'ERROR';
      }
    } else {
      this.logger.error(
        `Erreur non gérée [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      message = 'Erreur interne du serveur';
      code = 'INTERNAL_ERROR';
    }

    response.status(status).json({
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
