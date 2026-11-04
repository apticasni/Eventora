import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getGoogleOAuthConfig,
  GOOGLE_CALLBACK_PATH,
} from '../src/lib/googleOAuthConfig';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Google OAuth configuration', () => {
  const validConfig = {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_CALLBACK_URL: `http://localhost:4000${GOOGLE_CALLBACK_PATH}`,
    NODE_ENV: 'development',
  };

  it('reads the client credentials and exact API callback URL', () => {
    expect(getGoogleOAuthConfig(validConfig)).toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      callbackUrl: `http://localhost:4000${GOOGLE_CALLBACK_PATH}`,
    });
  });

  it('rejects missing credentials and callback URLs for a different route', () => {
    expect(() => getGoogleOAuthConfig({ ...validConfig, GOOGLE_CLIENT_SECRET: '' }))
      .toThrow('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL must all be configured.');
    expect(() => getGoogleOAuthConfig({
      ...validConfig,
      GOOGLE_CALLBACK_URL: 'http://localhost:4000/api/auth/callback',
    })).toThrow(`GOOGLE_CALLBACK_URL must point to ${GOOGLE_CALLBACK_PATH}.`);
  });

  it('requires HTTPS callbacks in production', () => {
    expect(() => getGoogleOAuthConfig({
      ...validConfig,
      NODE_ENV: 'production',
      GOOGLE_CALLBACK_URL: `http://eventora.example${GOOGLE_CALLBACK_PATH}`,
    })).toThrow('GOOGLE_CALLBACK_URL must use HTTPS in production.');
  });

  it('rejects callback URLs containing credentials or query parameters', () => {
    expect(() => getGoogleOAuthConfig({
      ...validConfig,
      GOOGLE_CALLBACK_URL: `http://user:pass@localhost:4000${GOOGLE_CALLBACK_PATH}`,
    })).toThrow(`GOOGLE_CALLBACK_URL must point to ${GOOGLE_CALLBACK_PATH}.`);
    expect(() => getGoogleOAuthConfig({
      ...validConfig,
      GOOGLE_CALLBACK_URL: `http://localhost:4000${GOOGLE_CALLBACK_PATH}?next=/`,
    })).toThrow(`GOOGLE_CALLBACK_URL must point to ${GOOGLE_CALLBACK_PATH}.`);
  });
});
