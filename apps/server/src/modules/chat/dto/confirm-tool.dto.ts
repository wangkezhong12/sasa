import { IsString, IsIn, IsOptional, IsUUID, IsObject } from 'class-validator';

export class ConfirmToolDto {
  @IsString()
  confirmationId: string;

  @IsIn(['confirm', 'cancel', 'modify'])
  action: 'confirm' | 'cancel' | 'modify';

  @IsUUID()
  conversationId: string;

  @IsUUID()
  connectorId: string;

  @IsString()
  toolName: string;

  @IsObject()
  toolArguments: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  modifiedParameters?: Record<string, unknown>;
}
