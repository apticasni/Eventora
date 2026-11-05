import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTH_REDIRECT, getSafeRedirectPath } from './safeRedirect';

describe('safe post-authentication redirects', () => {
  it('allows same-origin relative paths with query strings and fragments', () => {
    expect(getSafeRedirectPath('/events?category=design#upcoming'))
      .toBe('/events?category=design#upcoming');
  });

  it.each([
    '//attacker.example/path',
    'https://attacker.example/path',
    'javascript:alert(1)',
    '/\\attacker.example/path',
    '/%2f%2fattacker.example/path',
    '/%252f%252fattacker.example/path',
    '/broken%escape',
    '/bad%FFpath',
    ' /events',
    '/events\u0000',
  ])('rejects unsafe or malformed value %s', (candidate) => {
    expect(getSafeRedirectPath(candidate)).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('uses the supplied safe fallback for missing values', () => {
    expect(getSafeRedirectPath(null, '/events')).toBe('/events');
  });
});
