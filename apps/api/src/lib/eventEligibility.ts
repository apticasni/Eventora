export function isEventRegistrationOpen(status: string, startDate: Date, now: Date = new Date()): boolean {
  return status === 'PUBLISHED' && startDate > now;
}

export function isEventReviewAvailable(endDate: Date, now: Date = new Date()): boolean {
  return endDate <= now;
}
