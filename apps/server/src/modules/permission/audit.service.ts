import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { auditLogs } from '../../common/database/schema';

@Injectable()
export class AuditService {
  constructor(@Inject(DB) private db: any) {}

  async log(entry: {
    userId: string;
    conversationId?: string;
    toolName: string;
    saasEndpoint: string;
    requestJson?: Record<string, unknown>;
    responseStatus?: number;
    responseJson?: Record<string, unknown>;
  }) {
    await this.db.insert(auditLogs).values(entry);
  }

  async findByUser(userId: string, limit = 50) {
    return this.db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
