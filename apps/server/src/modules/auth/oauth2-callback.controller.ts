import { Controller, Get, Query, Res, Inject } from '@nestjs/common';
import { Response } from 'express';
import Redis from 'ioredis';
import { REDIS } from '../../common/redis/redis.module';
import { SaaSBindingService } from './saas-binding.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { CryptoService } from '../../common/crypto/crypto.service';
import type { CredentialPayload } from '@sasa/shared';

@Controller('connectors/oauth2')
export class OAuth2CallbackController {
  constructor(
    @Inject(REDIS) private redis: Redis,
    private bindingService: SaaSBindingService,
    private connectorRegistry: ConnectorRegistry,
    private strategyResolver: AuthStrategyResolver,
    private crypto: CryptoService,
  ) {}

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.redirect('/saas/callback?error=missing_params');
    }

    // Retrieve and delete state from Redis
    const stateKey = `oauth:state:${state}`;
    let stateData: { userId: string; connectorId: string } | null = null;
    try {
      const raw = await this.redis.get(stateKey);
      if (raw) {
        stateData = JSON.parse(raw);
        await this.redis.del(stateKey);
      }
    } catch {
      // Redis unavailable
    }

    if (!stateData) {
      return res.redirect('/saas/callback?error=invalid_state');
    }

    // Exchange code for token via strategy
    const connector = this.connectorRegistry.get(stateData.connectorId);
    const config = connector.getAuthStrategyConfig('oauth2_code');
    if (!config) {
      return res.redirect(`/saas/callback?error=no_config`);
    }

    const strategy = this.strategyResolver.resolve('oauth2_code');
    const redirectUri = this.buildCallbackUrl();

    let payload: CredentialPayload;
    try {
      payload = await strategy.validateAndBuild(
        { code, redirectUri },
        config,
      );
    } catch {
      return res.redirect(`/saas/callback?error=token_exchange_failed`);
    }

    // Create binding with encrypted payload
    const encryptedCred = this.crypto.encrypt(JSON.stringify(payload));
    await this.bindingService.bindWithPayload(
      stateData.userId,
      stateData.connectorId,
      'oauth2_code',
      encryptedCred,
    );

    // Redirect to frontend success page
    const webUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return res.redirect(`${webUrl}/saas?bound=${stateData.connectorId}`);
  }

  private buildCallbackUrl(): string {
    const port = process.env.SERVER_PORT || '4000';
    const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;
    return `${serverUrl}/connectors/oauth2/callback`;
  }
}
