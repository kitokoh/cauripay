import 'dart:convert';
import 'package:crypto/crypto.dart';

/// Vérification des webhooks signés (HMAC-SHA256, anti-replay ±5 min).
///
/// Header : `X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.payload")>`
class WebhookVerifier {
  final String secret;
  final int toleranceSeconds;

  WebhookVerifier({required this.secret, this.toleranceSeconds = 300});

  /// Vérifie la signature. `payload` doit être le corps BRUT (non re-sérialisé).
  bool verifySignature(String signature, String payload) {
    final tMatch = RegExp(r't=(\d+)').firstMatch(signature);
    final v1Match = RegExp(r'v1=([0-9a-f]+)').firstMatch(signature);
    if (tMatch == null || v1Match == null) return false;

    final t = int.tryParse(tMatch.group(1)!);
    if (t == null) return false;

    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    if ((now - t).abs() > toleranceSeconds) return false; // anti-replay

    final expected = Hmac(sha256, utf8.encode(secret))
        .convert(utf8.encode('$t.$payload'))
        .toString();
    return _safeEqual(expected, v1Match.group(1)!);
  }

  bool _safeEqual(String a, String b) {
    if (a.length != b.length) return false;
    var result = 0;
    for (var i = 0; i < a.length; i++) {
      result |= a.codeUnitAt(i) ^ b.codeUnitAt(i);
    }
    return result == 0;
  }
}
