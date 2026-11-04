import { getApiBaseUrl } from './apiBase';

const CATEGORY_EVENT_IMAGES: Record<string, string> = {
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop',
  workshops: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop',
  design: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop',
  'arts-culture': 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&auto=format&fit=crop',
  photography: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&auto=format&fit=crop',
  education: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop',
  community: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop',
  'health-wellness': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop',
  cooking: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop',
  leadership: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop',
};

export function resolveEventImageUrl(value?: string | null): string | null {
  const image = value?.trim();
  if (!image) return null;

  const normalized = image.replace(
    /(https?:\/\/images\.unsplash\.com\/)photo:/i,
    '$1photo-',
  );
  if (/^data:image\//i.test(normalized)) return normalized;

  try {
    if (normalized.startsWith('//')) return `https:${normalized}`;
    const apiOrigin = new URL(getApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)).origin;
    const url = new URL(normalized, `${apiOrigin}/`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getCategoryEventImageUrl(categorySlug?: string | null): string | null {
  if (!categorySlug) return null;
  const key = categorySlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return CATEGORY_EVENT_IMAGES[key] || null;
}
