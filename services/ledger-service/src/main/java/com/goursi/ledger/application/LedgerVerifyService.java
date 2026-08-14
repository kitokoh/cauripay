package com.goursi.ledger.application;

import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * GOURSI-016c — contrôle d'intégrité COBAC : SUM(credit) - SUM(debit) des
 * écritures doit égaler le solde stocké. Comparaisons BigDecimal par
 * compareTo (jamais ==/equals naïfs).
 */
@Service
@Transactional(readOnly = true)
public class LedgerVerifyService {

    private static final Logger log = LoggerFactory.getLogger(LedgerVerifyService.class);

    private final LedgerBalanceRepository balanceRepository;
    private final LedgerEntryRepository entryRepository;

    public LedgerVerifyService(LedgerBalanceRepository balanceRepository, LedgerEntryRepository entryRepository) {
        this.balanceRepository = balanceRepository;
        this.entryRepository = entryRepository;
    }

    public record Verification(boolean consistent, BigDecimal computed, BigDecimal stored, BigDecimal delta) {}

    public Verification verify(UUID walletId) {
        BigDecimal stored = balanceRepository.findById(walletId)
            .map(b -> b.getBalance())
            .orElseThrow(() -> new com.goursi.ledger.domain.exception.WalletNotFoundException(walletId.toString()));

        BigDecimal computed = entryRepository.findByWalletIdOrderByCreatedAtDesc(walletId,
                org.springframework.data.domain.PageRequest.of(0, Integer.MAX_VALUE)).stream()
            .map(e -> e.getDirection() == LedgerEntry.Direction.CREDIT ? e.getAmount() : e.getAmount().negate())
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);

        BigDecimal delta = computed.subtract(stored);
        return new Verification(delta.compareTo(BigDecimal.ZERO) == 0, computed, stored, delta);
    }
}
