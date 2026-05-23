import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { llmConfigs } from '../../common/database/schema';
import { CryptoService } from '../../common/crypto/crypto.service';
import { LLMProvider } from '@sasa/shared';

export interface ResolvedLLMConfig {
  providerId: LLMProvider;
  modelId: string;
  apiKey: string;
  baseUrl: string | null;
}

@Injectable()
export class LLMConfigService {
  constructor(
    @Inject(DB) private db: any,
    private crypto: CryptoService,
  ) {}

  async resolve(userId: string, workspaceId?: string): Promise<ResolvedLLMConfig> {
    let config = await this.findActive('user', userId);
    if (!config && workspaceId) {
      config = await this.findActive('workspace', workspaceId);
    }
    if (!config) {
      throw new BadRequestException('LLM not configured. Please set up your API key in settings.');
    }
    return {
      providerId: config.providerId as LLMProvider,
      modelId: config.modelId,
      apiKey: this.crypto.decrypt(config.apiKeyEncrypted),
      baseUrl: config.baseUrl,
    };
  }

  private async findActive(scope: string, scopeId: string) {
    const [row] = await this.db.select({
      providerId: llmConfigs.providerId,
      modelId: llmConfigs.modelId,
      apiKeyEncrypted: llmConfigs.apiKeyEncrypted,
      baseUrl: llmConfigs.baseUrl,
    }).from(llmConfigs)
      .where(and(eq(llmConfigs.scope, scope), eq(llmConfigs.scopeId, scopeId), eq(llmConfigs.isActive, true)));
    return row || null;
  }
}
