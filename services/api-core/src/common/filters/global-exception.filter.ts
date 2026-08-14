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
import type { ApiErrorEnvelope } from '@goursi/shared-types';

/** Codes d'erreur stables par statut HTTP (contrat d'erreurs, spec §API). */
const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

/**
 * Exception filter global (GOURSI-020c) : normalise TOUTES les erreurs dans
 * l'enveloppe { success: false, error: { code, message, details }, timestamp, requestId }.
 * - jamais de stack trace ni de détail interne côté client (500 → message générique) ;
 * - le détail est loggé côté serveur avec le requestId.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { id?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request.id ?? randomUUID();

    let message: string;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as { message?: string | string[]; error?: string };
        message = Array.isArray(obj.message) ? obj.message.join('; ') : (obj.message ?? obj.error ?? 'Erreur');
        if (Array.isArray((body as { message?: string[] }).message)) {
          details = { fields: (body as { message: string[] }).message };
        }
      } else {
        message = exception.message;
      }
    } else {
      // Erreur inattendue : jamais de détail interne côté client.
      this.logger.error(`Erreur non gérée [${requestId}]`, exception instanceof Error ? exception.stack : String(exception));
      message = 'Erreur interne du serveur';
    }

    const envelope: ApiErrorEnvelope = {
      success: false,
      error: {
        code: CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR',
        message,
        ...(details ? { details } : {}),
      },
      timestamp: new Date().toISOString(),
      requestId,
    };

    response.status(status).json(envelope);
  }
}
