/// Exceptions typées du SDK — codes API stables conservés.
library;

/// Erreur API (code stable + statut HTTP).
class GoursiApiException implements Exception {
  final int status;
  final String code;
  final String message;
  final Map<String, dynamic>? details;

  GoursiApiException({required this.status, required this.code, required this.message, this.details});

  @override
  String toString() => 'GoursiApiException($status $code): $message';
}

/// Erreur réseau / timeout.
class GoursiNetworkException implements Exception {
  final String message;
  GoursiNetworkException(this.message);
  @override
  String toString() => 'GoursiNetworkException: $message';
}
