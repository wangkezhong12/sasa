import { describe, it, expect } from 'vitest';
import type { ChatMessage, ToolCall, ToolResultData, ConfirmationAction } from './message';

describe('message types', () => {
  it('ChatMessage should hold conversation data', () => {
    const msg: ChatMessage = {
      id: '1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hello',
      toolCalls: null,
      toolResults: null,
      confirmationId: null,
      createdAt: new Date(),
    };
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
  });

  it('ToolCall should have id, name, and arguments', () => {
    const call: ToolCall = {
      id: 'tc-1',
      name: 'get_orders',
      arguments: { status: 'pending' },
    };
    expect(call.name).toBe('get_orders');
    expect(call.arguments.status).toBe('pending');
  });

  it('ToolResultData should represent tool output', () => {
    const result: ToolResultData = {
      toolCallId: 'tc-1',
      success: true,
      data: { orders: [] },
    };
    expect(result.success).toBe(true);
  });

  it('ConfirmationAction should be confirm, cancel, or modify', () => {
    const actions: ConfirmationAction[] = ['confirm', 'cancel', 'modify'];
    expect(actions).toHaveLength(3);
  });
});
