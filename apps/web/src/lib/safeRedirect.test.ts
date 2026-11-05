import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTH_REDIRECT, getPostAuthRedirect, getSafeRedirectPath } from './safeRedirect';

describe('safe post-authentication redirects', () => {
  it('routes admins to the admin dashboard by default and other accounts to bookings', () => {
    expect(getPostAuthRedirect('ADMIN')).toBe('/admin');
    expect(getPostAuthRedirect('ATTENDEE')).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it('preserves safe requested destinations for every role', () => {
    expect(getPostAuthRedirect('ADMIN', '/admin#events')).toBe('/admin#events');
    expect(getPostAuthRedirect('ATTENDEE', '/events?type=workshop')).toBe('/events?type=workshop');
    expect(getPostAuthRedirect('ADMIN', '//outside.test')).toBe('/admin');
  });

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
