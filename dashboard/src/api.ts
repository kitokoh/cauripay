// ---------- Client API + jeton JWT ----------

const TOKEN_KEY = 'cauripay_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiErrorBody {
  error?: { type?: string; code?: string; message?: string };
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Requête vers l'API marchand (JWT). */
export async function request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as T & ApiErrorBody;
  if (!res.ok) {
    const msg = json?.error?.message || `Erreur ${res.status}`;
    if (res.status === 401) clearToken();
    throw new ApiError(res.status, json?.error?.code || 'error', msg);
  }
  return json;
}

// ---------- Appels API développeur (clé sk_test, en mémoire) ----------

let cachedSkTest: string | null = null;

export async function getSkTest(): Promise<string> {
  if (cachedSkTest) return cachedSkTest;
  const data = await request<{ keys: { secret_test: string } }>('/keys');
  cachedSkTest = data.keys.secret_test;
  return cachedSkTest;
}

/** Requête vers l'API développeur /api/v1 avec la clé secrète de test. */
export async function apiV1<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const sk = await getSkTest();
  const headers: Record<string, string> = { Authorization: `Bearer ${sk}` };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/v1${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as T & ApiErrorBody;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code || 'error', json?.error?.message || `Erreur ${res.status}`);
  }
  return json;
}

// ---------- Types ----------

export interface Merchant {
  id: string;
  name: string;
  company: string;
  email: string;
  created_at: string;
}

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'expired';

export interface Payment {
  id: string;
  status: PaymentStatus;
  amount_minor: number;
  currency: string;
  methods: string[];
  provider: string | null;
  provider_ref: string | null;
  phone: string | null;
  description: string;
  metadata: Record<string, unknown>;
  redirect_url: string | null;
  mode: 'test' | 'live';
  checkout_url: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  timeline: { type: string; created_at: string }[];
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  mode: 'test' | 'live';
  active: number;
  created_at: string;
}

export interface Attempt {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  signature: string;
  status: string;
  http_status: number | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
}
