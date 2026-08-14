package com.cauripay.ledger.web.mapper;

import com.cauripay.ledger.application.command.CreditCommand;
import com.cauripay.ledger.application.command.DebitCommand;
import com.cauripay.ledger.application.command.ReverseCommand;
import com.cauripay.ledger.application.command.TransferCommand;
import com.cauripay.ledger.application.result.BalanceResult;
import com.cauripay.ledger.application.result.LedgerEntryView;
import com.cauripay.ledger.application.result.TransferResult;
import com.cauripay.ledger.domain.LedgerEntry;
import com.cauripay.ledger.web.dto.BalanceResponse;
import com.cauripay.ledger.web.dto.CreditRequest;
import com.cauripay.ledger.web.dto.DebitRequest;
import com.cauripay.ledger.web.dto.LedgerEntryResponse;
import com.cauripay.ledger.web.dto.ReverseRequest;
import com.cauripay.ledger.web.dto.TransferRequest;
import com.cauripay.ledger.web.dto.TransferResponse;
import com.cauripay.ledger.web.dto.VerifyResponse;
import org.mapstruct.Mapper;

import java.util.UUID;

/**
 * Mapper DTO ↔ domaine (MapStruct, GOURSI-015a).
 * Les UUID voyagent en string sur le fil (contrat partagé TS).
 */
@Mapper(componentModel = "spring")
public interface LedgerMapper {

    TransferCommand toCommand(TransferRequest request);

    CreditCommand toCommand(CreditRequest request);

    DebitCommand toCommand(DebitRequest request);

    ReverseCommand toCommand(ReverseRequest request);

    TransferResponse toResponse(TransferResult result);

    BalanceResponse toResponse(BalanceResult result);

    LedgerEntryResponse toResponse(LedgerEntry entry);

    LedgerEntryResponse toViewResponse(LedgerEntryView view);

    VerifyResponse toResponse(com.cauripay.ledger.application.LedgerVerifyService.VerifyReport report);

    /** String → UUID (MapStruct l'utilise automatiquement pour les champs String→UUID). */
    default UUID toUuid(String value) {
        return value == null ? null : UUID.fromString(value);
    }
}
