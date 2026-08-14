package com.goursi.ledger.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Publie la vérité comptable sur l'exchange RabbitMQ `financial.events`.
 * Émission APRÈS commit (afterCommit) — jamais d'événement pour une transaction annulée.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerEventPublisher {

    public static final String EXCHANGE = "financial.events";

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper mapper;

    /**
     * Enregistre une publication à exécuter après le commit de la transaction en cours.
     * Si aucune transaction n'est active, publie immédiatement (mode dégradé/tests).
     */
    public void publishAfterCommit(UUID transactionId, String routingKey, BigDecimal amount,
                                   String status, List<UUID> walletIds) {
        Map<String, Object> payload = Map.of(
                "transactionId", transactionId,
                "type", routingKey.contains("reversed") ? "REVERSAL" : "TRANSFER",
                "amount", amount,
                "status", status,
                "walletIds", walletIds
        );

        Runnable send = () -> {
            try {
                String json = mapper.writeValueAsString(payload);
                rabbitTemplate.convertAndSend(EXCHANGE, routingKey, json);
                log.debug("Événement publié: {} {}", routingKey, transactionId);
            } catch (Exception e) {
                log.error("Échec publication événement {} pour {}", routingKey, transactionId, e);
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
            send.run();
        }
    }
}
