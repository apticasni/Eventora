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

  it('allows both local loopback hostnames in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getAllowedOrigins('http://localhost:3000'))
      .toEqual(['http://localhost:3000', 'http://127.0.0.1:3000']);
    expect(getAllowedOrigins('http://127.0.0.1:3000'))
      .toEqual(['http://127.0.0.1:3000', 'http://localhost:3000']);
  });

  it('does not add loopback aliases in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getAllowedOrigins('https://eventora.example'))
      .toEqual(['https://eventora.example']);
  });

  it('rejects insecure origins in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getAllowedOrigins('http://eventora.example'))
      .toThrow('FRONTEND_URL must use HTTPS in production.');
  });

  it('requires an explicit frontend origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', '');
    expect(() => getAllowedOrigins(undefined))
      .toThrow('FRONTEND_URL must be configured in production.');
  });

  it('rejects invalid configured origins', () => {
    expect(() => getAllowedOrigins('not-an-origin')).toThrow(
      'FRONTEND_URL must contain valid frontend origins.',
    );
  });
});
