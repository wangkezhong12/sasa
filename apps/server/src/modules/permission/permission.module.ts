import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { AuditService } from './audit.service';
import { ConnectorModule } from '../connector/connector.module';
import { CryptoService } from '../../common/crypto/crypto.service';

@Module({
  imports: [ConnectorModule],
  providers: [PermissionService, AuditService, CryptoService],
  exports: [PermissionService, AuditService],
})
export class PermissionModule {}
