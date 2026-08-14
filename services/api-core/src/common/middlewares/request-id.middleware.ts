import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Attribue un identifiant de requête unique (uuid) :
 * - présent dans l'enveloppe de réponse (timestamp/requestId) ;
 * - reflété dans le header X-Request-Id (traçabilité logs ↔ client) ;
 * - conservé sur request.id pour les logs de requêtes lentes.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    req.id = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
