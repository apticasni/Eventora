export function getAllowedOrigins(frontendUrls = process.env.FRONTEND_URL): string[] {
  if (process.env.NODE_ENV === 'production' && !frontendUrls?.trim()) {
    throw new Error('FRONTEND_URL must be configured in production.');
  }

  const configuredOrigins = (frontendUrls || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.map((origin) => {
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
}
