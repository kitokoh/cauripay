/**
 * Client API interne — business-service (GOURSI-043a, GOURSI-030+).
 *
 * Wrapper fetch : base URL (BUSINESS_SERVICE_URL), en-tête d'authentification
 * interne `X-Service-Key` (INTERNAL_SERVICE_KEY), timeout et erreurs typées.
 * Utilisé côté serveur uniquement (server components / route handlers) — jamais
 * exposé au navigateur.
 */
export interface ApiClientOptions {
  baseUrl?: string;
  serviceKey?: string;
  timeoutMs?: number;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiClient {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

const DEFAULT_BASE_URL = 'http://localhost:3020';
const DEFAULT_SERVICE_KEY = 'dev-internal-service-key-change-me';
const DEFAULT_TIMEOUT_MS = 10_000;

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? process.env.BUSINESS_SERVICE_URL ?? DEFAULT_BASE_URL;
  const serviceKey = options.serviceKey ?? process.env.INTERNAL_SERVICE_KEY ?? DEFAULT_SERVICE_KEY;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'X-Service-Key': serviceKey,
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      });
      if (!res.ok) {
        throw new ApiClientError(
          `business-service ${init.method ?? 'GET'} ${path} → HTTP ${res.status}`,
          res.status,
          path,
        );
      }
      if (res.status === 204) {
        return undefined as T;
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiClientError(`timeout après ${timeoutMs} ms sur ${path}`, 0, path);
      }
      throw new ApiClientError(`erreur réseau sur ${path} : ${String(err)}`, 0, path);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
    post: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
    request,
  };
}

/** Client singleton utilisé par les pages du dashboard. */
export const apiClient = createApiClient();
