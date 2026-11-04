import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAllowedOrigins } from '../src/lib/cors';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('CORS origin configuration', () => {
  it('normalizes and allows exact comma-separated frontend origins', () => {
    expect(getAllowedOrigins('https://eventora.example/, https://preview.eventora.example'))
      .toEqual(['https://eventora.example', 'https://preview.eventora.example']);
  });

  it('rejects insecure origins in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getAllowedOrigins('http://eventora.example'))
      .toThrow('FRONTEND_URL must use HTTPS in production.');
  });

  it('requires an explicit frontend origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getAllowedOrigins(undefined))
      .toThrow('FRONTEND_URL must be configured in production.');
  });

  it('rejects invalid configured origins', () => {
    expect(() => getAllowedOrigins('not-an-origin')).toThrow(
      'FRONTEND_URL must contain valid frontend origins.',
    );
  });
});
