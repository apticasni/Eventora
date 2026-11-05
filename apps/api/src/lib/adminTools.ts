import { AppError } from '../middleware/errorHandler';

export type AdminDateRange = {
  start: Date;
  end: Date;
};

export function parsePage(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new AppError(400, 'Pagination values must be positive integers.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new AppError(400, `Pagination value must be between 1 and ${max}.`);
  }
  return parsed;
}

export function parseAdminDateRange(query: Record<string, unknown>, now = new Date()): AdminDateRange {
  const end = query.to === undefined ? now : parseDate(query.to, 'to');
  const start = query.from === undefined
    ? new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
    : parseDate(query.from, 'from');
  if (start > end) throw new AppError(400, 'The start date must be on or before the end date.');
  if (end.getTime() - start.getTime() > 365 * 24 * 60 * 60 * 1000) {
    throw new AppError(400, 'Date ranges cannot exceed 366 days.');
  }
  end.setUTCHours(23, 59, 59, 999);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

function parseDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, `${field} must be a date in YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, `${field} must be a valid calendar date.`);
  }
  return date;
}

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function waitlistAvailableSeats(capacity: number, booked: number, activeOffers: number): number {
  return Math.max(0, capacity - booked - activeOffers);
}
