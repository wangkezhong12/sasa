import { IsString, IsIn, IsOptional, ValidateIf } from 'class-validator';
import type { AuthType } from '@sasa/shared';

export class BindSaasDto {
  @IsString()
  connectorId: string;

  @IsIn(['api_key', 'app_secret', 'basic_auth', 'oauth2_code'])
  authType: AuthType;

  // api_key fields
  @ValidateIf(o => o.authType === 'api_key')
  @IsString()
  apiKey?: string;

  // app_secret fields
  @ValidateIf(o => o.authType === 'app_secret')
  @IsString()
  appId?: string;

  @ValidateIf(o => o.authType === 'app_secret')
  @IsString()
  appSecret?: string;

  // basic_auth fields
  @ValidateIf(o => o.authType === 'basic_auth')
  @IsString()
  username?: string;

  @ValidateIf(o => o.authType === 'basic_auth')
  @IsString()
  password?: string;

  // optional metadata
  @IsOptional()
  @IsString()
  saasUserId?: string;

  @IsOptional()
  @IsString()
  saasUsername?: string;

  /** Extract raw input fields as Record<string, string> for strategy.validateAndBuild */
  toCredentialInput(): Record<string, string> {
    const input: Record<string, string> = {};
    if (this.apiKey) input.apiKey = this.apiKey;
    if (this.appId) input.appId = this.appId;
    if (this.appSecret) input.appSecret = this.appSecret;
    if (this.username) input.username = this.username;
    if (this.password) input.password = this.password;
    return input;
  }
}
