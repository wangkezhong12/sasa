import { IsString } from 'class-validator';

export class OAuth2AuthorizeDto {
  @IsString()
  connectorId: string;
}
