import type { ApiResponse, Event, PaginatedResponse } from '@eventora/shared';

export type EventsDiscoveryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; events: Event[]; total: number; page: number; totalPages: number };

export const initialEventsDiscoveryState: EventsDiscoveryState = { status: 'loading' };

export function eventsDiscoveryStateFromResponse(
  response: ApiResponse<PaginatedResponse<Event>>,
): EventsDiscoveryState {
  if (!response.success) {
    return {
      status: 'error',
      message: response.message || 'Unable to load experiences. Please try again.',
    };
  }

  if (!Array.isArray(response.data?.items)) {
    return {
      status: 'error',
      message: 'The event service returned an invalid response. Please try again.',
    };
  }

  return {
    status: 'success',
    events: response.data.items,
    total: response.data.total,
    page: response.data.page,
    totalPages: response.data.totalPages,
  };
}
