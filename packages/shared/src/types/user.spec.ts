import { describe, it, expect } from 'vitest';
import type { User, Workspace, WorkspaceMember, WorkspaceRole } from './user';

describe('user types', () => {
  it('User should have profile fields', () => {
    const user: User = {
      id: 'u-1',
      email: 'test@example.com',
      name: 'Test',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(user.email).toBe('test@example.com');
    expect(user.avatarUrl).toBeNull();
  });

  it('Workspace should have slug and ownerId', () => {
    const ws: Workspace = {
      id: 'ws-1',
      name: 'My Workspace',
      slug: 'my-workspace',
      ownerId: 'u-1',
      settings: {},
      createdAt: new Date(),
    };
    expect(ws.slug).toBe('my-workspace');
  });

  it('WorkspaceMember should have role', () => {
    const member: WorkspaceMember = {
      id: 'wm-1',
      workspaceId: 'ws-1',
      userId: 'u-1',
      role: 'admin',
      joinedAt: new Date(),
    };
    expect(member.role).toBe('admin');
  });

  it('WorkspaceRole should be owner, admin, or member', () => {
    const roles: WorkspaceRole[] = ['owner', 'admin', 'member'];
    expect(roles).toHaveLength(3);
  });
});
