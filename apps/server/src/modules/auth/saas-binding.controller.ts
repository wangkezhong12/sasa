import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import { SaaSBindingService } from './saas-binding.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { BindSaasDto } from './dto/bind-saas.dto';
import { OAuth2AuthorizeDto } from './dto/oauth2-authorize.dto';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { REDIS } from '../../common/redis/redis.module';

@Controller('saas-bindings')
@UseGuards(JwtAuthGuard)
export class SaaSBindingController {
  constructor(
    private bindingService: SaaSBindingService,
    private connectorRegistry: ConnectorRegistry,
    private strategyResolver: AuthStrategyResolver,
    @Inject(REDIS) private redis: Redis,
  ) {}

  @Post()
  bind(@Request() req: any, @Body() dto: BindSaasDto) {
    return this.bindingService.bind(req.user.id, {
      connectorId: dto.connectorId,
      authType: dto.authType,
      credential: dto.toCredentialInput(),
      saasUserId: dto.saasUserId,
      saasUsername: dto.saasUsername,
    });
  }

  @Get()
  list(@Request() req: any) {
    return this.bindingService.getBindings(req.user.id);
  }

  @Delete(':id')
  unbind(@Request() req: any, @Param('id') id: string) {
    return this.bindingService.unbind(req.user.id, id);
  }

  @Post('oauth2/authorize')
  async authorizeOAuth2(@Request() req: any, @Body() dto: OAuth2AuthorizeDto) {
    const connector = this.connectorRegistry.get(dto.connectorId);
    const config = connector.getAuthStrategyConfig('oauth2_code');
    if (!config) {
      return { error: 'Connector does not support OAuth2' };
    }

    const state = randomUUID();
    const stateKey = `oauth:state:${state}`;

    // Store state with userId and connectorId, 10 min TTL
    await this.redis.set(
      stateKey,
      JSON.stringify({ userId: req.user.id, connectorId: dto.connectorId }),
      'EX',
      600,
    );

    const authorizeUrl = `${config.params.authorizeUrl}?response_type=code&client_id=${config.params.clientId}&redirect_uri=${this.buildCallbackUrl()}&state=${state}&scope=${config.params.scopes || ''}`;

    return { authorizeUrl, state };
  }

  private buildCallbackUrl(): string {
    const port = process.env.SERVER_PORT || '4000';
    const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;
    return `${serverUrl}/connectors/oauth2/callback`;
  }
}

@Controller('connectors')
@UseGuards(JwtAuthGuard)
export class ConnectorController {
  constructor(
    private connectorRegistry: ConnectorRegistry,
    private strategyResolver: AuthStrategyResolver,
  ) {}

  @Get(':id/auth-schema')
  getAuthSchema(@Param('id') id: string) {
    const connector = this.connectorRegistry.get(id);
    const strategies = connector.supportedAuthTypes.map((authType) => {
      const strategy = this.strategyResolver.resolve(authType);
      return {
        type: authType,
        formFields: strategy.getFormFields(),
      };
    });
    return { strategies };
  }
}
