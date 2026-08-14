import { BackoffService, BACKOFF_SCHEDULE_MS, MAX_ATTEMPTS } from './backoff.service';

describe('BackoffService (GOURSI-026d)', () => {
  const backoff = new BackoffService();

  it('tentative 1 → 30 s', () => {
    expect(backoff.getDelayMs(1)).toBe(30_000);
  });

  it('tentative 2 → 2 min', () => {
    expect(backoff.getDelayMs(2)).toBe(120_000);
  });

  it('tentative 3 → 10 min', () => {
    expect(backoff.getDelayMs(3)).toBe(600_000);
  });

  it('tentative 4 → 30 min (plafond)', () => {
    expect(backoff.getDelayMs(4)).toBe(1_800_000);
  });

  it('au-delà de 4 tentatives → plafonné à 30 min', () => {
    expect(backoff.getDelayMs(5)).toBe(1_800_000);
    expect(backoff.getDelayMs(99)).toBe(1_800_000);
  });

  it('attempt <= 0 → clamp à 30 s', () => {
    expect(backoff.getDelayMs(0)).toBe(30_000);
    expect(backoff.getDelayMs(-1)).toBe(30_000);
  });

  it('MAX_ATTEMPTS = 4 et calendrier de backoff exponentiel plafonné', () => {
    expect(MAX_ATTEMPTS).toBe(4);
    expect(BACKOFF_SCHEDULE_MS).toEqual([30_000, 120_000, 600_000, 1_800_000]);
  });
});
