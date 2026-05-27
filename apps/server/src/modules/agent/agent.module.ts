import { Module, forwardRef } from '@nestjs/common';
import { AgentService } from './agent.service';
import { LLMConfigService } from './llm-config.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ContextManagerService } from './context-manager.service';
import { ConfirmationManager } from './confirmation-manager.service';
import { ToolRegistryService } from './tool-registry.service';
import { ConnectorModule } from '../connector/connector.module';
import { PermissionModule } from '../permission/permission.module';
import { AuthModule } from '../auth/auth.module';
import { CryptoService } from '../../common/crypto/crypto.service';

@Module({
  imports: [ConnectorModule, PermissionModule, forwardRef(() => AuthModule)],
  providers: [
    AgentService,
    LLMConfigService,
    PromptBuilderService,
    ContextManagerService,
    ConfirmationManager,
    ToolRegistryService,
    CryptoService,
  ],
  exports: [AgentService, ConfirmationManager],
})
export class AgentModule {}
