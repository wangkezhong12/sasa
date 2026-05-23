import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB } from '../../common/database/database.module';
import { saasBindings } from '../../common/database/schema';
import { CryptoService } from '../../common/crypto/crypto.service';

export interface BindSaasInput {
  connectorId: string;
  authType: 'oauth2' | 'api_key';
  credential: string;
  saasUserId?: string;
  saasUsername?: string;
}

@Injectable()
export class SaaSBindingService {
  constructor(
    @Inject(DB) private db: any,
    private cryptoService: CryptoService,
  ) {}

  // TODO(chunk-4): validate credentials via ConnectorRegistry before storing
  // TODO(chunk-4): sync permissions via connector.fetchPermissions()
  async bind(userId: string, input: BindSaasInput) {
    const encryptedCred = this.cryptoService.encrypt(input.credential);
    const [binding] = await this.db.insert(saasBindings).values({
      userId,
      connectorId: input.connectorId,
      authType: input.authType,
      encryptedCred,
      saasUserId: input.saasUserId,
      saasUsername: input.saasUsername,
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
      expiresAt: saasBindings.expiresAt,
    }).from(saasBindings).where(eq(saasBindings.userId, userId));
    return rows;
  }

  async unbind(userId: string, bindingId: string) {
    await this.db.delete(saasBindings)
      .where(and(eq(saasBindings.id, bindingId), eq(saasBindings.userId, userId)));
  }
}
