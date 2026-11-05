import { describe, expect, it } from 'vitest';
import { demoCategories, demoEvents, getDemoEventDates } from '../src/prisma/demoEventData';

describe('additive demo event data', () => {
  it('defines four topics and nine uniquely identified events', () => {
    expect(demoCategories.map(({ slug }) => slug)).toEqual([
      'technology',
      'design',
      'business',
      'creative-arts',
    ]);
    expect(demoEvents).toHaveLength(9);
    expect(new Set(demoEvents.map(({ slug }) => slug)).size).toBe(demoEvents.length);
  });

  it('covers the requested topics with complete published event data', () => {
    expect(new Set(demoEvents.map(({ categorySlug }) => categorySlug))).toEqual(
      new Set(demoCategories.map(({ slug }) => slug)),
    );
    for (const event of demoEvents) {
      expect(event.slug).toMatch(/^eventora-demo-[a-z0-9-]+$/);
      expect(event.title.length).toBeGreaterThan(10);
      expect(event.description.length).toBeGreaterThan(20);
      expect(event.daysFromNow).toBeGreaterThan(0);
      expect(event.durationHours).toBeGreaterThan(0);
      expect(event.totalCapacity).toBeGreaterThan(0);
      expect(event.price).toBeGreaterThanOrEqual(0);
      expect(event.instructorName).not.toContain('Demo');
      expect(['workshop', 'masterclass']).toContain(event.eventType);
      expect(event.format === 'ONLINE' ? event.city === null : event.venueName).toBeTruthy();
    }
  });

  it('generates future dates with positive durations', () => {
    const now = new Date('2026-11-04T00:00:00.000Z');
    for (const event of demoEvents) {
      const { startDate, endDate } = getDemoEventDates(now, event.daysFromNow, event.durationHours);
      expect(startDate.getTime()).toBeGreaterThan(now.getTime());
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    }
  });
});
