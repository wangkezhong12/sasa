import { IsOptional, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsUUID()
  connectorId?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
