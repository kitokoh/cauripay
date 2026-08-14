import { GoursiClientOptions, ApiEnvelope, ApiErrorEnvelope } from './types';
import { GoursiConfigError, GoursiError, GoursiNetworkError } from './errors';

/**
 * Client HTTP minimal (Node 18+ natif fetch + navigateur).
 * Gère : auth Bearer, enveloppe API, erreurs typées, timeout.
 */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly extraHeaders: Record<string, string>;

  constructor(options: GoursiClientOptions) {
    if (!options.apiKey) {
      throw new GoursiConfigError('apiKey est requis (sk_test_… ou sk_live_…)');
    }
    if (!options.apiKey.startsWith('sk_') && !options.apiKey.startsWith('pk_')) {
      throw new GoursiConfigError("apiKey invalide : doit commencer par 'sk_' ou 'pk_'");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.cauripay.com').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.extraHeaders = options.headers ?? {};
  }

  async request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...this.extraHeaders,
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const raw = (await response.json().catch(() => null)) as
        | ApiEnvelope<T>
        | ApiErrorEnvelope
        | null;

      if (!response.ok) {
        if (raw && !raw.success && raw.error) {
          throw GoursiError.fromEnvelope(raw.error, response.status);
        }
        throw new GoursiError('HTTP_ERROR', `Réponse HTTP ${response.status}`, response.status);
      }

      if (raw && raw.success) {
        return raw.data;
      }
      return raw as T;
    } catch (error) {
      if (error instanceof GoursiError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GoursiNetworkError(`Timeout après ${this.timeoutMs} ms sur ${method} ${path}`);
      }
      throw new GoursiNetworkError(`Erreur réseau sur ${method} ${path}`, error);
    } finally {
      clearTimeout(timer);
    }
  }
}
