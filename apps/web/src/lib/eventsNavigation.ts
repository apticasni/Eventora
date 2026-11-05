export const eventNavigationLinks = {
  explore: '/events',
  masterclasses: '/events?type=masterclass',
  workshops: '/events?type=workshop',
} as const;

export function getCategoryFilter(searchParams: { get(name: string): string | null }): string {
  return searchParams.get('category') || 'all';
}

export function getEventsHrefWithCategory(
  searchParams: { toString(): string },
  category: string,
): string {
  const params = new URLSearchParams(searchParams.toString());
  if (category === 'all') {
    params.delete('category');
  } else {
    params.set('category', category);
  }
  const query = params.toString();
  return query ? `${eventNavigationLinks.explore}?${query}` : eventNavigationLinks.explore;
}

export function getEventsHrefWithType(
  searchParams: { toString(): string },
  type: 'workshop' | 'masterclass' | 'all',
): string {
  const params = new URLSearchParams(searchParams.toString());
  if (type === 'all') {
    params.delete('type');
  } else {
    params.set('type', type);
  }
  const query = params.toString();
  return query ? `${eventNavigationLinks.explore}?${query}` : eventNavigationLinks.explore;
}
