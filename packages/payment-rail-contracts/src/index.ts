/**
 * @cauripay/payment-rail-contracts — Contrat d'adaptateur de rail de paiement.
 *
 * Le Payment Router (business-service) route chaque paiement vers un rail
 * (GOURSI interne, PSP externes : Orange Money, MTN MoMo, Wave…).
 * Ajouter un rail = 1 implémentation d'IRailAdapter + 1 enregistrement.
 * Zéro dépendance runtime.
 */

/** Identifiant d'un rail (ex: "GOURSI", "ORANGE_MONEY", "MTN_MOMO", "WAVE", "CINETPAY"). */
export type RailId = string;

/** Statut d'un paiement côté rail (normalisé). */
export type RailPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

/** Erreur normalisée retournée par un rail. */
export interface RailError {
  code: string;
  message: string;
  retryable: boolean;
}

/** Demande de paiement transmise à un rail. */
export interface RailPayment {
  id: string;
  amountMinor: number;
  currency: string;
  method: string; // ex: "mobile_money", "card"
  phone?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Résultat de l'initiation. */
export interface RailInitiateResult {
  railRef: string; // référence côté rail
  status: RailPaymentStatus;
  checkoutUrl?: string;
}

/** Callback entrant (webhook PSP) normalisé. */
export interface RailCallbackPayload {
  railRef: string;
  status: RailPaymentStatus;
  raw?: Record<string, unknown>;
}

/**
 * Contrat d'adaptateur de rail. Chaque rail implémente ces 4 méthodes.
 */
export interface IRailAdapter {
  readonly railId: RailId;

  /** Initie un paiement auprès du rail. */
  initiate(payment: RailPayment): Promise<RailInitiateResult>;

  /** Interroge le statut d'un paiement côté rail. */
  getStatus(railRef: string): Promise<RailPaymentStatus>;

  /** Traite un callback entrant (webhook PSP) et normalise le statut. */
  handleCallback(payload: RailCallbackPayload): Promise<RailPaymentStatus>;

  /** Libère les ressources (connexions, timers). */
  close(): Promise<void>;
}

/**
 * Registre de rails : map rail → adaptateur.
 * L'enregistrement se fait au bootstrap (business-service).
 */
export class RailRegistry {
  private readonly rails = new Map<RailId, IRailAdapter>();

  register(adapter: IRailAdapter): void {
    this.rails.set(adapter.railId, adapter);
  }

  get(railId: RailId): IRailAdapter | undefined {
    return this.rails.get(railId);
  }

  has(railId: RailId): boolean {
    return this.rails.has(railId);
  }

  list(): RailId[] {
    return [...this.rails.keys()];
  }
}
