export function getAllowedOrigins(frontendUrls = process.env.FRONTEND_URL): string[] {
  if (process.env.NODE_ENV === 'production' && !frontendUrls?.trim()) {
    throw new Error('FRONTEND_URL must be configured in production.');
  }

  const configuredOrigins = (frontendUrls || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = configuredOrigins.map((origin) => {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error('FRONTEND_URL must contain valid frontend origins.');
    }

    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol)
      || (process.env.NODE_ENV === 'production' && parsedOrigin.protocol !== 'https:')
    ) {
      throw new Error('FRONTEND_URL must use HTTPS in production.');
    }

    return parsedOrigin.origin;
  });

  // Browsers treat localhost and 127.0.0.1 as different origins even though both
  // resolve to the local machine. Allow either local address during development
  // so the login form works regardless of which address the user opened.
  if (process.env.NODE_ENV !== 'production') {
    for (const origin of [...allowedOrigins]) {
      const parsedOrigin = new URL(origin);
      const loopbackAlias = parsedOrigin.hostname === 'localhost'
        ? '127.0.0.1'
        : parsedOrigin.hostname === '127.0.0.1'
          ? 'localhost'
          : null;
      if (loopbackAlias) {
        parsedOrigin.hostname = loopbackAlias;
        allowedOrigins.push(parsedOrigin.origin);
      }
    }
  }

  return [...new Set(allowedOrigins)];
}
