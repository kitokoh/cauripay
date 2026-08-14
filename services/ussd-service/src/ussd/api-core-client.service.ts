import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Timeout des appels api-core (10 s, comme LedgerClientService d'api-core). */
export const API_CORE_TIMEOUT_MS = 10_000;

/** Résultat solde — miroir de @goursi/shared-types BalanceResult. */
export interface BalanceResult {
  walletId: string;
  balance: string;
  frozenBalance: string;
  availableBalance: string;
  version: number;
}

/** Résultat transfert — sous-ensemble de la Transaction api-core. */
export interface TransferResult {
  id?: string;
  transactionId?: string;
  status?: string;
  amountMinor?: string;
}

export class ApiCoreError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Client HTTP vers api-core (GOURSI-027c).
 *
 * MVP : api-core protège /api/v1/* par JWT Keycloak ; le client envoie donc
 * `X-Service-Key` + `X-User-Phone` (le MSISDN USSD) pour résoudre l'utilisateur.
 * ⚠️ Intégration réelle prévue : token de service interne (JWT service-to-service)
 * + routes /internal/* d'api-core — aucun appel n'utilise de clé API externe.
 */
@Injectable()
export class ApiCoreClientService {
  private readonly logger = new Logger(ApiCoreClientService.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('env.apiCoreBaseUrl')!;
    this.serviceKey = this.config.get<string>('env.internalServiceKey')!;
  }

  /** Solde du wallet du MSISDN (via api-core → ledger-service). */
  async getBalance(msisdn: string): Promise<BalanceResult> {
    return this.request<BalanceResult>('GET', '/api/v1/wallets/me/balance', undefined, msisdn);
  }

  /** Transfert P2P (via api-core → ledger-service, règle absolue n°1). */
  async transfer(params: {
    idempotencyKey: string;
    fromMsisdn: string;
    toAccountNumber: string;
    amountMinor: string;
    description?: string;
  }): Promise<TransferResult> {
    const body = {
      idempotencyKey: params.idempotencyKey,
      toAccountNumber: params.toAccountNumber,
      amountMinor: params.amountMinor,
      description: params.description,
    };
    return this.request<TransferResult>('POST', '/api/v1/transactions/transfer', body, params.fromMsisdn);
  }

  private async request<T>(method: string, path: string, body?: unknown, msisdn?: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CORE_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': this.serviceKey,
          ...(msisdn ? { 'X-User-Phone': msisdn } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: T; code?: string; message?: string; error?: { code?: string; message?: string } }
        | null;
      if (!res.ok) {
        const code = json?.code ?? json?.error?.code ?? 'API_CORE_ERROR';
        const message = json?.message ?? json?.error?.message ?? `Erreur api-core ${res.status}`;
        throw new ApiCoreError(res.status, code, message);
      }
      if (json && json.success === false) {
        throw new ApiCoreError(res.status, json.error?.code ?? 'API_CORE_ERROR', json.error?.message ?? 'Erreur api-core');
      }
      return (json?.data ?? json) as T;
    } catch (e) {
      if (e instanceof ApiCoreError) throw e;
      this.logger.error(`Appel api-core ${method} ${path} échoué`, (e as Error).message);
      throw new ApiCoreError(503, 'API_CORE_UNAVAILABLE', 'api-core indisponible');
    } finally {
      clearTimeout(timer);
    }
  }
}
