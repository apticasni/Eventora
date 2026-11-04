export const eventNavigationLinks = {
  explore: '/events',
  masterclasses: '/events?category=technology',
  workshops: '/events?category=design',
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
