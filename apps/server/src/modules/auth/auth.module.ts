import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { SaaSBindingController } from './saas-binding.controller';
import { SaaSBindingService } from './saas-binding.service';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { CredentialManager } from './credential-manager.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorModule } from '../connector/connector.module';

const jwtSecret = process.env.NEXTAUTH_SECRET || 'dev-secret';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    forwardRef(() => ConnectorModule),
  ],
  controllers: [AuthController, WorkspaceController, SaaSBindingController],
  providers: [
    AuthService, JwtStrategy, WorkspaceService, SaaSBindingService,
    AuthStrategyResolver, CredentialManager, CryptoService,
    { provide: 'JWT_SECRET', useValue: jwtSecret },
  ],
  exports: [AuthService, JwtModule, SaaSBindingService, CredentialManager],
})
export class AuthModule {}
