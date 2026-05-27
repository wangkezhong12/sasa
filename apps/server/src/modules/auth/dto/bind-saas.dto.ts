import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';
import type { AuthType } from '@sasa/shared';

export class BindSaasDto {
  @IsString()
  connectorId: string;

  @IsIn(['api_key', 'app_secret', 'basic_auth', 'oauth2_code'])
  authType: AuthType;

  @IsObject()
  credential: Record<string, string>;

  @IsOptional()
  @IsString()
  saasUserId?: string;

  @IsOptional()
  @IsString()
  saasUsername?: string;
}
