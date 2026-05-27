import { Module, forwardRef } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { AuditService } from './audit.service';
import { ConnectorModule } from '../connector/connector.module';
import { AuthModule } from '../auth/auth.module';
import { CryptoService } from '../../common/crypto/crypto.service';

@Module({
  imports: [ConnectorModule, forwardRef(() => AuthModule)],
  providers: [PermissionService, AuditService, CryptoService],
  exports: [PermissionService, AuditService],
})
export class PermissionModule {}
