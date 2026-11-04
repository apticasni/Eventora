import { describe, expect, it } from 'vitest';
import {
  eventNavigationLinks,
  getCategoryFilter,
  getEventsHrefWithCategory,
} from './eventsNavigation';

describe('event navigation', () => {
  it('points navigation labels to the intended event catalog views', () => {
    expect(eventNavigationLinks).toEqual({
      explore: '/events',
      masterclasses: '/events?category=technology',
      workshops: '/events?category=design',
    });
  });

  it('reads the category from the current URL and defaults to all categories', () => {
    expect(getCategoryFilter(new URLSearchParams('category=technology'))).toBe('technology');
    expect(getCategoryFilter(new URLSearchParams('category=design'))).toBe('design');
    expect(getCategoryFilter(new URLSearchParams('q=design'))).toBe('all');
  });

  it('changes or clears the category while preserving other query parameters', () => {
    const current = new URLSearchParams('q=leadership&category=technology');
    expect(getEventsHrefWithCategory(current, 'design')).toBe(
      '/events?q=leadership&category=design',
    );
    expect(getEventsHrefWithCategory(current, 'all')).toBe('/events?q=leadership');
  });
});
