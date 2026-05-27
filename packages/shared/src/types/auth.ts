export type AuthType = 'api_key' | 'app_secret' | 'basic_auth' | 'oauth2_code';

export interface AuthStrategyConfig {
  type: AuthType;
  params: Record<string, string>;
}

export type CredentialPayload =
  | { type: 'api_key'; apiKey: string }
  | { type: 'app_secret'; appId: string; appSecret: string; accessToken?: string; expiresAt?: number }
  | { type: 'basic_auth'; username: string; password: string }
  | { type: 'oauth2_code'; accessToken: string; refreshToken?: string; expiresAt?: number; clientId?: string; clientSecret?: string };
