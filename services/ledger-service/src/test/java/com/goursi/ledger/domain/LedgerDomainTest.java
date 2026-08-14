package com.goursi.ledger.domain;

import com.goursi.ledger.domain.model.EntryType;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerDirection;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class LedgerEntryTest {

    @Test
    void create_computes_balance_after_credit() {
        LedgerEntry e = LedgerEntry.create(
                UUID.randomUUID(), UUID.randomUUID(), LedgerDirection.CREDIT,
                new BigDecimal("100.00"), new BigDecimal("500.00"), EntryType.PRINCIPAL, "Crédit");
        assertEquals(new BigDecimal("600.00"), e.getBalanceAfter());
        assertEquals(new BigDecimal("100.00"), e.getAmount());
    }

    @Test
    void create_computes_balance_after_debit() {
        LedgerEntry e = LedgerEntry.create(
                UUID.randomUUID(), UUID.randomUUID(), LedgerDirection.DEBIT,
                new BigDecimal("100.00"), new BigDecimal("500.00"), EntryType.FEE, "Frais");
        assertEquals(new BigDecimal("400.00"), e.getBalanceAfter());
    }

    @Test
    void create_forces_scale_to_2() {
        LedgerEntry e = LedgerEntry.create(
                UUID.randomUUID(), UUID.randomUUID(), LedgerDirection.CREDIT,
                new BigDecimal("100.005"), new BigDecimal("500.00"), EntryType.PRINCIPAL, "Test");
        assertEquals(2, e.getAmount().scale());
        assertEquals(new BigDecimal("100.01"), e.getAmount()); // HALF_UP
    }
}

class LedgerBalanceTest {

    @Test
    void credit_increases_balance() {
        LedgerBalance b = LedgerBalance.open(UUID.randomUUID());
        b.credit(new BigDecimal("100.00"));
        assertEquals(new BigDecimal("100.00"), b.getBalance());
        assertEquals(new BigDecimal("100.00"), b.getAvailableBalance());
    }

    @Test
    void debit_decreases_balance() {
        LedgerBalance b = LedgerBalance.open(UUID.randomUUID());
        b.credit(new BigDecimal("500.00"));
        b.debit(new BigDecimal("200.00"));
        assertEquals(new BigDecimal("300.00"), b.getBalance());
    }

    @Test
    void debit_throws_when_insufficient() {
        LedgerBalance b = LedgerBalance.open(UUID.randomUUID());
        b.credit(new BigDecimal("100.00"));
        assertThrows(InsufficientFundsException.class, () -> b.debit(new BigDecimal("101.00")));
    }

    @Test
    void credit_rejects_non_positive() {
        LedgerBalance b = LedgerBalance.open(UUID.randomUUID());
        assertThrows(IllegalArgumentException.class, () -> b.credit(BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> b.credit(new BigDecimal("-5")));
    }

    @Test
    void frozen_balance_reduces_available() {
        LedgerBalance b = LedgerBalance.open(UUID.randomUUID());
        b.credit(new BigDecimal("1000.00"));
        assertEquals(new BigDecimal("1000.00"), b.getAvailableBalance());
    }
}
