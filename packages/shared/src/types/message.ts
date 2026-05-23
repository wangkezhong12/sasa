export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string | null;
  toolCalls: ToolCall[] | null;
  toolResults: ToolResultData[] | null;
  confirmationId: string | null;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultData {
  toolCallId: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export type ConfirmationAction = 'confirm' | 'cancel' | 'modify';
