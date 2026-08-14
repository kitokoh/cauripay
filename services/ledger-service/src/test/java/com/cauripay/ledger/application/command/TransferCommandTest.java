package com.cauripay.ledger.application.command;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransferCommandTest {

    private static final UUID FROM = UUID.randomUUID();
    private static final UUID TO = UUID.randomUUID();
    private static final UUID FEES = UUID.randomUUID();

    private static TransferCommand valid() {
        return new TransferCommand("key-1", UUID.randomUUID(), FROM, TO,
            new BigDecimal("100.00"), null, null, "P2P", null);
    }

    @Test
    void acceptsValidCommand() {
        final TransferCommand command = valid();
        assertThat(command.amount()).isEqualByComparingTo("100.00");
        assertThat(command.effectiveFee()).isEqualByComparingTo("0.00");
    }

    @Test
    void rejectsSameWallet() {
        assertThatThrownBy(() -> new TransferCommand("key-1", UUID.randomUUID(), FROM, FROM,
            new BigDecimal("10"), null, null, null, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("différents");
    }

    @Test
    void rejectsNegativeFee() {
        assertThatThrownBy(() -> new TransferCommand("key-1", UUID.randomUUID(), FROM, TO,
            new BigDecimal("10"), new BigDecimal("-1"), FEES, null, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("négatif");
    }

    @Test
    void normalizesScaleToTwoDecimals() {
        final TransferCommand command = new TransferCommand("key-1", UUID.randomUUID(), FROM, TO,
            new BigDecimal("100.555"), null, null, null, null);
        assertThat(command.amount()).isEqualByComparingTo("100.56");
    }

    @Test
    void rejectsNullMandatoryFields() {
        assertThatThrownBy(() -> new TransferCommand(null, UUID.randomUUID(), FROM, TO,
            new BigDecimal("10"), null, null, null, null))
            .isInstanceOf(NullPointerException.class);
    }
}
