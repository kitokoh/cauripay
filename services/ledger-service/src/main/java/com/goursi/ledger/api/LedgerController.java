package com.goursi.ledger.api;

import com.goursi.ledger.api.dto.BalanceResponse;
import com.goursi.ledger.api.dto.CreditRequest;
import com.goursi.ledger.api.dto.DebitRequest;
import com.goursi.ledger.api.dto.LedgerEntryDto;
import com.goursi.ledger.api.dto.ReverseRequest;
import com.goursi.ledger.api.dto.TransferRequest;
import com.goursi.ledger.api.dto.TransferResponse;
import com.goursi.ledger.api.dto.VerifyResponse;
import com.goursi.ledger.api.mapper.LedgerMapper;
import com.goursi.ledger.application.LedgerReadService;
import com.goursi.ledger.application.LedgerVerifyService;
import com.goursi.ledger.application.LedgerWriteService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * API interne du ledger — JAMAIS exposée publiquement.
 * Toutes les routes exigent X-Service-Key (ServiceKeyFilter).
 */
@RestController
@RequestMapping("/internal/ledger")
public class LedgerController {

  private final LedgerWriteService writeService;
  private final LedgerReadService readService;
  private final LedgerVerifyService verifyService;
  private final LedgerMapper mapper;

  public LedgerController(
      LedgerWriteService writeService,
      LedgerReadService readService,
      LedgerVerifyService verifyService,
      LedgerMapper mapper) {
    this.writeService = writeService;
    this.readService = readService;
    this.verifyService = verifyService;
    this.mapper = mapper;
  }

  /** Transfert atomique : 4 écritures, tout ou rien. */
  @PostMapping("/transfer")
  @ResponseStatus(HttpStatus.CREATED)
  public TransferResponse transfer(@Valid @RequestBody TransferRequest request) {
    return mapper.toTransferResponse(writeService.transferAtomic(mapper.toTransferCommand(request)));
  }

  /** Crédit unitaire (cash-in). */
  @PostMapping("/credit")
  @ResponseStatus(HttpStatus.CREATED)
  public LedgerEntryDto credit(@Valid @RequestBody CreditRequest request) {
    return mapper.toEntryDto(writeService.credit(mapper.toCreditCommand(request)));
  }

  /** Débit unitaire (cash-out). */
  @PostMapping("/debit")
  @ResponseStatus(HttpStatus.CREATED)
  public LedgerEntryDto debit(@Valid @RequestBody DebitRequest request) {
    return mapper.toEntryDto(writeService.debit(mapper.toDebitCommand(request)));
  }

  /** Reversal : écritures miroir. */
  @PostMapping("/reverse")
  @ResponseStatus(HttpStatus.CREATED)
  public TransferResponse reverse(@Valid @RequestBody ReverseRequest request) {
    return mapper.toTransferResponse(
        writeService.reverse(request.originalTransactionId(), request.reason(), request.idempotencyKey()));
  }

  /** Solde courant (404 si wallet inconnu). */
  @GetMapping("/balance/{walletId}")
  public BalanceResponse balance(@PathVariable UUID walletId) {
    return mapper.toBalanceResponse(readService.getBalance(walletId));
  }

  /** Historique paginé (le plus récent d'abord). */
  @GetMapping("/history/{walletId}")
  public List<LedgerEntryDto> history(
      @PathVariable UUID walletId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return readService.history(walletId, PageRequest.of(page, Math.min(size, 200)))
        .stream().map(mapper::toEntryDto).toList();
  }

  /** Entrées d'une transaction. */
  @GetMapping("/transactions/{transactionId}/entries")
  public List<LedgerEntryDto> transactionEntries(@PathVariable UUID transactionId) {
    return readService.byTransaction(transactionId).stream().map(mapper::toEntryDto).toList();
  }

  /** Contrôle d'intégrité COBAC : SUM(CREDIT) - SUM(DEBIT) == solde pour chaque wallet. */
  @GetMapping("/verify")
  public VerifyResponse verify() {
    LedgerVerifyService.VerifyReport report = verifyService.verifyAll();
    return new VerifyResponse(report.balanced(), report.walletsChecked(),
        report.discrepancies().stream()
            .map(d -> new VerifyResponse.DiscrepancyDto(
                d.walletId(), d.storedBalance(), d.computedBalance(), d.delta()))
            .toList());
  }
}
