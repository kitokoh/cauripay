package com.goursi.ledger.api.mapper;

import com.goursi.ledger.api.dto.BalanceResponse;
import com.goursi.ledger.api.dto.EntryResponse;
import com.goursi.ledger.api.dto.TransferRequest;
import com.goursi.ledger.api.dto.TransferResponse;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.result.BalanceResult;
import com.goursi.ledger.domain.result.TransferResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/** GOURSI-015a · mapping MapStruct (montants scale 2 préservés). */
@Mapper(componentModel = "spring")
public interface LedgerMapper {

    TransferCommand toCommand(TransferRequest request);

    @Mapping(target = "transactionId", source = "transactionId")
    TransferResponse toTransferResponse(TransferResult result);

    default TransferResponse.EntryView toEntryView(LedgerEntry e) {
        if (e == null) return null;
        return new TransferResponse.EntryView(e.getId(), e.getWalletId(), e.getDirection().name(),
            e.getAmount(), e.getBalanceBefore(), e.getBalanceAfter(), e.getEntryType().name(), e.getDescription());
    }

    default List<TransferResponse.EntryView> toEntryViews(List<LedgerEntry> entries) {
        return entries.stream().map(this::toEntryView).toList();
    }

    BalanceResponse toBalanceResponse(BalanceResult result);

    EntryResponse toEntryResponse(LedgerEntry entry);

    default List<EntryResponse> toEntryResponses(List<LedgerEntry> entries) {
        return entries.stream().map(this::toEntryResponse).toList();
    }
}
