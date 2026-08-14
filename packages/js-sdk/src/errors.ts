import type { ApiErrorBody } from './types';

/**
 * Exception typée du SDK : porte le code API stable (ex: RATE_LIMITED, INVALID_KEY,
 * INSUFFICIENT_FUNDS) et le statut HTTP.
 */
export class GoursiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'GoursiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Construit depuis une enveloppe d'erreur API. */
  static fromEnvelope(error: ApiErrorBody, status: number): GoursiError {
    return new GoursiError(error.code, error.message, status, error.details);
  }
}

/** Erreur réseau / timeout (pas de réponse HTTP exploitable). */
export class GoursiNetworkError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'GoursiNetworkError';
  }
}

/** Erreur de configuration du SDK. */
export class GoursiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoursiConfigError';
  }
}
