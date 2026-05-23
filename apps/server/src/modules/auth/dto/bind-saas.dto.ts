import { IsString, IsIn, IsOptional } from 'class-validator';

export class BindSaasDto {
  @IsString()
  connectorId: string;

  @IsIn(['oauth2', 'api_key'])
  authType: 'oauth2' | 'api_key';

  @IsString()
  credential: string;

  @IsOptional()
  @IsString()
  saasUserId?: string;

  @IsOptional()
  @IsString()
  saasUsername?: string;
}
