import { Test } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { DB } from '../../common/database/database.module';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { PermissionService } from '../permission/permission.service';
import { AuditService } from '../permission/audit.service';
import { LLMConfigService } from './llm-config.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ContextManagerService } from './context-manager.service';
import { ConfirmationManager } from './confirmation-manager.service';
import { ToolRegistryService } from './tool-registry.service';
import { REDIS } from '../../common/redis/redis.module';

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(),
}));
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));
jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));

import { streamText } from 'ai';

describe('AgentService', () => {
  let service: AgentService;
  let mockDb: any;
  let mockRedis: any;
  let mockCrypto: any;
  let mockRegistry: any;
  let mockPermission: any;
  let mockAudit: any;
  let mockLLMConfig: any;
  let mockToolRegistry: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
          orderBy: jest.fn().mockResolvedValue([]),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      }),
    };
    mockRedis = { get: jest.fn(), set: jest.fn() };
    mockCrypto = { decrypt: jest.fn().mockReturnValue('cred') };
    mockRegistry = { get: jest.fn() };
    mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
    mockPermission = {
      getPermissions: jest.fn().mockResolvedValue(['leave:submit']),
      filterTools: jest.fn().mockImplementation((tools) => tools),
    };
    mockLLMConfig = {
      resolve: jest.fn().mockResolvedValue({
        providerId: 'openai',
        modelId: 'gpt-4o',
        apiKey: 'test-key',
        baseUrl: null,
      }),
    };
    mockToolRegistry = {
      getToolsForConnector: jest.fn().mockResolvedValue([]),
      filterByThreshold: jest.fn().mockImplementation((t) => t),
      toAITools: jest.fn().mockReturnValue({}),
    };

    const module = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: DB, useValue: mockDb },
        { provide: REDIS, useValue: mockRedis },
        { provide: CryptoService, useValue: mockCrypto },
        { provide: ConnectorRegistry, useValue: mockRegistry },
        { provide: PermissionService, useValue: mockPermission },
        { provide: AuditService, useValue: mockAudit },
        { provide: LLMConfigService, useValue: mockLLMConfig },
        { provide: PromptBuilderService, useValue: new PromptBuilderService() },
        { provide: ContextManagerService, useValue: new ContextManagerService() },
        { provide: ConfirmationManager, useValue: new ConfirmationManager() },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
      ],
    }).compile();

    service = module.get(AgentService);
  });

  describe('processMessage', () => {
    it('should return text response when LLM returns text only', async () => {
      (streamText as jest.Mock).mockResolvedValue({
        text: Promise.resolve('你好！有什么可以帮你的？'),
        steps: Promise.resolve([]),
      });

      // Mock DB calls: loadHistory (with orderBy), getConnectorInfo, getBindingInfo, saveMessage
      const historyChain = { from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue([]) }) }) };
      const connectorChain = { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ name: 'Demo ERP' }]) }) };
      const bindingChain = { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ saasUsername: 'TestUser' }]) }) };

      mockDb.select = jest.fn()
        .mockReturnValueOnce(historyChain)   // loadHistory
        .mockReturnValueOnce(connectorChain) // getConnectorInfo
        .mockReturnValueOnce(bindingChain);  // getBindingInfo

      mockDb.insert = jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('text');
      expect(result.content).toBe('你好！有什么可以帮你的？');
    });

    it('should return error for LLM auth failure (401)', async () => {
      mockLLMConfig.resolve.mockRejectedValue(new Error('401 Unauthorized'));

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('error');
      expect(result.error).toBe('llm_auth_error');
    });

    it('should return error for LLM auth failure (403)', async () => {
      mockLLMConfig.resolve.mockRejectedValue(new Error('403 Forbidden'));

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('error');
      expect(result.error).toBe('llm_auth_error');
    });

    it('should return confirmation_required for write-risk tool calls', async () => {
      const toolDef = {
        id: 'td-1',
        name: 'submit_leave',
        description: 'Submit leave request',
        parametersJson: { type: 'object' },
        requiredPermission: 'leave:submit',
        riskLevel: 'write',
        apiMappingJson: { method: 'POST', path: '/api/leaves' },
      };

      mockToolRegistry.getToolsForConnector.mockResolvedValue([toolDef]);
      mockPermission.filterTools.mockReturnValue([toolDef]);
      mockToolRegistry.filterByThreshold.mockReturnValue([toolDef]);
      mockToolRegistry.toAITools.mockReturnValue({
        submit_leave: { description: 'Submit leave', parameters: {} },
      });

      (streamText as jest.Mock).mockResolvedValue({
        text: Promise.resolve('I will submit your leave request.'),
        steps: Promise.resolve([{
          toolCalls: [{
            toolName: 'submit_leave',
            args: { type: 'annual', start: '2026-06-01', end: '2026-06-03' },
          }],
        }]),
      });

      const historyChain = { from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue([]) }) }) };
      const connectorChain = { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ name: 'Demo ERP' }]) }) };
      const bindingChain = { from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ saasUsername: 'TestUser' }]) }) };

      mockDb.select = jest.fn()
        .mockReturnValueOnce(historyChain)
        .mockReturnValueOnce(connectorChain)
        .mockReturnValueOnce(bindingChain);

      mockDb.insert = jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '帮我提交一个年假申请',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('confirmation_required');
      expect(result.toolName).toBe('submit_leave');
      expect(result.riskLevel).toBe('write');
      expect(result.confirmationId).toBeDefined();
    });

    it('should handle generic errors gracefully', async () => {
      mockLLMConfig.resolve.mockRejectedValue(new Error('Some unexpected error'));

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('error');
      expect(result.error).toBe('Some unexpected error');
    });
  });

  describe('handleConfirmation', () => {
    it('should cancel operation when action is cancel', async () => {
      mockDb.insert = jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });

      const result = await service.handleConfirmation('conf-1', 'cancel', {
        userId: 'user-1',
        conversationId: 'conv-1',
        connectorId: 'conn-1',
        toolName: 'submit_leave',
        toolArguments: { type: 'annual' },
      });

      expect(result.type).toBe('text');
      expect(result.content).toContain('取消');
    });
  });
});
