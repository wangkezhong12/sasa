import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { CredentialPayload } from '@sasa/shared';
import type { AuthStrategy } from '@sasa/connector-sdk';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { saasBindings } from '../../common/database/schema';

@Injectable()
export class CredentialManager {
  constructor(
    @Inject('DATABASE') private readonly db: any,
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

    // 4. Auto-refresh if expired
    if (strategy.isExpired?.(payload)) {
      if (!strategy.refreshToken) {
        throw new ForbiddenException(
          `Strategy ${binding.authType} reports expired but has no refreshToken implementation`,
        );
      }
      if (!config) {
        throw new ForbiddenException(`No auth config for connector ${connectorId}`);
      }

      const refreshed = await strategy.refreshToken(payload, config);

      // Update DB with refreshed payload
      const encryptedCred = this.crypto.encrypt(JSON.stringify(refreshed));
      await this.db
        .update(saasBindings)
        .set({ encryptedCred })
        .where(and(eq(saasBindings.userId, userId), eq(saasBindings.connectorId, connectorId)));

      return strategy.buildAuthHeaders(refreshed, config ?? undefined);
    }

    return strategy.buildAuthHeaders(payload, config ?? undefined);
  }
}
