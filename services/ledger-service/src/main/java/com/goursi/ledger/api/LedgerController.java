package com.goursi.ledger.api;

import com.goursi.ledger.api.dto.BalanceResponse;
import com.goursi.ledger.api.dto.EntryResponse;
import com.goursi.ledger.api.dto.ReverseRequest;
import com.goursi.ledger.api.dto.TransferRequest;
import com.goursi.ledger.api.dto.TransferResponse;
import com.goursi.ledger.api.dto.VerifyRequest;
import com.goursi.ledger.api.mapper.LedgerMapper;
import com.goursi.ledger.application.LedgerReadService;
import com.goursi.ledger.application.LedgerVerifyService;
import com.goursi.ledger.application.LedgerWriteService;
import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.ReverseCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.model.LedgerEntry.EntryType;
import com.goursi.ledger.domain.result.BalanceResult;
import com.goursi.ledger.domain.result.LedgerEntryResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * GOURSI-015b — API interne du ledger (réseau Docker interne uniquement,
 * protégée par X-Service-Key). Règle absolue : seuls ces endpoints modifient
 * les soldes.
 */
@RestController
@RequestMapping("/internal/ledger")
public class LedgerController {

    private final LedgerWriteService writeService;
    private final LedgerReadService readService;
    private final LedgerVerifyService verifyService;
    private final LedgerMapper mapper;

    public LedgerController(LedgerWriteService writeService, LedgerReadService readService,
                            LedgerVerifyService verifyService, LedgerMapper mapper) {
        this.writeService = writeService;
        this.readService = readService;
        this.verifyService = verifyService;
        this.mapper = mapper;
    }

    @PostMapping("/transfer")
    public TransferResponse transfer(@Valid @RequestBody TransferRequest request) {
        TransferCommand cmd = mapper.toCommand(request);
        return mapper.toTransferResponse(writeService.transferAtomic(cmd));
    }

    @PostMapping("/credit")
    public EntryResponse credit(@Valid @RequestBody CreditRequest request) {
        LedgerEntryResponse r = writeService.credit(new CreditCommand(
            request.idempotencyKey(), request.walletId(), request.amount(), request.transactionId(),
            EntryType.valueOf(request.entryType()), request.description()));
        return new EntryResponse(r.id(), request.transactionId(), request.walletId(), "CREDIT",
            request.amount(), r.balanceBefore(), r.balanceAfter(), request.entryType(), request.description(), null);
    }

    @PostMapping("/debit")
    public EntryResponse debit(@Valid @RequestBody DebitRequest request) {
        LedgerEntryResponse r = writeService.debit(new DebitCommand(
            request.idempotencyKey(), request.walletId(), request.amount(), request.transactionId(),
            EntryType.valueOf(request.entryType()), request.description()));
        return new EntryResponse(r.id(), request.transactionId(), request.walletId(), "DEBIT",
            request.amount(), r.balanceBefore(), r.balanceAfter(), request.entryType(), request.description(), null);
    }

    @PostMapping("/reverse")
    public Map<String, Object> reverse(@Valid @RequestBody ReverseRequest request) {
        writeService.reverse(new ReverseCommand(request.idempotencyKey(), request.originalTransactionId(), request.reason()));
        return Map.of("success", true);
    }

    @GetMapping("/balance/{walletId}")
    public BalanceResponse balance(@PathVariable UUID walletId) {
        BalanceResult r = readService.getBalance(walletId);
        return mapper.toBalanceResponse(r);
    }

    @GetMapping("/entries/{walletId}")
    public Map<String, Object> entries(@PathVariable UUID walletId,
                                       @RequestParam(required = false) String cursor,
                                       @RequestParam(defaultValue = "25") int limit) {
        Instant before = cursor == null ? null : Instant.parse(cursor);
        List<EntryResponse> entries = mapper.toEntryResponses(readService.getHistory(walletId, before, limit));
        String next = entries.isEmpty() ? null
            : entries.get(entries.size() - 1).createdAt() == null ? null : entries.get(entries.size() - 1).createdAt().toString();
        return Map.of("entries", entries, "next_cursor", next);
    }

    @PostMapping("/verify")
    public Map<String, Object> verify(@Valid @RequestBody VerifyRequest request) {
        LedgerVerifyService.Verification v = verifyService.verify(request.walletId());
        return Map.of("consistent", v.consistent(), "computed", v.computed(), "stored", v.stored(), "delta", v.delta());
    }

    // ---- DTOs locaux (unitaires) ----

    public record CreditRequest(UUID idempotencyKey, UUID walletId, java.math.BigDecimal amount,
                                UUID transactionId, String entryType, String description) {}
    public record DebitRequest(UUID idempotencyKey, UUID walletId, java.math.BigDecimal amount,
                               UUID transactionId, String entryType, String description) {}
}
