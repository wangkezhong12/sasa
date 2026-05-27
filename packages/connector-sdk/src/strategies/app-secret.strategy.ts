import type { AuthStrategyConfig, CredentialPayload } from '@sasa/shared';
import type { AuthStrategy, FormField } from '../auth-strategy';

export class AppSecretStrategy implements AuthStrategy {
  readonly type = 'app_secret' as const;

  getFormFields(): FormField[] {
    return [
      { name: 'appId', label: 'App ID', type: 'text', required: true },
      { name: 'appSecret', label: 'App Secret', type: 'password', required: true },
    ];
  }

  async validateAndBuild(
    input: Record<string, string>,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload> {
    const appId = input.appId?.trim();
    const appSecret = input.appSecret?.trim();
    if (!appId) throw new Error('App ID is required');
    if (!appSecret) throw new Error('App Secret is required');

    const tokenData = await this.exchangeToken(appId, appSecret, config);
    return {
      type: 'app_secret',
      appId,
      appSecret,
      accessToken: tokenData.accessToken,
      expiresAt: tokenData.expiresAt,
    };
  }

  buildAuthHeaders(creds: CredentialPayload): Record<string, string> {
    if (creds.type !== 'app_secret' || !creds.accessToken) return {};
    return { Authorization: `Bearer ${creds.accessToken}` };
  }

  isExpired(creds: CredentialPayload): boolean {
    if (creds.type !== 'app_secret') return false;
    if (!creds.expiresAt) return false;
    return Date.now() >= creds.expiresAt;
  }

  async refreshToken(
    creds: CredentialPayload,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload> {
    if (creds.type !== 'app_secret') return creds;
    const tokenData = await this.exchangeToken(creds.appId, creds.appSecret, config);
    return { ...creds, accessToken: tokenData.accessToken, expiresAt: tokenData.expiresAt };
  }

  private async exchangeToken(
    appId: string,
    appSecret: string,
    config: AuthStrategyConfig,
  ): Promise<{ accessToken: string; expiresAt: number }> {
    const tokenUrl = config.params.tokenUrl;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appSecret }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${text}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}
