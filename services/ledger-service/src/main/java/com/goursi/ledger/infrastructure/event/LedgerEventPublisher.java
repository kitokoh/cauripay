package com.goursi.ledger.infrastructure.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * GOURSI-014e — ledger-service publie la vérité comptable sur l'exchange
 * `financial.events` (routing : transaction.completed / transaction.reversed /
 * transaction.failed). Émission APRÈS commit (afterCommit / afterCompletion) :
 * jamais d'événement pour une transaction annulée. Un échec de publication ne
 * fait JAMAIS échouer l'écriture (la vérité est en base).
 */
@Component
public class LedgerEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(LedgerEventPublisher.class);
    public static final String EXCHANGE = "financial.events";

    private final RabbitTemplate rabbit;
    private final ObjectMapper mapper;

    public LedgerEventPublisher(RabbitTemplate rabbit, ObjectMapper mapper) {
        this.rabbit = rabbit;
        this.mapper = mapper;
    }

    public void publishCompleted(UUID transactionId, BigDecimal amount, UUID fromWallet, UUID toWallet) {
        publishAfterCommit("transaction.completed",
            Map.of("transactionId", transactionId, "type", "completed", "amount", amount,
                   "status", "SUCCESS", "walletIds", java.util.List.of(fromWallet, toWallet)));
    }

    public void publishReversed(UUID originalTransactionId, UUID reversalTransactionId, String reason) {
        publishAfterCommit("transaction.reversed",
            Map.of("transactionId", reversalTransactionId, "originalTransactionId", originalTransactionId,
                   "type", "reversed", "status", "REVERSED", "reason", reason));
    }

    public void publishFailed(UUID transactionId, BigDecimal amount, String reason) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    doPublish("transaction.failed",
                        Map.of("transactionId", transactionId, "type", "failed", "amount", amount,
                               "status", "FAILED", "reason", reason));
                }
            }
        });
    }

    private void publishAfterCommit(String routingKey, Map<String, Object> payload) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                doPublish(routingKey, payload);
            }
        });
    }

    private void doPublish(String routingKey, Map<String, Object> payload) {
        try {
            rabbit.convertAndSend(EXCHANGE, routingKey, mapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Publication événement {} impossible (best effort) : {}", routingKey, e.getMessage());
        }
    }
}
