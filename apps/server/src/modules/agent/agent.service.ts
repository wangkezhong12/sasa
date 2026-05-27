import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { generateText, CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { DB } from '../../common/database/database.module';
import { messages, saasConnectors, saasBindings } from '../../common/database/schema';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { PermissionService } from '../permission/permission.service';
import { AuditService } from '../permission/audit.service';
import { CredentialManager } from '../auth/credential-manager.service';
import { LLMConfigService, ResolvedLLMConfig } from './llm-config.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ContextManagerService } from './context-manager.service';
import { ConfirmationManager, ConfirmationResult } from './confirmation-manager.service';
import { ToolRegistryService, ToolDefRow } from './tool-registry.service';
import { MAX_TOOL_CALL_STEPS } from '@sasa/shared';

export interface ProcessMessageParams {
  userId: string;
  conversationId: string;
  message: string;
  connectorId: string;
  workspaceId?: string;
}

export interface AgentResponse {
  type: 'text' | 'tool_call' | 'confirmation_required' | 'error';
  content?: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  confirmationId?: string;
  riskLevel?: string;
  error?: string;
}

@Injectable()
export class AgentService {
  constructor(
    @Inject(DB) private db: any,
    private llmConfigService: LLMConfigService,
    private promptBuilder: PromptBuilderService,
    private contextManager: ContextManagerService,
    private confirmationManager: ConfirmationManager,
    private toolRegistry: ToolRegistryService,
    private permissionService: PermissionService,
    private auditService: AuditService,
    private connectorRegistry: ConnectorRegistry,
    private credentialManager: CredentialManager,
  ) {}

  async processMessage(params: ProcessMessageParams): Promise<AgentResponse> {
    try {
      // 1. Load LLM config
      const llmConfig = await this.llmConfigService.resolve(params.userId, params.workspaceId);

      // 2. Load and filter tools by permissions
      const allTools = await this.toolRegistry.getToolsForConnector(params.connectorId);
      const permissions = await this.permissionService.getPermissions(params.userId, params.connectorId);
      const filteredTools = this.permissionService.filterTools(allTools, permissions);
      const thresholdedTools = this.toolRegistry.filterByThreshold(filteredTools);
      const aiTools = this.toolRegistry.toAITools(thresholdedTools);

      // 3. Build context
      const history = await this.loadHistory(params.conversationId);
      const trimmed = this.contextManager.trim(history);
      const connectorInfo = await this.getConnectorInfo(params.connectorId);
      const bindingInfo = await this.getBindingInfo(params.userId, params.connectorId);

      const systemPrompt = this.promptBuilder.buildSystemPrompt({
        saasName: connectorInfo?.name || 'Unknown SaaS',
        userName: bindingInfo?.saasUsername || 'User',
        userRole: 'user',
      });

      // 4. Save user message
      await this.saveMessage(params.conversationId, 'user', params.message);

      // 5. Build messages array
      const messagesWithContext: CoreMessage[] = [
        ...trimmed.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content || '',
        })),
        { role: 'user' as const, content: params.message },
      ];

      // 6. Call LLM with generateText (synchronous — streaming will be added in chunk-7 Chat Gateway)
      const model = this.loadModel(llmConfig);
      const result = await generateText({
        model: model as any,
        system: systemPrompt,
        messages: messagesWithContext,
        tools: aiTools as any,
        maxSteps: MAX_TOOL_CALL_STEPS,
      });

      const responseText = result.text;
      const steps = result.steps;

      // 7. Process tool calls from steps
      // Execute all read-risk tools immediately.
      // For the first high-risk tool, create a confirmation and return.
      for (const step of steps) {
        for (const toolCall of step.toolCalls) {
          const toolDef = thresholdedTools.find((t) => t.name === toolCall.toolName);
          const riskLevel = toolDef?.riskLevel || 'write';

          if (riskLevel === 'write' || riskLevel === 'delete') {
            // High-risk: create confirmation, return to client
            const confirmationId = this.confirmationManager.createId();
            this.confirmationManager.register(confirmationId, params.userId);

            await this.saveMessage(
              params.conversationId,
              'assistant',
              `请求执行工具: ${toolCall.toolName}，等待用户确认。`,
            );

            return {
              type: 'confirmation_required',
              toolName: toolCall.toolName,
              toolArguments: toolCall.args as Record<string, unknown>,
              confirmationId,
              riskLevel,
            };
          }

          // Low-risk: execute directly
          await this.executeToolCall(
            params.userId,
            params.conversationId,
            params.connectorId,
            toolCall.toolName,
            toolCall.args as Record<string, unknown>,
            toolDef,
          );
        }
      }

      // 8. No high-risk tool calls — save and return LLM text
      await this.saveMessage(params.conversationId, 'assistant', responseText);

      return {
        type: 'text',
        content: responseText,
      };
    } catch (err) {
      return this.handleError(err);
    }
  }

  async handleConfirmation(
    confirmationId: string,
    action: 'confirm' | 'cancel' | 'modify',
    params: {
      userId: string;
      conversationId: string;
      connectorId: string;
      toolName: string;
      toolArguments: Record<string, unknown>;
      modifiedParameters?: Record<string, unknown>;
    },
  ): Promise<AgentResponse> {
    if (!this.confirmationManager.has(confirmationId)) {
      return { type: 'error', error: 'Confirmation not found or expired' };
    }

    if (!this.confirmationManager.verifyOwnership(confirmationId, params.userId)) {
      return { type: 'error', error: 'Confirmation does not belong to this user' };
    }

    if (action === 'cancel') {
      this.confirmationManager.cancel(confirmationId);
      await this.saveMessage(params.conversationId, 'assistant', '操作已取消。');
      return { type: 'text', content: '操作已取消。' };
    }

    // Resolve the pending confirmation
    this.confirmationManager.resolve(confirmationId, {
      action,
      modifiedParameters: action === 'modify' ? params.modifiedParameters : undefined,
    });

    const finalParams = action === 'modify' && params.modifiedParameters
      ? params.modifiedParameters
      : params.toolArguments;

    // Execute the tool
    const toolDefs = await this.toolRegistry.getToolsForConnector(params.connectorId);
    const toolDef = toolDefs.find((t) => t.name === params.toolName);

    return this.executeToolCall(
      params.userId,
      params.conversationId,
      params.connectorId,
      params.toolName,
      finalParams,
      toolDef,
    );
  }

  private async executeToolCall(
    userId: string,
    conversationId: string,
    connectorId: string,
    toolName: string,
    args: Record<string, unknown>,
    toolDef: ToolDefRow | undefined,
  ): Promise<AgentResponse> {
    try {
      const connector = this.connectorRegistry.get(connectorId);
      const authHeaders = await this.credentialManager.getValidAuthHeaders(userId, connectorId);
      const toolResult = await connector.executeToolCall(toolName, args, authHeaders);

      // Audit log — redact known sensitive parameter names
      await this.auditService.log({
        userId,
        conversationId,
        toolName,
        saasEndpoint: toolDef?.apiMappingJson
          ? `${(toolDef.apiMappingJson as any).method} ${(toolDef.apiMappingJson as any).path}`
          : toolName,
        requestJson: this.sanitizeArgs(args),
        responseStatus: toolResult.success ? 200 : 500,
        responseJson: toolResult.success ? toolResult.data : undefined,
      });

      const responseText = toolResult.success
        ? `工具 ${toolName} 执行成功。${toolResult.data ? JSON.stringify(toolResult.data) : ''}`
        : `工具 ${toolName} 执行失败: ${toolResult.error?.message || 'Unknown error'}`;

      await this.saveMessage(conversationId, 'tool', responseText);

      return {
        type: toolResult.success ? 'text' : 'error',
        content: toolResult.success ? responseText : undefined,
        error: toolResult.success ? undefined : responseText,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { type: 'error', error: `Tool execution failed: ${msg}` };
    }
  }

  private handleError(err: unknown): AgentResponse {
    if (err && typeof err === 'object') {
      const status = (err as any).status || (err as any).statusCode;
      if (status === 401 || status === 403) {
        return { type: 'error', error: 'llm_auth_error' };
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { type: 'error', error: 'Internal error. Please try again.' };
  }

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'credential', 'auth'];
    const sanitized = { ...args };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private async loadHistory(conversationId: string): Promise<{ role: string; content: string | null }[]> {
    return this.db.select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  private async saveMessage(conversationId: string, role: string, content: string | null) {
    await this.db.insert(messages).values({ conversationId, role, content });
  }

  private async getConnectorInfo(connectorId: string) {
    const [row] = await this.db.select({ name: saasConnectors.name })
      .from(saasConnectors)
      .where(eq(saasConnectors.id, connectorId));
    return row;
  }

  private async getBindingInfo(userId: string, connectorId: string) {
    const [row] = await this.db.select({ saasUsername: saasBindings.saasUsername })
      .from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
    return row;
  }

  private loadModel(config: ResolvedLLMConfig) {
    switch (config.providerId) {
      case 'openai': {
        const openai = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl || undefined });
        return openai(config.modelId);
      }
      case 'anthropic': {
        const anthropic = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseUrl || undefined });
        return anthropic(config.modelId);
      }
      case 'deepseek': {
        const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl || 'https://api.deepseek.com' });
        return provider(config.modelId);
      }
      default: {
        // custom provider — baseUrl is required
        if (!config.baseUrl) {
          throw new Error('Custom LLM provider requires a base URL');
        }
        const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
        return provider(config.modelId);
      }
    }
  }
}
