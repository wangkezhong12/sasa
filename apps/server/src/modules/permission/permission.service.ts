import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import Redis from 'ioredis';
import { DB } from '../../common/database/database.module';
import { REDIS } from '../../common/redis/redis.module';
import { saasBindings } from '../../common/database/schema';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { CredentialManager } from '../auth/credential-manager.service';
import { PERMISSION_CACHE_TTL_SECONDS } from '@sasa/shared';

@Injectable()
export class PermissionService {
  constructor(
    @Inject(DB) private db: any,
    @Inject(REDIS) private redis: Redis,
    private connectorRegistry: ConnectorRegistry,
    private credentialManager: CredentialManager,
  ) {}

  filterTools<T extends { requiredPermission: string | null }>(tools: T[], permissions: string[]): T[] {
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
    }).from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

    if (!binding) return [];

    let permissions: string[];
    try {
      const connector = this.connectorRegistry.get(connectorId);
      const authHeaders = await this.credentialManager.getValidAuthHeaders(userId, connectorId);
      // Read authType from binding to get strategy config with permissionsEndpoint
      const [authRow] = await this.db.select({ authType: saasBindings.authType }).from(saasBindings)
        .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
      const config = connector.getAuthStrategyConfig(authRow?.authType);
      const permissionsEndpoint = config?.params?.permissionsEndpoint;
      if (!permissionsEndpoint) {
        return [];
      }
      const response = await fetch(permissionsEndpoint, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Permissions endpoint returned ${response.status}`);
      }
      permissions = await response.json();
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
