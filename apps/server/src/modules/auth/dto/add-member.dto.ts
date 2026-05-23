import { IsString, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsIn(['admin', 'member'])
  role: 'admin' | 'member' = 'member';
}
