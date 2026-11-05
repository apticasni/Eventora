import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from './apiBase';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadApi(apiUrl: string) {
  vi.stubEnv('NEXT_PUBLIC_API_URL', apiUrl);
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const { api } = await import('./api');
  return { api, fetchMock };
}

describe('authentication API requests', () => {
  it('uses the production API route and includes cross-origin credentials when the base is an origin', async () => {
    const { api, fetchMock } = await loadApi('https://eventora-p6rk.onrender.com/');
    const body = { email: 'person@example.com', password: 'not-a-real-password' };

    await api.auth.login(body);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://eventora-p6rk.onrender.com/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(body),
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
  });

  it('does not duplicate /api when the configured base already includes it', async () => {
    const { api, fetchMock } = await loadApi('https://eventora-p6rk.onrender.com/api/');

    await api.auth.register({
      name: 'Test User',
      email: 'person@example.com',
      password: 'not-a-real-password',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://eventora-p6rk.onrender.com/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('normalizes API origins and repeated /api suffixes to exactly one /api segment', () => {
    expect(getApiBaseUrl('https://eventora.example')).toBe('https://eventora.example/api');
    expect(getApiBaseUrl('https://eventora.example/api/')).toBe('https://eventora.example/api');
    expect(getApiBaseUrl('https://eventora.example/api/api')).toBe('https://eventora.example/api');
    expect(() => getApiBaseUrl(undefined, true)).toThrow(
      'NEXT_PUBLIC_API_URL must be configured for production builds.',
    );
    expect(() => getApiBaseUrl('http://eventora.example', true)).toThrow(
      'NEXT_PUBLIC_API_URL must use HTTPS in production.',
    );
  });

  it('targets backend Google OAuth through the configured API base', async () => {
    const { api } = await loadApi('https://eventora-p6rk.onrender.com');
    expect(api.auth.googleSignInUrl).toBe('https://eventora-p6rk.onrender.com/api/auth/google');
  });

  it('fetches event listings from the configured public events route', async () => {
    const { api, fetchMock } = await loadApi('https://eventora-p6rk.onrender.com/api/');

    await api.events.list({ limit: 12 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://eventora-p6rk.onrender.com/api/events?limit=12',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('returns a safe connection error when the API cannot be reached', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://eventora-p6rk.onrender.com/api');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private network detail')));
    const { api } = await import('./api');

    const response = await api.events.list();

    expect(response.success).toBe(false);
    expect(response.message).toBe('Unable to reach Eventora right now. Check your connection and try again.');
  });
});
