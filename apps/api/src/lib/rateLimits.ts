export const PRODUCTION_AUTH_RATE_LIMIT_MAX = 10;
export const DEVELOPMENT_AUTH_RATE_LIMIT_MAX = 50;
export const PASSWORD_RECOVERY_RATE_LIMIT_MAX = 5;

export function getAuthRateLimitMax(environment = process.env.NODE_ENV): number {
  return environment === 'production'
    ? PRODUCTION_AUTH_RATE_LIMIT_MAX
    : DEVELOPMENT_AUTH_RATE_LIMIT_MAX;
}
