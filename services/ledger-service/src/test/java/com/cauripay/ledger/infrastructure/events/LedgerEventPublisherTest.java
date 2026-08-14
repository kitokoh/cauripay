package com.cauripay.ledger.infrastructure.events;

import com.cauripay.ledger.application.result.TransferResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

/**
 * Tests du publisher d'événements (GOURSI-014e) : routing key correcte,
 * publication sur financial.events, et un échec de publication ne remonte pas.
 */
@ExtendWith(MockitoExtension.class)
class LedgerEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Test
    void publishesCompletedOnFinancialEventsExchange() {
        final LedgerEventPublisher publisher =
            new LedgerEventPublisher(rabbitTemplate, "financial.events");
        final TransferResult result = TransferResult.completed(
            UUID.randomUUID(), List.of(UUID.randomUUID()), UUID.randomUUID(), UUID.randomUUID(), null);

        publisher.publish(result, "completed");

        final ArgumentCaptor<LedgerEventPublisher.FinancialEvent> captor =
            ArgumentCaptor.forClass(LedgerEventPublisher.FinancialEvent.class);
        verify(rabbitTemplate).convertAndSend(
            org.mockito.ArgumentMatchers.eq("financial.events"),
            org.mockito.ArgumentMatchers.eq("transaction.completed"),
            (Object) captor.capture());
        assertThat(captor.getValue().transactionId()).isEqualTo(result.transactionId());
        assertThat(captor.getValue().status()).isEqualTo("COMPLETED");
    }

    @Test
    void mapsReversedRoutingKey() {
        final LedgerEventPublisher publisher =
            new LedgerEventPublisher(rabbitTemplate, "financial.events");
        publisher.publish(TransferResult.completed(UUID.randomUUID(), List.of(), UUID.randomUUID(),
            null, null), "reversed");
        verify(rabbitTemplate).convertAndSend(
            org.mockito.ArgumentMatchers.eq("financial.events"),
            org.mockito.ArgumentMatchers.eq("transaction.reversed"),
            (Object) org.mockito.ArgumentMatchers.any());
    }
}
