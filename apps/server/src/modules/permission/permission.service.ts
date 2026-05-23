import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import Redis from 'ioredis';
import { DB } from '../../common/database/database.module';
import { REDIS } from '../../common/redis/redis.module';
import { saasBindings } from '../../common/database/schema';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PERMISSION_CACHE_TTL_SECONDS } from '@sasa/shared';

@Injectable()
export class PermissionService {
  constructor(
    @Inject(DB) private db: any,
    @Inject(REDIS) private redis: Redis,
    private connectorRegistry: ConnectorRegistry,
    private crypto: CryptoService,
  ) {}

  filterTools<T extends { requiredPermission: string }>(tools: T[], permissions: string[]): T[] {
    return tools.filter((t) => t.requiredPermission && permissions.includes(t.requiredPermission));
  }

  async getPermissions(userId: string, connectorId: string): Promise<string[]> {
    const cacheKey = `permissions:${userId}:${connectorId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed;
      }
    } catch {
      // Redis unavailable — fall through to DB
    }

    const [binding] = await this.db.select({ permissionsJson: saasBindings.permissionsJson })
      .from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

    if (!binding) return [];

    const permissions = (binding.permissionsJson || []) as string[];

    try {
      await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', PERMISSION_CACHE_TTL_SECONDS);
    } catch {
      // Redis unavailable — skip caching
    }

    return permissions;
  }

  async syncPermissions(userId: string, connectorId: string): Promise<string[]> {
    const [binding] = await this.db.select({
      id: saasBindings.id,
      encryptedCred: saasBindings.encryptedCred,
    }).from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

    if (!binding) return [];

    let permissions: string[];
    try {
      const connector = this.connectorRegistry.get(connectorId);
      const cred = this.crypto.decrypt(binding.encryptedCred);
      permissions = await connector.fetchPermissions(cred);
    } catch (err) {
      throw new InternalServerErrorException(`Failed to sync permissions: ${err instanceof Error ? err.message : String(err)}`);
    }

    await this.db.update(saasBindings)
      .set({ permissionsJson: permissions })
      .where(eq(saasBindings.id, binding.id));

    const cacheKey = `permissions:${userId}:${connectorId}`;
    try {
      await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', PERMISSION_CACHE_TTL_SECONDS);
    } catch {
      // Redis unavailable — skip caching
    }

    return permissions;
  }
}
