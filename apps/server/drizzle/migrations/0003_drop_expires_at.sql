-- Rename old oauth2 auth type values
UPDATE saas_bindings SET auth_type = 'oauth2_code' WHERE auth_type = 'oauth2';

-- Drop expiresAt column (expiration is now managed within CredentialPayload JSON)
ALTER TABLE saas_bindings DROP COLUMN IF EXISTS expires_at;
