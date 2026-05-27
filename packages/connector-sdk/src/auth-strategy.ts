import type { AuthType, AuthStrategyConfig, CredentialPayload } from '@sasa/shared';

export type { AuthType, AuthStrategyConfig, CredentialPayload };

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  helpText?: string;
  required: boolean;
}

export interface AuthStrategy {
  readonly type: AuthType;

  getFormFields(): FormField[];

  validateAndBuild(
    input: Record<string, string>,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload>;

  buildAuthHeaders(creds: CredentialPayload, config?: AuthStrategyConfig): Record<string, string>;

  isExpired?(creds: CredentialPayload): boolean;

  refreshToken?(
    creds: CredentialPayload,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload>;
}
