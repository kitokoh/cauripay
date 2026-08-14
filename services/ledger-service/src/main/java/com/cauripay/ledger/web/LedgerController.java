package com.cauripay.ledger.web;

import com.cauripay.ledger.application.CheckpointScheduler;
import com.cauripay.ledger.application.LedgerReadService;
import com.cauripay.ledger.application.LedgerVerifyService;
import com.cauripay.ledger.application.LedgerWriteService;
import com.cauripay.ledger.application.result.BalanceResult;
import com.cauripay.ledger.application.result.LedgerEntryView;
import com.cauripay.ledger.application.result.TransferResult;
import com.cauripay.ledger.web.dto.BalanceResponse;
import com.cauripay.ledger.web.dto.CreditRequest;
import com.cauripay.ledger.web.dto.DebitRequest;
import com.cauripay.ledger.web.dto.LedgerEntryResponse;
import com.cauripay.ledger.web.dto.ReverseRequest;
import com.cauripay.ledger.web.dto.TransferRequest;
import com.cauripay.ledger.web.dto.TransferResponse;
import com.cauripay.ledger.web.dto.VerifyResponse;
import com.cauripay.ledger.web.mapper.LedgerMapper;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * API interne du ledger (GOURSI-015b) — {@code /internal/ledger/*}.
 * Protégée par X-Service-Key (ServiceKeyFilter) ; jamais exposée publiquement.
 */
@RestController
@RequestMapping("/internal/ledger")
public class LedgerController {

    private final LedgerWriteService writeService;
    private final LedgerReadService readService;
    private final LedgerVerifyService verifyService;
    private final CheckpointScheduler checkpointScheduler;
    private final LedgerMapper mapper;

    public LedgerController(
        LedgerWriteService writeService,
        LedgerReadService readService,
        LedgerVerifyService verifyService,
        CheckpointScheduler checkpointScheduler,
        LedgerMapper mapper) {
        this.writeService = writeService;
        this.readService = readService;
        this.verifyService = verifyService;
        this.checkpointScheduler = checkpointScheduler;
        this.mapper = mapper;
    }

    @PostMapping("/transfer")
    public TransferResponse transfer(@Valid @RequestBody TransferRequest request) {
        final TransferResult result = writeService.transfer(mapper.toCommand(request));
        return mapper.toResponse(result);
    }

    @PostMapping("/credit")
    public TransferResponse credit(@Valid @RequestBody CreditRequest request) {
        return mapper.toResponse(writeService.credit(mapper.toCommand(request)));
    }

    @PostMapping("/debit")
    public TransferResponse debit(@Valid @RequestBody DebitRequest request) {
        return mapper.toResponse(writeService.debit(mapper.toCommand(request)));
    }

    @PostMapping("/reverse")
    public TransferResponse reverse(@Valid @RequestBody ReverseRequest request) {
        return mapper.toResponse(writeService.reverse(mapper.toCommand(request)));
    }

    @GetMapping("/wallets/{walletId}/balance")
    public BalanceResponse balance(@PathVariable UUID walletId) {
        final BalanceResult result = readService.balance(walletId);
        return mapper.toResponse(result);
    }

    @GetMapping("/wallets/{walletId}/history")
    public List<LedgerEntryResponse> history(
        @PathVariable UUID walletId,
        @RequestParam(defaultValue = "50") int limit,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant before) {
        final List<LedgerEntryView> history = readService.history(walletId, limit, before);
        return history.stream().map(mapper::toViewResponse).toList();
    }

    @GetMapping("/verify")
    public VerifyResponse verify() {
        return mapper.toResponse(verifyService.verify());
    }

    /** Snapshot immédiat (ops) — rarement appelé en dehors du cron nightly. */
    @PostMapping("/checkpoint")
    public ResponseEntity<Void> checkpoint() {
        checkpointScheduler.snapshotNow();
        return ResponseEntity.accepted().build();
    }
}
