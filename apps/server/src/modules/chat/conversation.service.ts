import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { conversations, messages } from '../../common/database/schema';

@Injectable()
export class ConversationService {
  constructor(@Inject(DB) private db: any) {}

  async create(userId: string, connectorId?: string, workspaceId?: string) {
    const [conv] = await this.db.insert(conversations).values({
      userId,
      connectorId: connectorId || null,
      workspaceId: workspaceId || null,
    }).returning();
    return conv;
  }

  async findByUser(userId: string) {
    return this.db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async findById(id: string) {
    const [conv] = await this.db.select().from(conversations)
      .where(eq(conversations.id, id));
    return conv || null;
  }

  async updateTitle(id: string, title: string) {
    const [updated] = await this.db.update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated || null;
  }

  async findMessages(conversationId: string, limit = 200) {
    return this.db.select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      toolCallsJson: messages.toolCallsJson,
      toolResultsJson: messages.toolResultsJson,
      createdAt: messages.createdAt,
    }).from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(limit);
  }
}
