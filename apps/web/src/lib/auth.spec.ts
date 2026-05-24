import { describe, it, expect, vi } from 'vitest';

// Mock next-auth
vi.mock('next-auth', () => ({
  default: () => {
    const handler = (req: any, res: any) => {};
    handler.signIn = vi.fn();
    handler.signOut = vi.fn();
    handler.auth = vi.fn();
    return handler;
  },
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: () => ({}),
}));

describe('auth configuration', () => {
  it('should export auth functions', async () => {
    const auth = await import('./auth');
    expect(auth.signIn).toBeDefined();
    expect(auth.signOut).toBeDefined();
    expect(auth.auth).toBeDefined();
  });
});
