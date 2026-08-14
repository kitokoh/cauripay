import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import {
  BalanceResult,
  TransferPayload,
  TransferResult,
  LedgerEntryDto,
} from '@cauripay/shared-types';

/**
 * Client HTTP vers ledger-service (/internal/ledger/*).
 * Header X-Service-Key obligatoire ; timeout 10 s.
 * api-core ne lit JAMAIS wallets.balance en Prisma — tout passe ici.
 */
@Injectable()
export class LedgerClientService {
  private readonly baseUrl: string;
  private readonly serviceKey: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('LEDGER_URL') ?? 'http://localhost:3010';
    this.serviceKey = config.get<string>('INTERNAL_SERVICE_KEY') ?? 'dev-internal-service-key-change-me';
  }

  private headers() {
    return { 'X-Service-Key': this.serviceKey };
  }

  async transfer(payload: TransferPayload): Promise<TransferResult> {
    return this.post<TransferResult>('/internal/ledger/transfer', payload);
  }

  async balance(walletId: string): Promise<BalanceResult> {
    return this.get<BalanceResult>(`/internal/ledger/balance/${walletId}`);
  }

  async history(walletId: string, cursor?: string, limit = 50): Promise<LedgerEntryDto[]> {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    q.set('limit', String(limit));
    return this.get<LedgerEntryDto[]>(`/internal/ledger/entries/${walletId}?${q}`);
  }

  private async get<T>(path: string): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: T }>(`${this.baseUrl}${path}`, { headers: this.headers() }).pipe(timeout(10_000)),
      );
      return res.data.data ?? (res.data as unknown as T);
    } catch (e) {
      throw new ServiceUnavailableException({
        code: 'LEDGER_UNAVAILABLE',
        message: 'ledger-service injoignable',
        details: { path },
      });
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ data: T }>(`${this.baseUrl}${path}`, body, { headers: this.headers() }).pipe(timeout(10_000)),
      );
      return res.data.data ?? (res.data as unknown as T);
    } catch (e) {
      throw new ServiceUnavailableException({
        code: 'LEDGER_UNAVAILABLE',
        message: 'ledger-service injoignable',
        details: { path },
      });
    }
  }
}
