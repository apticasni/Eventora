const positiveStatuses = new Set(['PUBLISHED', 'CONFIRMED', 'CAPTURED', 'RESOLVED', 'ACTIVE']);
const cautionStatuses = new Set(['PENDING', 'WAITING', 'OFFERED', 'NEW', 'IN_PROGRESS', 'DRAFT']);

export function getAdminStatusPresentation(value: unknown): {
  label: string;
  tone: 'positive' | 'caution' | 'neutral';
} {
  if (typeof value !== 'string' || !value.trim()) {
    return { label: 'UNKNOWN', tone: 'neutral' };
  }

  const normalized = value.trim().toUpperCase();
  return {
    label: normalized.replace(/_/g, ' '),
    tone: positiveStatuses.has(normalized)
      ? 'positive'
      : cautionStatuses.has(normalized)
        ? 'caution'
        : 'neutral',
  };
}
