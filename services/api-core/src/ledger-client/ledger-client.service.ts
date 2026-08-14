import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BalanceResult,
  TransferCommand,
  TransferResult,
} from '@goursi/shared-types';

export interface LedgerEntryRef {
  id: string;
  balanceAfter: string;
  createdAt?: string;
}

export class LedgerError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Client HTTP vers ledger-service (GOURSI-022a).
 * X-Service-Key obligatoire, timeout 10 s, erreurs typées par code ledger.
 */
@Injectable()
export class LedgerClientService {
  private readonly logger = new Logger(LedgerClientService.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('env.ledgerBaseUrl')!;
    this.serviceKey = this.config.get<string>('env.internalServiceKey')!;
    this.timeoutMs = this.config.get<number>('env.ledgerTimeoutMs')!;
  }

  /** transferAtomic → 4 écritures, tout ou rien. */
  async transferAtomic(command: TransferCommand): Promise<TransferResult> {
    return this.request<TransferResult>('POST', '/internal/ledger/transfer', command);
  }

  async credit(payload: {
    idempotencyKey: string;
    transactionId: string;
    walletId: string;
    amount: string;
    entryType?: string;
    description?: string;
  }): Promise<LedgerEntryRef> {
    return this.request<LedgerEntryRef>('POST', '/internal/ledger/credit', payload);
  }

  async debit(payload: {
    idempotencyKey: string;
    transactionId: string;
    walletId: string;
    amount: string;
    entryType?: string;
    description?: string;
  }): Promise<LedgerEntryRef> {
    return this.request<LedgerEntryRef>('POST', '/internal/ledger/debit', payload);
  }

  async reverse(payload: { originalTransactionId: string; idempotencyKey: string; reason?: string }) {
    return this.request('POST', '/internal/ledger/reverse', payload);
  }

  async getBalance(walletId: string): Promise<BalanceResult> {
    return this.request('GET', `/internal/ledger/balance/${walletId}`);
  }

  async getHistory(walletId: string, page = 0, size = 50) {
    return this.request('GET', `/internal/ledger/history/${walletId}?page=${page}&size=${size}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': this.serviceKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => null)) as { code?: string; message?: string; details?: unknown } | null;
      if (!res.ok) {
        throw new LedgerError(
          res.status,
          json?.code ?? 'LEDGER_ERROR',
          json?.message ?? `Erreur ledger ${res.status}`,
          json?.details,
        );
      }
      return json as T;
    } catch (e) {
      if (e instanceof LedgerError) throw e;
      this.logger.error(`Appel ledger ${method} ${path} échoué`, (e as Error).message);
      throw new ServiceUnavailableException({ code: 'LEDGER_UNAVAILABLE', message: 'ledger-service indisponible' });
    } finally {
      clearTimeout(timer);
    }
  }
}
