package com.goursi.ledger.api.mapper;

import com.goursi.ledger.api.dto.BalanceResponse;
import com.goursi.ledger.api.dto.CreditRequest;
import com.goursi.ledger.api.dto.DebitRequest;
import com.goursi.ledger.api.dto.LedgerEntryDto;
import com.goursi.ledger.api.dto.TransferRequest;
import com.goursi.ledger.api.dto.TransferResponse;
import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.result.BalanceResult;
import com.goursi.ledger.domain.result.LedgerEntryResponse;
import com.goursi.ledger.domain.result.TransferResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapping DTOs API ↔ records de domaine (MapStruct).
 * Les montants restent BigDecimal — jamais de double/float.
 */
@Mapper(componentModel = "spring")
public interface LedgerMapper {

  TransferCommand toTransferCommand(TransferRequest request);

  CreditCommand toCreditCommand(CreditRequest request);

  DebitCommand toDebitCommand(DebitRequest request);

  TransferResponse toTransferResponse(TransferResult result);

  BalanceResponse toBalanceResponse(BalanceResult result);

  LedgerEntryDto toEntryDto(LedgerEntryResponse response);
}
