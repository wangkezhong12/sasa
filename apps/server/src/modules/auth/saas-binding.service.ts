import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { saasBindings } from '../../common/database/schema';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import type { AuthType, CredentialPayload } from '@sasa/shared';

export interface BindSaasInput {
  connectorId: string;
  authType: AuthType;
  credential: Record<string, string>;
  saasUserId?: string;
  saasUsername?: string;
}

@Injectable()
export class SaaSBindingService {
  constructor(
    @Inject(DB) private db: any,
    private cryptoService: CryptoService,
    private strategyResolver: AuthStrategyResolver,
    private connectorRegistry: ConnectorRegistry,
  ) {}

  async bind(userId: string, input: BindSaasInput) {
    // 1. Resolve connector and strategy
    const connector = this.connectorRegistry.get(input.connectorId);
    const strategy = this.strategyResolver.resolve(input.authType);
    const config = connector.getAuthStrategyConfig(input.authType);

    // 2. Strategy validates credentials + builds payload
    const payload: CredentialPayload = await strategy.validateAndBuild(input.credential, config!);

    // 3. Encrypt and store
    const encryptedCred = this.cryptoService.encrypt(JSON.stringify(payload));

    const [binding] = await this.db.insert(saasBindings).values({
      userId,
      connectorId: input.connectorId,
      authType: input.authType,
      encryptedCred,
      saasUserId: input.saasUserId,
      saasUsername: input.saasUsername,
    }).onConflictDoUpdate({
      target: [saasBindings.userId, saasBindings.connectorId],
      set: { authType: input.authType, encryptedCred, status: 'active' },
    }).returning();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedCred: _, ...safe } = binding;
    return safe;
  }

  async bindWithPayload(
    userId: string,
    connectorId: string,
    authType: AuthType,
    encryptedCred: Buffer,
  ) {
    const [binding] = await this.db.insert(saasBindings).values({
      userId,
      connectorId,
      authType,
      encryptedCred,
    }).onConflictDoUpdate({
      target: [saasBindings.userId, saasBindings.connectorId],
      set: { authType, encryptedCred, status: 'active' },
    }).returning();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedCred: _, ...safe } = binding;
    return safe;
  }

  async getBindings(userId: string) {
    const rows = await this.db.select({
      id: saasBindings.id,
      userId: saasBindings.userId,
      connectorId: saasBindings.connectorId,
      authType: saasBindings.authType,
      saasUserId: saasBindings.saasUserId,
      saasUsername: saasBindings.saasUsername,
      status: saasBindings.status,
      createdAt: saasBindings.createdAt,
    }).from(saasBindings).where(eq(saasBindings.userId, userId));
    return rows;
  }

  async unbind(userId: string, bindingId: string) {
    await this.db.delete(saasBindings)
      .where(and(eq(saasBindings.id, bindingId), eq(saasBindings.userId, userId)));
  }
}
