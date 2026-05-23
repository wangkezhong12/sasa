import { Test } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ConversationService } from './conversation.service';
import { SSEService } from './sse.service';
import { AgentService } from '../agent/agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));
jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));

describe('ChatController', () => {
  let controller: ChatController;
  let mockConversationService: any;
  let mockSSEService: any;
  let mockAgentService: any;

  const mockUser = { id: 'user-1', email: 'test@test.com' };
  const mockReq = { user: mockUser };

  beforeEach(async () => {
    mockConversationService = {
      create: jest.fn(),
      findByUser: jest.fn(),
      findById: jest.fn(),
      updateTitle: jest.fn(),
      findMessages: jest.fn(),
    };
    mockSSEService = {
      createStream: jest.fn(),
      push: jest.fn(),
      complete: jest.fn(),
      hasClient: jest.fn(),
    };
    mockAgentService = {
      processMessage: jest.fn(),
      handleConfirmation: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ConversationService, useValue: mockConversationService },
        { provide: SSEService, useValue: mockSSEService },
        { provide: AgentService, useValue: mockAgentService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ChatController);
  });

  describe('createConversation', () => {
    it('should create a conversation for the authenticated user', async () => {
      const conv = { id: 'c1', userId: 'user-1' };
      mockConversationService.create.mockResolvedValue(conv);

      const result = await controller.createConversation(mockReq, { connectorId: 'conn-1' });
      expect(result).toEqual(conv);
      expect(mockConversationService.create).toHaveBeenCalledWith('user-1', 'conn-1', undefined);
    });
  });

  describe('listConversations', () => {
    it('should return conversations for the authenticated user', async () => {
      const convs = [{ id: 'c1' }, { id: 'c2' }];
      mockConversationService.findByUser.mockResolvedValue(convs);

      const result = await controller.listConversations(mockReq);
      expect(result).toEqual(convs);
    });
  });

  describe('sendMessage', () => {
    it('should throw NotFoundException when conversation not found', async () => {
      mockConversationService.findById.mockResolvedValue(null);
      await expect(controller.sendMessage(mockReq, 'nonexistent', { message: 'hello' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when conversation belongs to another user', async () => {
      mockConversationService.findById.mockResolvedValue({ id: 'c1', userId: 'other-user' });
      await expect(controller.sendMessage(mockReq, 'c1', { message: 'hello' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no connector specified', async () => {
      mockConversationService.findById.mockResolvedValue({ id: 'c1', userId: 'user-1', connectorId: null });
      await expect(controller.sendMessage(mockReq, 'c1', { message: 'hello' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should process message and push SSE events', async () => {
      mockConversationService.findById.mockResolvedValue({
        id: 'c1', userId: 'user-1', connectorId: 'conn-1', workspaceId: null,
      });
      mockAgentService.processMessage.mockResolvedValue({
        type: 'text', content: 'Hello!',
      });

      const result = await controller.sendMessage(mockReq, 'c1', { message: '你好' }) as any;

      expect(mockAgentService.processMessage).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', message: '你好', connectorId: 'conn-1' }),
      );
      expect(mockSSEService.push).toHaveBeenCalledWith('user-1:c1', expect.objectContaining({ event: 'text' }));
      expect(result.type).toBe('text');
    });
  });

  describe('confirmTool', () => {
    it('should call handleConfirmation and push SSE events', async () => {
      mockAgentService.handleConfirmation.mockResolvedValue({
        type: 'text', content: '执行成功',
      });

      const dto = {
        confirmationId: 'conf-1',
        action: 'confirm' as const,
        conversationId: 'c1',
        connectorId: 'conn-1',
        toolName: 'submit_leave',
        toolArguments: { type: 'annual' },
      };

      const result = await controller.confirmTool(mockReq, dto) as any;

      expect(mockAgentService.handleConfirmation).toHaveBeenCalledWith(
        'conf-1', 'confirm',
        expect.objectContaining({ userId: 'user-1', toolName: 'submit_leave' }),
      );
      expect(result.type).toBe('text');
    });
  });

  describe('getHistory', () => {
    it('should throw NotFoundException when conversation not found', async () => {
      mockConversationService.findById.mockResolvedValue(null);
      await expect(controller.getHistory(mockReq, 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when conversation belongs to another user', async () => {
      mockConversationService.findById.mockResolvedValue({ id: 'c1', userId: 'other-user' });
      await expect(controller.getHistory(mockReq, 'c1'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should return messages for the conversation', async () => {
      const msgList = [{ id: 'm1', role: 'user', content: 'hello' }];
      mockConversationService.findById.mockResolvedValue({ id: 'c1', userId: 'user-1' });
      mockConversationService.findMessages.mockResolvedValue(msgList);

      const result = await controller.getHistory(mockReq, 'c1');
      expect(result).toEqual(msgList);
      expect(mockConversationService.findMessages).toHaveBeenCalledWith('c1');
    });
  });
});
