import type { AuthStrategyConfig, CredentialPayload } from '@sasa/shared';
import type { AuthStrategy, FormField } from '../auth-strategy';

export class OAuth2CodeStrategy implements AuthStrategy {
  readonly type = 'oauth2_code' as const;

  getFormFields(): FormField[] {
    // OAuth2 uses browser redirect, no form fields needed
    return [];
  }

  async validateAndBuild(
    input: Record<string, string>,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload> {
    const code = input.code?.trim();
    if (!code) throw new Error('Authorization code is required');

    const redirectUri = input.redirectUri;
    const tokenData = await this.exchangeCodeForToken(code, redirectUri, config);

    return {
      type: 'oauth2_code',
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      clientId: config.params.clientId,
      clientSecret: config.params.clientSecret,
    };
  }

  buildAuthHeaders(creds: CredentialPayload): Record<string, string> {
    if (creds.type !== 'oauth2_code' || !creds.accessToken) return {};
    return { Authorization: `Bearer ${creds.accessToken}` };
  }

  isExpired(creds: CredentialPayload): boolean {
    if (creds.type !== 'oauth2_code') return false;
    if (!creds.expiresAt) return false;
    return Date.now() >= creds.expiresAt;
  }

  async refreshToken(
    creds: CredentialPayload,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload> {
    if (creds.type !== 'oauth2_code') return creds;
    if (!creds.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenUrl = config.params.tokenUrl;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
        client_id: creds.clientId ?? config.params.clientId,
        client_secret: creds.clientSecret ?? config.params.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${text}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      ...creds,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? creds.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  private async exchangeCodeForToken(
    code: string,
    redirectUri: string | undefined,
    config: AuthStrategyConfig,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number }> {
    const tokenUrl = config.params.tokenUrl;
    const params: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: config.params.clientId,
      client_secret: config.params.clientSecret,
    };
    if (redirectUri) {
      params.redirect_uri = redirectUri;
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${text}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}
