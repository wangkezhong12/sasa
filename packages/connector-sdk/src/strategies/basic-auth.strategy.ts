import type { AuthStrategyConfig, CredentialPayload } from '@sasa/shared';
import type { AuthStrategy, FormField } from '../auth-strategy';

export class BasicAuthStrategy implements AuthStrategy {
  readonly type = 'basic_auth' as const;

  getFormFields(): FormField[] {
    return [
      { name: 'username', label: '用户名', type: 'text', required: true },
      { name: 'password', label: '密码', type: 'password', required: true },
    ];
  }

  async validateAndBuild(
    input: Record<string, string>,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload> {
    const username = input.username?.trim();
    const password = input.password?.trim();
    if (!username) throw new Error('用户名 is required');
    if (!password) throw new Error('密码 is required');

    const loginUrl = config.params.loginUrl;
    if (loginUrl) {
      await this.login(loginUrl, username, password);
    }

    return { type: 'basic_auth', username, password };
  }

  buildAuthHeaders(
    creds: CredentialPayload,
    config?: AuthStrategyConfig,
  ): Record<string, string> {
    if (creds.type !== 'basic_auth') return {};

    const authMode = config?.params?.authMode ?? 'basic';
    if (authMode === 'cookie') {
      // Cookie mode: session is managed externally by CredentialManager
      return {};
    }

    // Basic mode: return Authorization: Basic base64(user:pass)
    const encoded = btoa(`${creds.username}:${creds.password}`);
    return { Authorization: `Basic ${encoded}` };
  }

  async refreshToken(
    creds: CredentialPayload,
    config: AuthStrategyConfig,
  ): Promise<CredentialPayload> {
    if (creds.type !== 'basic_auth') return creds;

    const loginUrl = config.params.loginUrl;
    if (loginUrl) {
      await this.login(loginUrl, creds.username, creds.password);
    }
    return creds;
  }

  private async login(loginUrl: string, username: string, password: string): Promise<void> {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Login failed: ${response.status} ${text}`);
    }
  }
}
