export function getApiBaseUrl(
  configuredApiBase?: string,
  isProduction = process.env.NODE_ENV === 'production',
): string {
  if (!configuredApiBase?.trim() && isProduction) {
    throw new Error('NEXT_PUBLIC_API_URL must be configured for production builds.');
  }

  const normalizedApiBase = (configuredApiBase?.trim() || 'http://localhost:4000').replace(/\/+$/, '');
  const parsedBase = new URL(normalizedApiBase);
  if (!['http:', 'https:'].includes(parsedBase.protocol) || (isProduction && parsedBase.protocol !== 'https:')) {
    throw new Error('NEXT_PUBLIC_API_URL must use HTTPS in production.');
  }
  return `${normalizedApiBase.replace(/(?:\/api)+$/, '')}/api`;
}
