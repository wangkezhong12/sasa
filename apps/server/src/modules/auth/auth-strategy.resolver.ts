import { Injectable } from '@nestjs/common';
import type { AuthType } from '@sasa/shared';
import type { AuthStrategy } from '@sasa/connector-sdk';
import {
  ApiKeyStrategy,
  AppSecretStrategy,
  BasicAuthStrategy,
  OAuth2CodeStrategy,
} from '@sasa/connector-sdk';

@Injectable()
export class AuthStrategyResolver {
  private readonly strategies: Map<AuthType, AuthStrategy>;

  constructor() {
    this.strategies = new Map<AuthType, AuthStrategy>([
      ['api_key', new ApiKeyStrategy()],
      ['app_secret', new AppSecretStrategy()],
      ['basic_auth', new BasicAuthStrategy()],
      ['oauth2_code', new OAuth2CodeStrategy()],
    ]);
  }

  resolve(authType: AuthType): AuthStrategy {
    const strategy = this.strategies.get(authType);
    if (!strategy) {
      throw new Error(`Unknown auth type: ${authType}`);
    }
    return strategy;
  }
}
