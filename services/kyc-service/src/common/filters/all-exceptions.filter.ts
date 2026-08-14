import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

/** Enveloppe d'erreur uniforme (GOURSI-020c) : { success:false, error:{code,message}, requestId }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Erreur interne du service.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as { code?: string; message?: string; error?: string };
        code = b.code ?? (typeof b.error === 'string' ? b.error : HttpStatus[status]);
        message = b.message ?? message;
      } else if (typeof body === 'string') {
        message = body;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) this.logger.error(`${message} (requestId=${requestId})`, exception instanceof Error ? exception.stack : undefined);

    response.status(status).json({ success: false, error: { code, message }, requestId });
  }
}
