import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCategoryEventImageUrl, resolveEventImageUrl } from './eventImage';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveEventImageUrl', () => {
  it('repairs malformed legacy Unsplash paths', () => {
    expect(resolveEventImageUrl('https://images.unsplash.com/photo:abc?w=800')).toBe(
      'https://images.unsplash.com/photo-abc?w=800',
    );
  });

  it('resolves uploaded relative paths against the API host', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api');
    expect(resolveEventImageUrl('/uploads/event-cover.jpg')).toBe(
      'http://localhost:4000/uploads/event-cover.jpg',
    );
  });

  it('preserves protocol-relative image URLs as HTTPS', () => {
    expect(resolveEventImageUrl('//images.unsplash.com/photo-123?w=800')).toBe(
      'https://images.unsplash.com/photo-123?w=800',
    );
  });

  it('uses the existing category-specific event imagery when a record has no cover', () => {
    expect(getCategoryEventImageUrl('technology')).toBe(
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
    );
    expect(getCategoryEventImageUrl('arts-culture')).toBe(
      'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&auto=format&fit=crop',
    );
    expect(getCategoryEventImageUrl('Arts & Culture')).toBe(
      'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&auto=format&fit=crop',
    );
    expect(getCategoryEventImageUrl('music')).toBeNull();
    expect(getCategoryEventImageUrl('unknown')).toBeNull();
  });

  it('returns null for missing or unsupported image values', () => {
    expect(resolveEventImageUrl(null)).toBeNull();
    expect(resolveEventImageUrl('javascript:alert(1)')).toBeNull();
  });
});
