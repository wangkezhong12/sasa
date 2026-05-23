import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateToolDto {
  @IsOptional()
  @IsIn(['read', 'write', 'delete'])
  riskLevel?: string;

  @IsOptional()
  @IsString()
  requiredPermission?: string;
}
