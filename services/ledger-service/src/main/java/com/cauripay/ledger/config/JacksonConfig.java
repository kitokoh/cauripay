package com.cauripay.ledger.config;

import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

/**
 * Configuration Jackson : les montants {@link BigDecimal} sont sérialisés en
 * string préservant l'échelle (ex. {@code "898.10"}), conformément au contrat
 * partagé TS ({@code amount: string}). Jamais de float pour l'argent.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer bigDecimalAsPlainString() {
        return builder -> {
            final SimpleModule module = new SimpleModule();
            module.addSerializer(BigDecimal.class, new ToStringSerializer(BigDecimal.class));
            builder.modules(module);
        };
    }
}
