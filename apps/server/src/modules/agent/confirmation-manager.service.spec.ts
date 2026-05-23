import { ConfirmationManager } from './confirmation-manager.service';

describe('ConfirmationManager', () => {
  let manager: ConfirmationManager;

  beforeEach(() => {
    manager = new ConfirmationManager();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create pending confirmation and resolve on confirm', async () => {
    const promise = manager.create('conf-1', 5000);
    manager.resolve('conf-1', { action: 'confirm' });
    const result = await promise;
    expect(result.action).toBe('confirm');
  });

  it('should auto-cancel on timeout', async () => {
    const promise = manager.create('conf-2', 100);
    jest.advanceTimersByTime(150);
    const result = await promise;
    expect(result.action).toBe('cancel');
  });

  it('should handle modify action with new parameters', async () => {
    const promise = manager.create('conf-3', 5000);
    manager.resolve('conf-3', {
      action: 'modify',
      modifiedParameters: { date: '2026-06-01' },
    });
    const result = await promise;
    expect(result.action).toBe('modify');
    expect(result.modifiedParameters).toEqual({ date: '2026-06-01' });
  });

  it('should ignore resolve for unknown id', () => {
    expect(() => manager.resolve('unknown', { action: 'confirm' })).not.toThrow();
  });

  it('should handle cancel method', async () => {
    const promise = manager.create('conf-4', 5000);
    manager.cancel('conf-4');
    const result = await promise;
    expect(result.action).toBe('cancel');
  });

  it('should report pending status via has()', () => {
    manager.create('conf-5', 5000);
    expect(manager.has('conf-5')).toBe(true);
    expect(manager.has('nonexistent')).toBe(false);
  });

  it('should remove from pending after resolve', () => {
    manager.create('conf-6', 5000);
    manager.resolve('conf-6', { action: 'confirm' });
    expect(manager.has('conf-6')).toBe(false);
  });

  it('should handle multiple sequential confirmations', async () => {
    const p1 = manager.create('conf-a', 5000);
    const p2 = manager.create('conf-b', 5000);
    manager.resolve('conf-a', { action: 'confirm' });
    manager.resolve('conf-b', { action: 'cancel' });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.action).toBe('confirm');
    expect(r2.action).toBe('cancel');
  });
});
