import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SandboxService } from './sandbox.service';
import { SandboxController } from './sandbox.controller';

@Module({
  imports: [WebhooksModule],
  controllers: [SandboxController],
  providers: [SandboxService],
  exports: [SandboxService],
})
export class SandboxModule {}
