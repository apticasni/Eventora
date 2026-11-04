import { describe, expect, it } from 'vitest';
import { isEventRegistrationOpen, isEventReviewAvailable } from '../src/lib/eventEligibility';

describe('event eligibility', () => {
  const now = new Date('2026-06-24T12:00:00.000Z');

  it('only allows registration for published events that have not started', () => {
    expect(isEventRegistrationOpen('PUBLISHED', new Date('2026-06-25T12:00:00.000Z'), now)).toBe(true);
    expect(isEventRegistrationOpen('PUBLISHED', now, now)).toBe(false);
    expect(isEventRegistrationOpen('DRAFT', new Date('2026-06-25T12:00:00.000Z'), now)).toBe(false);
  });

  it('only makes reviews available after an event ends', () => {
    expect(isEventReviewAvailable(new Date('2026-06-24T11:59:59.000Z'), now)).toBe(true);
    expect(isEventReviewAvailable(now, now)).toBe(true);
    expect(isEventReviewAvailable(new Date('2026-06-24T12:00:01.000Z'), now)).toBe(false);
  });
});
