package com.cauripay.ledger.infrastructure.events;

import com.cauripay.ledger.application.result.TransferResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Publication des événements comptables sur {@code financial.events}
 * (GOURSI-014e) — appelé uniquement en {@code afterCommit} (jamais d'événement
 * d'une transaction annulée).
 *
 * <p>Routing keys : {@code transaction.completed}, {@code transaction.reversed},
 * {@code transaction.failed} (topologie déclarée — infra/rabbitmq).
 */
@Component
public class LedgerEventPublisher {

    private static final Logger LOG = LoggerFactory.getLogger(LedgerEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;

    public LedgerEventPublisher(
        RabbitTemplate rabbitTemplate,
        @Value("${ledger.events.exchange:financial.events}") String exchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
    }

    /** Payload minimal (spec §6) : transactionId, type, amount, status, walletIds. */
    public record FinancialEvent(
        UUID eventId,
        UUID transactionId,
        String type,
        String amount,
        String status,
        List<UUID> walletIds,
        Instant occurredAt) {
    }

    public void publish(TransferResult result, String status) {
        try {
            final FinancialEvent event = new FinancialEvent(
                UUID.randomUUID(),
                result.transactionId(),
                "LEDGER",
                null,
                status.toUpperCase(),
                List.of(),
                Instant.now());
            rabbitTemplate.convertAndSend(exchange, routingKey(status), event);
        } catch (RuntimeException e) {
            // Un événement perdu ne doit pas faire échouer la transaction déjà commitée :
            // on loggue (l'audit SQL et les checkpoints restent la source de vérité).
            LOG.error("Publication événement {} impossible (transaction {})",
                status, result.transactionId(), e);
        }
    }

    private static String routingKey(String status) {
        return switch (status) {
            case "completed" -> "transaction.completed";
            case "reversed" -> "transaction.reversed";
            case "failed" -> "transaction.failed";
            default -> "transaction." + status;
        };
    }
}
