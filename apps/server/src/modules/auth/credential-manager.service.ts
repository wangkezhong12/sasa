import { Injectable, Inject, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import Redis from 'ioredis';
import type { CredentialPayload } from '@sasa/shared';
import type { AuthStrategy } from '@sasa/connector-sdk';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { REDIS } from '../../common/redis/redis.module';
import { saasBindings } from '../../common/database/schema';

const REFRESH_LOCK_TTL_MS = 10000; // 10 seconds

@Injectable()
export class CredentialManager {
  constructor(
    @Inject('DATABASE') private readonly db: any,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly crypto: CryptoService,
    private readonly strategyResolver: AuthStrategyResolver,
    private readonly connectorRegistry: ConnectorRegistry,
  ) {}

  async getValidAuthHeaders(
    userId: string,
    connectorId: string,
  ): Promise<Record<string, string>> {
    // 1. Read binding from DB
    const [binding] = await this.db
      .select()
      .from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

    if (!binding) {
      throw new NotFoundException('No SaaS binding found');
    }
    if (binding.status === 'expired') {
      throw new ForbiddenException('Binding expired, please rebind');
    }

    // 2. Decrypt and parse payload
    const payload: CredentialPayload = JSON.parse(this.crypto.decrypt(binding.encryptedCred));

    // 3. Resolve strategy
    const strategy: AuthStrategy = this.strategyResolver.resolve(binding.authType);
    const connector = this.connectorRegistry.get(connectorId);
    const config = connector.getAuthStrategyConfig(binding.authType);

    // 4. Auto-refresh if expired (with distributed lock)
    if (strategy.isExpired?.(payload)) {
      if (!strategy.refreshToken) {
        throw new ForbiddenException(
          `Strategy ${binding.authType} reports expired but has no refreshToken implementation`,
        );
      }
      if (!config) {
        throw new ForbiddenException(`No auth config for connector ${connectorId}`);
      }

      const refreshed = await this.refreshWithLock(userId, connectorId, payload, strategy, config);
      return strategy.buildAuthHeaders(refreshed, config);
    }

    return strategy.buildAuthHeaders(payload, config ?? undefined);
  }

  private async refreshWithLock(
    userId: string,
    connectorId: string,
    payload: CredentialPayload,
    strategy: AuthStrategy,
    config: any,
  ): Promise<CredentialPayload> {
    const lockKey = `cred-refresh:${userId}:${connectorId}`;

    // Try to acquire lock
    let locked = false;
    try {
      locked = (await this.redis.set(lockKey, '1', 'PX', REFRESH_LOCK_TTL_MS, 'NX')) === 'OK';
    } catch {
      // Redis unavailable — proceed without lock (best-effort)
      locked = true;
    }

    if (!locked) {
      // Another request is refreshing — wait briefly and re-read
      await new Promise((r) => setTimeout(r, 200));
      const [current] = await this.db
        .select()
        .from(saasBindings)
        .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
      const currentPayload: CredentialPayload = JSON.parse(this.crypto.decrypt(current.encryptedCred));
      if (strategy.isExpired && !strategy.isExpired(currentPayload)) {
        return currentPayload;
      }
      // Still expired — fall through and try refresh ourselves
    }

    // Re-read inside lock to check if already refreshed
    const [current] = await this.db
      .select()
      .from(saasBindings)
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
    const currentPayload: CredentialPayload = JSON.parse(this.crypto.decrypt(current.encryptedCred));
    if (strategy.isExpired && !strategy.isExpired(currentPayload)) {
      return currentPayload;
    }

    // Refresh with retry
    let refreshed: CredentialPayload;
    try {
      refreshed = await strategy.refreshToken!(currentPayload, config);
    } catch (firstError) {
      // Retry once for network jitter
      try {
        refreshed = await strategy.refreshToken!(currentPayload, config);
      } catch {
        // Final failure — mark binding as expired
        await this.db
          .update(saasBindings)
          .set({ status: 'expired' })
          .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));
        throw new ForbiddenException('ERP connection expired, please rebind');
      }
    }

    // Update DB with refreshed payload
    const encryptedCred = this.crypto.encrypt(JSON.stringify(refreshed));
    await this.db
      .update(saasBindings)
      .set({ encryptedCred, status: 'active' })
      .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

    // Release lock
    try {
      await this.redis.del(lockKey);
    } catch {
      // Redis unavailable — lock will expire via TTL
    }

    return refreshed;
  }
}
