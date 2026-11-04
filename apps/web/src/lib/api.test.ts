import { afterEach, describe, expect, it, vi } from 'vitest';

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
});
