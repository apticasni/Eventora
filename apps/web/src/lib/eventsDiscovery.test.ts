import { describe, expect, it } from 'vitest';
import {
  eventsDiscoveryStateFromResponse,
  initialEventsDiscoveryState,
} from './eventsDiscovery';

describe('events discovery state', () => {
  it('starts in a loading state instead of showing mock events', () => {
    expect(initialEventsDiscoveryState).toEqual({ status: 'loading' });
  });

  it('preserves an empty successful API result as an empty event list', () => {
    expect(eventsDiscoveryStateFromResponse({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 12, totalPages: 0 },
    })).toEqual({ status: 'success', events: [] });
  });

  it('exposes API errors instead of treating them as empty results', () => {
    expect(eventsDiscoveryStateFromResponse({
      success: false,
      message: 'Events are temporarily unavailable.',
    })).toEqual({ status: 'error', message: 'Events are temporarily unavailable.' });
  });

  it('rejects a successful response without an event list', () => {
    expect(eventsDiscoveryStateFromResponse({
      success: true,
    })).toEqual({
      status: 'error',
      message: 'The event service returned an invalid response. Please try again.',
    });
  });
});
