import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (typeof dateString !== 'string' && !(dateString instanceof Date)) return 'Date unavailable';
  const dateOnly = typeof dateString === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  // Calendar dates have no instant or timezone. Anchor them at UTC noon and
  // format in UTC so the selected day is stable in every browser and server.
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12))
    : typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(dateString)
      // A timestamp without a zone is otherwise parsed in the machine's local
      // timezone. Treat it explicitly as UTC; zoned timestamps remain instants.
      ? new Date(`${dateString}Z`)
      : typeof dateString === 'string' ? new Date(dateString) : dateString;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  };
  if (dateOnly) defaultOptions.timeZone = 'UTC';
  if (Number.isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', defaultOptions);
}

export function formatTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
