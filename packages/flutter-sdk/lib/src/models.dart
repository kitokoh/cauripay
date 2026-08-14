/// Modèles du SDK — montants en String (unités mineures), jamais en double (spec §8.2).
library;

/// Statut d'un paiement (spec §4.4 — majuscules).
enum PaymentStatus {
  pending('PENDING'),
  processing('PROCESSING'),
  success('SUCCESS'),
  failed('FAILED'),
  cancelled('CANCELLED'),
  reversed('REVERSED');

  final String wire;
  const PaymentStatus(this.wire);

  static PaymentStatus fromWire(String value) =>
      PaymentStatus.values.firstWhere((s) => s.wire == value, orElse: () => PaymentStatus.pending);
}

/// Résultat d'un paiement.
class PaymentResult {
  final String id;
  final PaymentStatus status;
  final String amount;
  final String currency;
  final String? checkoutUrl;
  final Map<String, dynamic>? metadata;

  PaymentResult({
    required this.id,
    required this.status,
    required this.amount,
    required this.currency,
    this.checkoutUrl,
    this.metadata,
  });

  factory PaymentResult.fromJson(Map<String, dynamic> json) => PaymentResult(
        id: json['id'] as String,
        status: PaymentStatus.fromWire(json['status'] as String),
        amount: (json['amount'] ?? json['amountMinor']).toString(),
        currency: json['currency'] as String,
        checkoutUrl: json['checkoutUrl'] as String?,
        metadata: json['metadata'] as Map<String, dynamic>?,
      );
}

/// Requête de paiement.
class InitiatePaymentParams {
  final String amount; // unités mineures, ex: "25000"
  final String to; // accountNumber ou téléphone
  final String currency;
  final String? description;
  final Map<String, dynamic>? metadata;
  final String? idempotencyKey;

  InitiatePaymentParams({
    required this.amount,
    required this.to,
    this.currency = 'XAF',
    this.description,
    this.metadata,
    this.idempotencyKey,
  }) {
    if (!RegExp(r'^\d+$').hasMatch(amount)) {
      throw ArgumentError('amount doit être un string d’unités mineures (spec §8.2)');
    }
  }

  Map<String, dynamic> toJson() => {
        'amount': amount,
        'to': to,
        'currency': currency,
        if (description != null) 'description': description,
        if (metadata != null) 'metadata': metadata,
      };
}
