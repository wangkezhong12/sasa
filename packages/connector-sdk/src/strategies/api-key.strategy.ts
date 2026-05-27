import type { AuthStrategyConfig, CredentialPayload } from '@sasa/shared';
import type { AuthStrategy, FormField } from '../auth-strategy';

export class ApiKeyStrategy implements AuthStrategy {
  readonly type = 'api_key' as const;

  getFormFields(): FormField[] {
    return [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ];
  }

  async validateAndBuild(
    input: Record<string, string>,
    _config: AuthStrategyConfig,
  ): Promise<CredentialPayload> {
    const apiKey = input.apiKey?.trim();
    if (!apiKey) {
      throw new Error('API Key is required');
    }
    return { type: 'api_key', apiKey };
  }

  buildAuthHeaders(creds: CredentialPayload): Record<string, string> {
    return { Authorization: `Bearer ${creds.apiKey}` };
  }
}
