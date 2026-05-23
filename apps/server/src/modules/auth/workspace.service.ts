import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { workspaces, workspaceMembers } from '../../common/database/schema';

@Injectable()
export class WorkspaceService {
  constructor(@Inject(DB) private db: any) {}

  async create(name: string, ownerId: string) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
    const [workspace] = await this.db.insert(workspaces).values({ name, slug, ownerId }).returning();
    await this.db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: ownerId, role: 'owner' });
    return workspace;
  }

  async findByUser(userId: string) {
    return this.db.select({ workspace: workspaces, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));
  }

  async addMember(workspaceId: string, userId: string, role: 'admin' | 'member' = 'member') {
    const [member] = await this.db.insert(workspaceMembers).values({ workspaceId, userId, role }).returning();
    return member;
  }

  async listMembers(workspaceId: string) {
    return this.db.select({
      id: workspaceMembers.id, userId: workspaceMembers.userId,
      role: workspaceMembers.role, joinedAt: workspaceMembers.joinedAt,
    }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async removeMember(workspaceId: string, memberId: string) {
    await this.db.delete(workspaceMembers)
      .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)));
  }
}
