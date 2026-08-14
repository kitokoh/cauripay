package com.goursi.ledger.domain;

import com.goursi.ledger.domain.command.TransferCommand;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CommandTest {

    @Test
    void transferCommand_rejects_more_than_2_decimals() {
        assertThrows(IllegalArgumentException.class, () -> new TransferCommand(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                new BigDecimal("100.001"), BigDecimal.ZERO, UUID.randomUUID(), null));
    }

    @Test
    void transferCommand_rejects_same_wallet() {
        UUID wallet = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> new TransferCommand(
                UUID.randomUUID(), UUID.randomUUID(), wallet, wallet,
                new BigDecimal("100.00"), BigDecimal.ZERO, UUID.randomUUID(), null));
    }

    @Test
    void transferCommand_accepts_valid() {
        TransferCommand cmd = new TransferCommand(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                new BigDecimal("100.00"), new BigDecimal("10.00"), UUID.randomUUID(), "Envoi P2P");
        assertTrue(cmd.amount().compareTo(BigDecimal.ZERO) > 0);
    }
}
