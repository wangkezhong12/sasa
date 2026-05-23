import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { streamText, CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { DB } from '../../common/database/database.module';
import { messages, saasConnectors, saasBindings } from '../../common/database/schema';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PermissionService } from '../permission/permission.service';
import { AuditService } from '../permission/audit.service';
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
    private crypto: CryptoService,
  ) {}

  async processMessage(params: ProcessMessageParams): Promise<AgentResponse> {
    try {
      // 1. Load LLM config
      const llmConfig = await this.llmConfigService.resolve(params.userId, params.workspaceId);

      // 2. Load and filter tools
      const allTools = await this.toolRegistry.getToolsForConnector(params.connectorId);
      const permissions = await this.permissionService.getPermissions(params.userId, params.connectorId);
      const filteredTools = allTools.filter((t) => t.requiredPermission && permissions.includes(t.requiredPermission));
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

      // 5. Add user message to context
      const messagesWithContext: CoreMessage[] = [
        ...trimmed.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content || '',
        })),
        { role: 'user' as const, content: params.message },
      ];

      // 6. Call LLM
      const model = this.loadModel(llmConfig);
      const result = await streamText({
        model: model as any,
        system: systemPrompt,
        messages: messagesWithContext,
        tools: aiTools as any,
        maxSteps: MAX_TOOL_CALL_STEPS,
      });

      // 7. Process result
      const responseText = await result.text;
      const steps = await result.steps;

      if (steps && steps.length > 0) {
        for (const step of steps) {
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const toolCall of step.toolCalls) {
              // Find the tool definition for risk level
              const toolDef = thresholdedTools.find((t) => t.name === toolCall.toolName);
              const riskLevel = toolDef?.riskLevel || 'write';

              // For high-risk operations, require confirmation
              if (riskLevel === 'write' || riskLevel === 'delete') {
                const confirmationId = `confirm-${params.conversationId}-${Date.now()}`;

                // Save assistant message with tool call info
                await this.saveMessage(params.conversationId, 'assistant', responseText || null);

                return {
                  type: 'confirmation_required',
                  toolName: toolCall.toolName,
                  toolArguments: toolCall.args as Record<string, unknown>,
                  confirmationId,
                  riskLevel,
                };
              }

              // Execute low-risk tool directly
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
        }
      }

      // Save assistant response
      await this.saveMessage(params.conversationId, 'assistant', responseText);

      return {
        type: 'text',
        content: responseText,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Handle LLM auth errors specifically
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return { type: 'error', error: 'llm_auth_error' };
      }

      return { type: 'error', error: errorMessage };
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
    const finalParams = action === 'modify' && params.modifiedParameters
      ? params.modifiedParameters
      : params.toolArguments;

    if (action === 'cancel') {
      this.confirmationManager.cancel(confirmationId);
      await this.saveMessage(params.conversationId, 'assistant', '操作已取消。');
      return { type: 'text', content: '操作已取消。' };
    }

    // Resolve the confirmation promise
    this.confirmationManager.resolve(confirmationId, {
      action,
      modifiedParameters: action === 'modify' ? params.modifiedParameters : undefined,
    });

    // Execute the tool
    const toolDefs = await this.toolRegistry.getToolsForConnector(params.connectorId);
    const toolDef = toolDefs.find((t) => t.name === params.toolName);

    const result = await this.executeToolCall(
      params.userId,
      params.conversationId,
      params.connectorId,
      params.toolName,
      finalParams,
      toolDef,
    );

    return result;
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
      const [binding] = await this.db.select({ encryptedCred: saasBindings.encryptedCred })
        .from(saasBindings)
        .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

      if (!binding) {
        return { type: 'error', error: 'No SaaS binding found for this connector' };
      }

      const cred = this.crypto.decrypt(binding.encryptedCred);
      const toolResult = await connector.executeToolCall(toolName, args, cred);

      // Audit log
      await this.auditService.log({
        userId,
        conversationId,
        toolName,
        saasEndpoint: toolDef?.apiMappingJson
          ? `${(toolDef.apiMappingJson as any).method} ${(toolDef.apiMappingJson as any).path}`
          : toolName,
        requestJson: args,
        responseStatus: toolResult.success ? 200 : 500,
        responseJson: toolResult.data || toolResult.error,
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { type: 'error', error: `Tool execution failed: ${errorMessage}` };
    }
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
        const openai = createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl || undefined,
        });
        return openai(config.modelId);
      }
      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: config.apiKey,
          baseURL: config.baseUrl || undefined,
        });
        return anthropic(config.modelId);
      }
      default: {
        // For deepseek and custom, use OpenAI-compatible API
        const provider = createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl || 'https://api.deepseek.com',
        });
        return provider(config.modelId);
      }
    }
  }
}
