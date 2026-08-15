package com.goursi.ledger.infrastructure.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goursi.ledger.domain.model.LedgerTransactionStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Publication des événements financiers — APRÈS commit uniquement
 * (jamais d'événement d'une transaction annulée, liste rouge).
 * Exchange : financial.events (topic) — routing : transaction.completed / .failed / .reversed.
 */
@Component
public class LedgerEventPublisher {

  private static final Logger log = LoggerFactory.getLogger(LedgerEventPublisher.class);

  private final RabbitTemplate rabbitTemplate;
  private final ObjectMapper objectMapper;
  private final String exchange;
  private final String dlqExchange;

  public LedgerEventPublisher(
      RabbitTemplate rabbitTemplate,
      ObjectMapper objectMapper,
      @Value("${goursi.ledger.exchange:financial.events}") String exchange,
      @Value("${goursi.ledger.dlq-exchange:dead.letters}") String dlqExchange) {
    this.rabbitTemplate = rabbitTemplate;
    this.objectMapper = objectMapper;
    this.exchange = exchange;
    this.dlqExchange = dlqExchange;
  }

  /** Publie transaction.completed après commit. */
  public void publishCompleted(UUID transactionId, String type, BigDecimal amount, List<UUID> walletIds) {
    publishAfterCommit("transaction.completed", transactionId, type, amount, LedgerTransactionStatus.COMPLETED, walletIds);
  }

  /** Publie transaction.reversed après commit. */
  public void publishReversed(UUID transactionId, String type, BigDecimal amount, List<UUID> walletIds) {
    publishAfterCommit("transaction.reversed", transactionId, type, amount, LedgerTransactionStatus.REVERSED, walletIds);
  }

  /** Publie transaction.failed (ex. rollback explicite) après commit. */
  public void publishFailed(UUID transactionId, String type, BigDecimal amount, List<UUID> walletIds) {
    publishAfterCommit("transaction.failed", transactionId, type, amount, LedgerTransactionStatus.FAILED, walletIds);
  }

  private void publishAfterCommit(
      String routingKey, UUID transactionId, String type, BigDecimal amount,
      LedgerTransactionStatus status, List<UUID> walletIds) {
    Runnable send = () -> {
      Map<String, Object> payload = Map.of(
          "transactionId", transactionId.toString(),
          "type", type == null ? "TRANSFER" : type,
          "amount", amount.toPlainString(),
          "status", status.name(),
          "walletIds", walletIds.stream().map(UUID::toString).toList(),
          "eventType", routingKey);
      try {
        rabbitTemplate.convertAndSend(exchange, routingKey, objectMapper.writeValueAsString(payload));
      } catch (Exception e) {
        // Liste rouge #7 : jamais avaler — on logge et on route vers la DLQ.
        log.error("Échec publication {} sur {} → DLQ", routingKey, exchange, e);
        try {
          rabbitTemplate.convertAndSend(dlqExchange, "failed." + routingKey, payload);
        } catch (Exception e2) {
          log.error("Échec DLQ pour {}", routingKey, e2);
        }
      }
    };

    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          send.run();
        }
      });
    } else {
      log.warn("Aucune transaction active — publication immédiate de {}", routingKey);
      send.run();
    }
  }
}
