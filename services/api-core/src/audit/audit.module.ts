import { Module } from '@nestjs/common';
import { AuditTrailService } from './audit-trail.service';
import { AuditController } from './audit.controller';

@Module({
  providers: [AuditTrailService],
  controllers: [AuditController],
  exports: [AuditTrailService],
})
export class AuditModule {}
