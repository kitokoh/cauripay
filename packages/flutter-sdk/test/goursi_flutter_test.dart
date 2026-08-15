import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goursi_flutter/goursi_flutter.dart';

void main() {
  const secret = 'whsec_test_secret_123';
  const payload = '{"id":"pay_1","event":"payment.succeeded","amount":"25000"}';

  String sign(int timestamp) {
    final v1 = Hmac(sha256, utf8.encode(secret)).convert(utf8.encode('$timestamp.$payload')).toString();
    return 't=$timestamp,v1=$v1';
  }

  group('WebhookVerifier', () {
    test('accepte une signature valide', () {
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      expect(WebhookVerifier(secret: secret).verifySignature(sign(now), payload), isTrue);
    });

    test('rejette un mauvais secret', () {
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      expect(WebhookVerifier(secret: 'autre').verifySignature(sign(now), payload), isFalse);
    });

    test('rejette un payload modifié (tampering)', () {
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final tampered = payload.replaceAll('25000', '99999');
      expect(WebhookVerifier(secret: secret).verifySignature(sign(now), tampered), isFalse);
    });

    test('rejette un timestamp hors fenêtre (anti-replay)', () {
      final old = DateTime.now().millisecondsSinceEpoch ~/ 1000 - 3600;
      expect(WebhookVerifier(secret: secret).verifySignature(sign(old), payload), isFalse);
    });

    test('rejette un header malformé', () {
      expect(WebhookVerifier(secret: secret).verifySignature('garbage', payload), isFalse);
    });
  });

  group('InitiatePaymentParams', () {
    test('accepte un montant string', () {
      expect(() => InitiatePaymentParams(amount: '25000', to: '+23566000001'), returnsNormally);
    });

    test('refuse un montant float (spec §8.2)', () {
      expect(() => InitiatePaymentParams(amount: '25.50', to: 'x'), throwsArgumentError);
    });
  });

  group('PaymentResult.fromJson', () {
    test('parse le statut majuscule', () {
      final result = PaymentResult.fromJson({
        'id': 'pay_1',
        'status': 'SUCCESS',
        'amount': '25000',
        'currency': 'XAF',
      });
      expect(result.status, PaymentStatus.success);
      expect(result.amount, '25000');
    });
  });
}
