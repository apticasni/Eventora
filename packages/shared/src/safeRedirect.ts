export const DEFAULT_AUTH_REDIRECT = '/dashboard/bookings';

const REDIRECT_BASE = 'https://eventora.invalid';
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MALFORMED_ESCAPE = /%(?![0-9a-f]{2})/i;

/** Return a local path suitable for a post-authentication navigation. */
export function getSafeRedirectPath(
  candidate?: string | null,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  if (
    !candidate
    || candidate.length > 2048
    || candidate !== candidate.trim()
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || CONTROL_CHARACTERS.test(candidate)
    || MALFORMED_ESCAPE.test(candidate)
  ) return fallback;

  try {
    let decoded = candidate;
    for (let i = 0; i < 5 && /%[0-9a-f]{2}/i.test(decoded); i += 1) {
      decoded = decodeURIComponent(decoded);
      if (decoded.startsWith('//') || decoded.includes('\\') || CONTROL_CHARACTERS.test(decoded)) {
        return fallback;
      }
    }
    if (/%[0-9a-f]{2}/i.test(decoded)) return fallback;

    const parsed = new URL(candidate, REDIRECT_BASE);
    if (parsed.origin !== REDIRECT_BASE || parsed.username || parsed.password) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
