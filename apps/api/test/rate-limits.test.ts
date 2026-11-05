import { describe, expect, it } from 'vitest';
import {
  DEVELOPMENT_AUTH_RATE_LIMIT_MAX,
  getAuthRateLimitMax,
  PRODUCTION_AUTH_RATE_LIMIT_MAX,
} from '../src/lib/rateLimits';

describe('authentication rate limits', () => {
  it('keeps the production limit strict while allowing more local retries', () => {
    expect(getAuthRateLimitMax('production')).toBe(PRODUCTION_AUTH_RATE_LIMIT_MAX);
    expect(PRODUCTION_AUTH_RATE_LIMIT_MAX).toBe(10);
    expect(getAuthRateLimitMax('development')).toBe(DEVELOPMENT_AUTH_RATE_LIMIT_MAX);
    expect(DEVELOPMENT_AUTH_RATE_LIMIT_MAX).toBeGreaterThan(PRODUCTION_AUTH_RATE_LIMIT_MAX);
  });
});
