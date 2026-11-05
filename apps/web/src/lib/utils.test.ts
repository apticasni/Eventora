import { describe, expect, it } from 'vitest';
import { formatDate } from './utils';

describe('formatDate timezone handling', () => {
  it('formats a timestamp in the configured event timezone', () => {
    const timestamp = '2026-11-20T00:30:00.000Z';

    expect(formatDate(timestamp, { timeZone: 'Asia/Kolkata' })).toBe('Fri, Nov 20, 2026');
    expect(formatDate(timestamp, { timeZone: 'America/Los_Angeles' })).toBe('Thu, Nov 19, 2026');
  });

  it('keeps a date-only calendar value on the same day in every timezone', () => {
    expect(formatDate('2026-11-20', { timeZone: 'America/Los_Angeles' })).toBe('Fri, Nov 20, 2026');
    expect(formatDate('2026-11-20', { timeZone: 'Asia/Kolkata' })).toBe('Fri, Nov 20, 2026');
  });

  it('interprets an ISO timestamp without an offset as UTC consistently', () => {
    expect(formatDate('2026-11-20T00:30:00', { timeZone: 'America/Los_Angeles' }))
      .toBe('Thu, Nov 19, 2026');
  });
});
