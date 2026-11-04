import { describe, expect, it } from 'vitest';
import { AppError } from '../src/middleware/errorHandler';
import { createCsv, csvCell, parseAdminDateRange, parsePage, waitlistAvailableSeats } from '../src/lib/adminTools';

describe('admin management utilities', () => {
  it('validates bounded pagination values', () => {
    expect(parsePage(undefined, 20, 100)).toBe(20);
    expect(parsePage('50', 20, 100)).toBe(50);
    expect(() => parsePage('0', 20, 100)).toThrow(AppError);
    expect(() => parsePage('101', 20, 100)).toThrow(AppError);
    expect(() => parsePage('1.5', 20, 100)).toThrow(AppError);
  });

  it('validates date ranges and includes the full end date', () => {
    const range = parseAdminDateRange(
      { from: '2026-01-02', to: '2026-01-03' },
      new Date('2026-01-03T12:00:00.000Z'),
    );
    expect(range.start.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-01-03T23:59:59.999Z');
    expect(() => parseAdminDateRange({ from: '2026-02-02', to: '2026-02-01' })).toThrow(AppError);
    expect(() => parseAdminDateRange({ from: '2026-02-30' })).toThrow(AppError);
  });

  it('escapes CSV fields and neutralizes spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("https://example.com")')).toBe('"\u0027=HYPERLINK(""https://example.com"")"');
    expect(createCsv(['Name', 'Value'], [['Ada, Example', '+SUM(A1:A2)']]))
      .toBe(`"Name","Value"\r\n"Ada, Example","'+SUM(A1:A2)"`);
  });

  it('does not offer more waitlist seats than available capacity', () => {
    expect(waitlistAvailableSeats(10, 8, 1)).toBe(1);
    expect(waitlistAvailableSeats(10, 8, 2)).toBe(0);
    expect(waitlistAvailableSeats(10, 12, 0)).toBe(0);
  });
});
