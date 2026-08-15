package com.goursi.ledger.api.envelope;

import com.goursi.ledger.api.exception.ErrorBody;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Enveloppe TOUTES les réponses de succès du ledger :
 * { success:true, data, timestamp, requestId } — jamais les erreurs (ErrorBody).
 * Contrat : les consommateurs (api-core LedgerClient) lisent success/data.
 */
@RestControllerAdvice
public class EnvelopeAdvice implements ResponseBodyAdvice<Object> {

  @Override
  public boolean supports(
      MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
    return true;
  }

  @Override
  public Object beforeBodyWrite(
      Object body,
      MethodParameter returnType,
      MediaType selectedContentType,
      Class<? extends HttpMessageConverter<?>> selectedConverterType,
      ServerHttpRequest request,
      ServerHttpResponse response) {
    if (body == null || body instanceof SuccessEnvelope || body instanceof ErrorBody) {
      return body;
    }
    String requestId = request.getHeaders().getFirst("X-Request-Id");
    if (request instanceof HttpServletRequest) {
      requestId = ((HttpServletRequest) request).getHeader("X-Request-Id");
    }
    return SuccessEnvelope.of(body, requestId);
  }
}
