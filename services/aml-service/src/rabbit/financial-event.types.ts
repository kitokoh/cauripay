/** Contrat des événements financiers publiés par ledger-service sur financial.events (topic). */
export interface FinancialEvent {
  transactionId: string;
  type?: string; // TRANSFER | CASH_IN | ...
  status: string; // COMPLETED | REVERSED | FAILED
  amountMinor?: string;
  currency?: string;
  walletIds?: string[];
  senderName?: string;
  senderCountry?: string;
  recipientName?: string;
  recipientCountry?: string;
  method?: string;
}
