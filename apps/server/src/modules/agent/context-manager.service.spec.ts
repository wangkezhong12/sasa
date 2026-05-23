import { ContextManagerService } from './context-manager.service';

describe('ContextManagerService', () => {
  let service: ContextManagerService;

  beforeEach(() => {
    service = new ContextManagerService();
  });

  it('should trim messages to recent N rounds', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }));
    const trimmed = service.trim(messages, { maxRounds: 10 });
    expect(trimmed.length).toBeLessThanOrEqual(20);
    expect(trimmed.length).toBe(20);
  });

  it('should keep all messages when within budget', () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: 'user',
      content: `msg ${i}`,
    }));
    const trimmed = service.trim(messages, { maxRounds: 10 });
    expect(trimmed.length).toBe(10);
  });

  it('should handle empty message list', () => {
    const trimmed = service.trim([]);
    expect(trimmed).toEqual([]);
  });

  it('should handle single message', () => {
    const messages = [{ role: 'user', content: 'hello' }];
    const trimmed = service.trim(messages);
    expect(trimmed).toEqual(messages);
  });

  it('should use default maxRounds when not specified', () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      role: 'user',
      content: `msg ${i}`,
    }));
    const trimmed = service.trim(messages);
    // Default CONTEXT_WINDOW_RECENT_ROUNDS = 10, so 10 * 2 = 20
    expect(trimmed.length).toBe(20);
    expect(trimmed[0].content).toBe('msg 30');
  });
});
