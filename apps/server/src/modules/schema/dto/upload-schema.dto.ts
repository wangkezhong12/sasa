import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UploadSchemaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(500000)
  schema: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
