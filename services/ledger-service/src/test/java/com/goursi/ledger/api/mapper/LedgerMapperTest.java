package com.goursi.ledger.api.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.goursi.ledger.api.dto.TransferRequest;
import com.goursi.ledger.domain.command.TransferCommand;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LedgerMapperTest {

  private final LedgerMapper mapper = new LedgerMapperImpl();

  @Test
  void transferRequest_to_command_mapping_preserve_scale() {
    TransferRequest request = new TransferRequest(
        UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
        new BigDecimal("10000.00"), new BigDecimal("100.00"), UUID.randomUUID(), "Test");

    TransferCommand cmd = mapper.toTransferCommand(request);

    assertThat(cmd.amount()).isEqualByComparingTo("10000.00");
    assertThat(cmd.feeAmount()).isEqualByComparingTo("100.00");
    assertThat(cmd.totalDebit()).isEqualByComparingTo("10100.00");
  }

  @Test
  void transferRequest_sans_frais() {
    TransferRequest request = new TransferRequest(
        UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
        new BigDecimal("500"), null, null, null);

    TransferCommand cmd = mapper.toTransferCommand(request);

    assertThat(cmd.effectiveFee()).isEqualByComparingTo("0");
  }
}
