import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { SaaSBindingController } from './saas-binding.controller';
import { SaaSBindingService } from './saas-binding.service';
import { CryptoService } from '../../common/crypto/crypto.service';

const jwtSecret = process.env.NEXTAUTH_SECRET || 'dev-secret';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, WorkspaceController, SaaSBindingController],
  providers: [
    AuthService, JwtStrategy, WorkspaceService, SaaSBindingService, CryptoService,
    { provide: 'JWT_SECRET', useValue: jwtSecret },
  ],
  exports: [AuthService, JwtModule, SaaSBindingService],
})
export class AuthModule {}
