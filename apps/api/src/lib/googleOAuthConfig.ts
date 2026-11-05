export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export class GoogleOAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleOAuthConfigError';
  }
}

export function getGoogleOAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): GoogleOAuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackUrl = env.GOOGLE_CALLBACK_URL?.trim();

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new GoogleOAuthConfigError(
      'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL must all be configured.',
    );
  }

  let parsedCallback: URL;
  try {
    parsedCallback = new URL(callbackUrl);
  } catch {
    throw new GoogleOAuthConfigError('GOOGLE_CALLBACK_URL must be an absolute URL.');
  }

  if (
    !['http:', 'https:'].includes(parsedCallback.protocol)
    || !parsedCallback.hostname
    || parsedCallback.username
    || parsedCallback.password
    || parsedCallback.search
    || parsedCallback.hash
    || parsedCallback.pathname !== GOOGLE_CALLBACK_PATH
  ) {
    throw new GoogleOAuthConfigError(
      `GOOGLE_CALLBACK_URL must point to ${GOOGLE_CALLBACK_PATH}.`,
    );
  }

  if (env.NODE_ENV === 'production' && parsedCallback.protocol !== 'https:') {
    throw new GoogleOAuthConfigError('GOOGLE_CALLBACK_URL must use HTTPS in production.');
  }

  return { clientId, clientSecret, callbackUrl: parsedCallback.toString() };
}
