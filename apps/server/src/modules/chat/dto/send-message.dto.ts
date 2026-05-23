import { IsString, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsUUID()
  connectorId?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
