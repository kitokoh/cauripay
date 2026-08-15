import 'dart:convert';
import 'package:http/http.dart' as http;

import 'goursi_exception.dart';
import 'models.dart';

/// Client officiel GOURSI (CauriPay) pour Flutter.
///
/// ```dart
/// final goursi = GoursiClient(apiKey: 'sk_test_…');
/// final payment = await goursi.payments.initiate(amount: '25000', to: '+23566000001');
/// ```
class GoursiClient {
  final String apiKey;
  final String baseUrl;
  final Duration timeout;

  GoursiClient({
    required this.apiKey,
    this.baseUrl = 'https://api.cauripay.com',
    this.timeout = const Duration(seconds: 15),
  }) {
    if (!apiKey.startsWith('sk_') && !apiKey.startsWith('pk_')) {
      throw ArgumentError("apiKey invalide : doit commencer par 'sk_' ou 'pk_'");
    }
  }

  Payments get payments => Payments(this);

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? idempotencyKey,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = {
      'Authorization': 'Bearer $apiKey',
      'Content-Type': 'application/json',
      if (idempotencyKey != null) 'Idempotency-Key': idempotencyKey,
    };

    http.Response response;
    try {
      response = switch (method) {
        'POST' => await http.post(uri, headers: headers, body: jsonEncode(body)).timeout(timeout),
        'GET' => await http.get(uri, headers: headers).timeout(timeout),
        _ => throw ArgumentError('Méthode non supportée: $method'),
      };
    } on Exception catch (e) {
      throw GoursiNetworkException('Erreur réseau sur $method $path: $e');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>?;
    if (response.statusCode >= 400 || decoded == null || decoded['success'] != true) {
      final error = decoded?['error'] as Map<String, dynamic>?;
      throw GoursiApiException(
        status: response.statusCode,
        code: (error?['code'] as String?) ?? 'API_ERROR',
        message: (error?['message'] as String?) ?? 'Erreur ${response.statusCode}',
        details: error?['details'] as Map<String, dynamic>?,
      );
    }
    return decoded['data'] as Map<String, dynamic>;
  }
}

/// Espace `payments` du client.
class Payments {
  final GoursiClient _client;
  Payments(this._client);

  /// Crée un paiement (idempotent via `idempotencyKey`).
  Future<PaymentResult> initiate(InitiatePaymentParams params) async {
    final data = await _client._request(
      'POST',
      '/api/v1/payments',
      body: params.toJson(),
      idempotencyKey: params.idempotencyKey,
    );
    return PaymentResult.fromJson(data);
  }

  /// Récupère un paiement.
  Future<PaymentResult> get(String paymentId) async {
    final data = await _client._request('GET', '/api/v1/payments/$paymentId');
    return PaymentResult.fromJson(data);
  }

  /// Annule un paiement (statut PENDING uniquement).
  Future<PaymentResult> cancel(String paymentId) async {
    final data = await _client._request('POST', '/api/v1/payments/$paymentId/cancel');
    return PaymentResult.fromJson(data);
  }
}
