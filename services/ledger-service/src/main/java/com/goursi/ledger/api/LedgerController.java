package com.goursi.ledger.api;

import com.goursi.ledger.api.dto.BalanceResponse;
import com.goursi.ledger.api.dto.EntryResponse;
import com.goursi.ledger.api.dto.ReverseRequest;
import com.goursi.ledger.api.dto.TransferRequest;
import com.goursi.ledger.api.dto.TransferResponse;
import com.goursi.ledger.api.dto.VerifyRequest;
import com.goursi.ledger.application.LedgerReadService;
import com.goursi.ledger.application.LedgerVerifyService;
import com.goursi.ledger.application.LedgerWriteService;
import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.model.EntryType;
import com.goursi.ledger.domain.model.LedgerEntry;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * API interne (réseau Docker uniquement — jamais exposée publiquement).
 * Protégée par X-Service-Key (ServiceKeyFilter).
 */
@RestController
@RequestMapping("/internal/ledger")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerWriteService writeService;
    private final LedgerReadService readService;
    private final LedgerVerifyService verifyService;

    @PostMapping("/transfer")
    public ResponseEntity<TransferResponse> transfer(@Valid @RequestBody TransferRequest req) {
        TransferCommand cmd = new TransferCommand(
                req.idempotencyKey(), req.transactionId(), req.fromWalletId(), req.toWalletId(),
                req.amount(), req.feeAmount(), req.platformFeesWalletId(), req.description());
        var result = writeService.transferAtomic(cmd);
        return ResponseEntity.ok(new TransferResponse(
                result.transactionId(),
                result.entries().stream().map(this::toEntryDto).toList(),
                result.fromBalance(), result.toBalance()));
    }

    @PostMapping("/credit")
    public ResponseEntity<EntryResponse> credit(
            @RequestParam UUID idempotencyKey,
            @RequestParam UUID walletId,
            @RequestParam java.math.BigDecimal amount,
            @RequestParam UUID transactionId) {
        var entry = writeService.credit(new CreditCommand(idempotencyKey, walletId, amount, transactionId, EntryType.PRINCIPAL));
        return ResponseEntity.ok(new EntryResponse(entry.id(), entry.balanceBefore(), entry.balanceAfter()));
    }

    @PostMapping("/debit")
    public ResponseEntity<EntryResponse> debit(
            @RequestParam UUID idempotencyKey,
            @RequestParam UUID walletId,
            @RequestParam java.math.BigDecimal amount,
            @RequestParam UUID transactionId) {
        var entry = writeService.debit(new DebitCommand(idempotencyKey, walletId, amount, transactionId, EntryType.PRINCIPAL));
        return ResponseEntity.ok(new EntryResponse(entry.id(), entry.balanceBefore(), entry.balanceAfter()));
    }

    @PostMapping("/reverse")
    public ResponseEntity<TransferResponse> reverse(@Valid @RequestBody ReverseRequest req) {
        var result = writeService.reverse(req.originalTransactionId(), req.reason(), req.idempotencyKey());
        return ResponseEntity.ok(new TransferResponse(
                result.transactionId(),
                result.entries().stream().map(this::toEntryDto).toList(),
                result.fromBalance(), result.toBalance()));
    }

    @GetMapping("/balance/{walletId}")
    public ResponseEntity<BalanceResponse> balance(@PathVariable UUID walletId) {
        var b = readService.getBalance(walletId);
        return ResponseEntity.ok(new BalanceResponse(
                b.walletId(), b.balance(), b.frozenBalance(), b.availableBalance(), b.version()));
    }

    @GetMapping("/entries/{walletId}")
    public ResponseEntity<List<LedgerEntry>> history(
            @PathVariable UUID walletId,
            @RequestParam(required = false) OffsetDateTime cursor,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(readService.getHistory(walletId, cursor, limit));
    }

    @PostMapping("/verify")
    public ResponseEntity<LedgerVerifyService.VerifyResult> verify(@Valid @RequestBody VerifyRequest req) {
        return ResponseEntity.ok(verifyService.verify(req.walletId()));
    }

    private TransferResponse.EntryDto toEntryDto(LedgerEntry e) {
        return new TransferResponse.EntryDto(
                e.getId(), e.getWalletId(), e.getDirection().name(), e.getAmount(),
                e.getBalanceBefore(), e.getBalanceAfter(), e.getEntryType().name(), e.getDescription());
    }
}
