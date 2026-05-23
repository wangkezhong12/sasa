import { Injectable } from '@nestjs/common';
import { CONTEXT_WINDOW_RECENT_ROUNDS } from '@sasa/shared';

export interface ContextMessage {
  role: string;
  content: string | null;
}

@Injectable()
export class ContextManagerService {
  trim(messages: ContextMessage[], opts: { maxRounds?: number } = {}): ContextMessage[] {
    const maxRounds = opts.maxRounds ?? CONTEXT_WINDOW_RECENT_ROUNDS;
    return messages.slice(-maxRounds * 2);
  }
}
