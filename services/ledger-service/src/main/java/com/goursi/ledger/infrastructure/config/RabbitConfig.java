package com.goursi.ledger.infrastructure.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * GOURSI-014e — déclaration idempotente de l'exchange financier (la topologie
 * complète queues/bindings est déclarée par infra/rabbitmq côté orchestration).
 */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "financial.events";

    @Bean
    public TopicExchange financialEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }
}
