import { Test } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { DB } from '../../common/database/database.module';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { PermissionService } from '../permission/permission.service';
import { AuditService } from '../permission/audit.service';
import { CredentialManager } from '../auth/credential-manager.service';
import { LLMConfigService } from './llm-config.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ContextManagerService } from './context-manager.service';
import { ConfirmationManager } from './confirmation-manager.service';
import { ToolRegistryService } from './tool-registry.service';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));
jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));

import { generateText } from 'ai';

describe('AgentService', () => {
  let service: AgentService;
  let confirmationManager: ConfirmationManager;
  let mockDb: any;
  let mockRegistry: any;
  let mockPermission: any;
  let mockAudit: any;
  let mockLLMConfig: any;
  let mockToolRegistry: any;
  let mockCredentialManager: any;

  // Helper to set up DB mocks for processMessage
  function setupDbMocks() {
    const historyChain = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    const connectorChain = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ name: 'Demo ERP' }]),
      }),
    };
    const bindingChain = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ saasUsername: 'TestUser' }]),
      }),
    };
    mockDb.select = jest.fn()
      .mockReturnValueOnce(historyChain)
      .mockReturnValueOnce(connectorChain)
      .mockReturnValueOnce(bindingChain);
    mockDb.insert = jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });
  }

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
    mockRegistry = { get: jest.fn() };
    mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
    mockPermission = {
      getPermissions: jest.fn().mockResolvedValue(['leave:submit']),
      filterTools: jest.fn().mockImplementation((tools) => tools),
    };
    mockCredentialManager = {
      getValidAuthHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer test-key' }),
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
    confirmationManager = new ConfirmationManager();

    const module = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: DB, useValue: mockDb },
        { provide: ConnectorRegistry, useValue: mockRegistry },
        { provide: PermissionService, useValue: mockPermission },
        { provide: AuditService, useValue: mockAudit },
        { provide: CredentialManager, useValue: mockCredentialManager },
        { provide: LLMConfigService, useValue: mockLLMConfig },
        { provide: PromptBuilderService, useValue: new PromptBuilderService() },
        { provide: ContextManagerService, useValue: new ContextManagerService() },
        { provide: ConfirmationManager, useValue: confirmationManager },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
      ],
    }).compile();

    service = module.get(AgentService);
  });

  describe('processMessage', () => {
    it('should return text response when LLM returns text only', async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: '你好！有什么可以帮你的？',
        steps: [],
      });
      setupDbMocks();

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('text');
      expect(result.content).toBe('你好！有什么可以帮你的？');
    });

    it('should return error for LLM auth failure (status 401)', async () => {
      const err = new Error('Unauthorized');
      (err as any).status = 401;
      mockLLMConfig.resolve.mockRejectedValue(err);

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('error');
      expect(result.error).toBe('llm_auth_error');
    });

    it('should return error for LLM auth failure (status 403)', async () => {
      const err = new Error('Forbidden');
      (err as any).status = 403;
      mockLLMConfig.resolve.mockRejectedValue(err);

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

      (generateText as jest.Mock).mockResolvedValue({
        text: 'I will submit your leave request.',
        steps: [{
          toolCalls: [{
            toolName: 'submit_leave',
            args: { type: 'annual', start: '2026-06-01', end: '2026-06-03' },
          }],
        }],
      });
      setupDbMocks();

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
      expect(confirmationManager.has(result.confirmationId!)).toBe(true);
    });

    it('should execute read-risk tools directly using CredentialManager', async () => {
      const toolDef = {
        id: 'td-2',
        name: 'list_orders',
        description: 'List orders',
        parametersJson: { type: 'object' },
        requiredPermission: 'order:read',
        riskLevel: 'read',
        apiMappingJson: { method: 'GET', path: '/api/orders' },
      };

      mockToolRegistry.getToolsForConnector.mockResolvedValue([toolDef]);
      mockPermission.filterTools.mockReturnValue([toolDef]);
      mockToolRegistry.filterByThreshold.mockReturnValue([toolDef]);
      mockToolRegistry.toAITools.mockReturnValue({
        list_orders: { description: 'List orders', parameters: {} },
      });

      const mockConnector = {
        executeToolCall: jest.fn().mockResolvedValue({ success: true, data: { orders: [] } }),
      };
      mockRegistry.get = jest.fn().mockReturnValue(mockConnector);

      (generateText as jest.Mock).mockResolvedValue({
        text: 'Here are the orders.',
        steps: [{
          toolCalls: [{
            toolName: 'list_orders',
            args: { status: 'open' },
          }],
        }],
      });

      setupDbMocks();

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '查看订单',
        connectorId: 'conn-1',
      });

      expect(mockCredentialManager.getValidAuthHeaders).toHaveBeenCalledWith('user-1', 'conn-1');
      expect(mockConnector.executeToolCall).toHaveBeenCalledWith('list_orders', { status: 'open' }, { Authorization: 'Bearer test-key' });
      expect(mockAudit.log).toHaveBeenCalled();
      expect(result.type).toBe('text');
    });

    it('should return sanitized error for generic failures', async () => {
      mockLLMConfig.resolve.mockRejectedValue(new Error('Some unexpected error'));

      const result = await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(result.type).toBe('error');
      expect(result.error).toBe('Internal error. Please try again.');
    });

    it('should call permissionService.filterTools instead of inline filter', async () => {
      (generateText as jest.Mock).mockResolvedValue({ text: 'ok', steps: [] });
      setupDbMocks();

      await service.processMessage({
        userId: 'user-1',
        conversationId: 'conv-1',
        message: '你好',
        connectorId: 'conn-1',
      });

      expect(mockPermission.filterTools).toHaveBeenCalled();
    });
  });

  describe('handleConfirmation', () => {
    it('should reject unknown confirmation ID', async () => {
      const result = await service.handleConfirmation('nonexistent', 'confirm', {
        userId: 'user-1',
        conversationId: 'conv-1',
        connectorId: 'conn-1',
        toolName: 'submit_leave',
        toolArguments: { type: 'annual' },
      });

      expect(result.type).toBe('error');
      expect(result.error).toContain('not found');
    });

    it('should cancel operation when action is cancel', async () => {
      const id = confirmationManager.createId();
      confirmationManager.register(id, 'user-1');
      mockDb.insert = jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });

      const result = await service.handleConfirmation(id, 'cancel', {
        userId: 'user-1',
        conversationId: 'conv-1',
        connectorId: 'conn-1',
        toolName: 'submit_leave',
        toolArguments: { type: 'annual' },
      });

      expect(result.type).toBe('text');
      expect(result.content).toContain('取消');
      expect(confirmationManager.has(id)).toBe(false);
    });

    it('should execute tool on confirm action using CredentialManager', async () => {
      const id = confirmationManager.createId();
      confirmationManager.register(id, 'user-1');

      const toolDef = {
        id: 'td-1',
        name: 'submit_leave',
        description: 'Submit leave',
        parametersJson: {},
        requiredPermission: 'leave:submit',
        riskLevel: 'write',
        apiMappingJson: { method: 'POST', path: '/api/leaves' },
      };
      mockToolRegistry.getToolsForConnector.mockResolvedValue([toolDef]);

      const mockConnector = {
        executeToolCall: jest.fn().mockResolvedValue({ success: true, data: { id: 'leave-1' } }),
      };
      mockRegistry.get = jest.fn().mockReturnValue(mockConnector);

      mockDb.insert = jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });

      const result = await service.handleConfirmation(id, 'confirm', {
        userId: 'user-1',
        conversationId: 'conv-1',
        connectorId: 'conn-1',
        toolName: 'submit_leave',
        toolArguments: { type: 'annual', start: '2026-06-01' },
      });

      expect(mockCredentialManager.getValidAuthHeaders).toHaveBeenCalledWith('user-1', 'conn-1');
      expect(mockConnector.executeToolCall).toHaveBeenCalledWith('submit_leave', { type: 'annual', start: '2026-06-01' }, { Authorization: 'Bearer test-key' });
      expect(result.type).toBe('text');
      expect(result.content).toContain('执行成功');
    });

    it('should reject confirmation from wrong user', async () => {
      const id = confirmationManager.createId();
      confirmationManager.register(id, 'user-1');

      const result = await service.handleConfirmation(id, 'confirm', {
        userId: 'user-2',
        conversationId: 'conv-1',
        connectorId: 'conn-1',
        toolName: 'submit_leave',
        toolArguments: { type: 'annual' },
      });

      expect(result.type).toBe('error');
      expect(result.error).toContain('does not belong');
    });
  });
});
