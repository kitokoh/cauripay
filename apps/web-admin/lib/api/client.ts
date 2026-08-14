/**
 * Client HTTP vers api-core (côté serveur uniquement).
 *
 * - Base URL : API_CORE_BASE_URL (défaut http://localhost:3000) ;
 * - en-tête inter-services X-Service-Key : INTERNAL_SERVICE_KEY ;
 * - gère l'enveloppe api-core `{ success, data, timestamp, requestId }`
 *   (packages/shared-types) et renvoie un résultat discriminé.
 */
import { getApiCoreBaseUrl, getInternalServiceKey } from '../config';

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId?: string;
}

export interface ApiError {
  ok: false;
  /** 0 = réseau / API injoignable. */
  status: number;
  code?: string;
  message: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

interface ApiCoreEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  requestId?: string;
}

/**
 * Appel serveur vers api-core. `path` commence par `/api/v1/...`.
 * Ne jamais appeler depuis le client navigateur : l'en-tête X-Service-Key
 * est un secret inter-services.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const baseUrl = getApiCoreBaseUrl().replace(/\/+$/, '');
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

  const headers = new Headers(init.headers);
  headers.set('X-Service-Key', getInternalServiceKey());
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && init.body !== null) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
    });
    const body = (await response.json().catch(() => null)) as ApiCoreEnvelope<T> | null;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: body?.error?.code,
        message: body?.error?.message ?? `HTTP ${response.status}`,
      };
    }

    // Enveloppe api-core : { success, data, error, requestId }
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success === true) {
        return { ok: true, data: body.data as T, requestId: body.requestId };
      }
      return {
        ok: false,
        status: response.status,
        code: body.error?.code,
        message: body.error?.message ?? 'Erreur api-core',
      };
    }

    return { ok: true, data: body as unknown as T };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : 'api-core injoignable',
    };
  }
}
