import {
  User,
  Event,
  EventStatus,
  Booking,
  Ticket,
  Category,
  ApiResponse,
  PaginatedResponse,
  Proposal,
  Review,
  UpdateProfileInput,
} from '@eventora/shared';
import { getApiBaseUrl } from './apiBase';

const API_BASE = getApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export interface OrganizerEventSummary {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  startDate: string;
  bookedSeats: number;
  totalCapacity: number;
  category: Pick<Category, 'name'>;
  _count: { bookings: number; reviews: number };
}

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('eventora_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.message || `Request failed with status ${res.status}`,
        errors: data.errors,
      };
    }

    return data;
  } catch {
    return {
      success: false,
      message: 'Unable to reach Eventora right now. Check your connection and try again.',
    };
  }
}

export const api = {
  // Auth
  auth: {
    googleSignInUrl: `${API_BASE}/auth/google`,
    me: () => fetcher<User>('/auth/me'),
    login: (body: any) => fetcher<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    register: (body: any) => fetcher<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    logout: () => fetcher<void>('/auth/logout', { method: 'POST' }),
    updateProfile: (body: UpdateProfileInput) => fetcher<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  },

  // Events
  events: {
    list: (params: Record<string, string | number | undefined> = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') searchParams.append(key, String(val));
      });
      return fetcher<PaginatedResponse<Event>>(`/events?${searchParams.toString()}`);
    },
    featured: () => fetcher<Event[]>('/events/featured'),
    categories: () => fetcher<Category[]>('/events/categories'),
    get: (slug: string) => fetcher<Event>(`/events/${slug}`),
    create: (body: any) => fetcher<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    update: (id: string, body: any) => fetcher<Event>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    delete: (id: string) => fetcher<void>(`/events/${id}`, { method: 'DELETE' }),
    publish: (id: string) => fetcher<void>(`/events/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) => fetcher<void>(`/events/${id}/unpublish`, { method: 'POST' }),
  },

  // Bookings
  bookings: {
    list: () => fetcher<Booking[]>('/bookings'),
    get: (id: string) => fetcher<Booking>(`/bookings/${id}`),
    create: (body: { eventId: string; seats: number }) => fetcher<{ booking: Booking; needsPayment: boolean; amount?: number }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    cancel: (id: string, reason?: string) => fetcher<void>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  },

  savedEvents: {
    list: () => fetcher<Array<{ id: string; eventId: string; event: Event }>>('/saved-events'),
    save: (eventId: string) => fetcher<{ id: string; eventId: string }>('/saved-events', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }),
    remove: (eventId: string) => fetcher<void>(`/saved-events/${eventId}`, { method: 'DELETE' }),
  },

  notifications: {
    list: (params: { page?: number; limit?: number } = {}) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
      return fetcher<{
        notifications: Array<{
          id: string; type: string; title: string; message: string;
          link?: string | null; readAt?: string | null; createdAt: string;
        }>;
        total: number; unreadCount: number; page: number; totalPages: number;
      }>(`/notifications?${searchParams.toString()}`);
    },
    markRead: (id: string) => fetcher<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => fetcher<void>('/notifications/read-all', { method: 'POST' }),
  },

  // Payments
  payments: {
    createOrder: (bookingId: string) => fetcher<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      bookingReference: string;
      paymentId?: string;
      devMode?: boolean;
    }>('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    }),
    verify: (body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      bookingId: string;
    }) => fetcher<{ tickets: Ticket[] }>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    devConfirm: (bookingId: string) => fetcher<{ tickets: Ticket[]; simulated?: boolean }>('/payments/dev-confirm', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    }),
  },

  certificates: {
    list: () => fetcher<any[]>('/certificates'),
    generate: (bookingId: string) => fetcher<any>(`/certificates/generate/${bookingId}`, { method: 'POST' }),
    verify: (code: string) => fetcher<any>(`/certificates/verify/${code}`),
  },

  calendar: {
    icsUrl: (eventId: string) => `${API_BASE}/calendar/ics/${eventId}`,
  },

  // Waitlist
  waitlist: {
    join: (eventId: string) => fetcher<any>('/waitlist/join', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }),
    leave: (eventId: string) => fetcher<void>('/waitlist/leave', {
      method: 'DELETE',
      body: JSON.stringify({ eventId }),
    }),
    list: () => fetcher<any[]>('/waitlist'),
    claim: (entryId: string) => fetcher<void>(`/waitlist/claim/${entryId}`, { method: 'POST' }),
  },

  // Tickets & Check-in
  tickets: {
    get: (code: string) => fetcher<Ticket>(`/tickets/${code}`),
    checkin: (code: string, method: 'QR' | 'Manual' = 'QR') => fetcher<{ status: string; ticket: Ticket }>(`/tickets/${encodeURIComponent(code)}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),
    forBooking: (bookingId: string) => fetcher<Ticket[]>(`/tickets/booking/${bookingId}`),
  },

  // Reviews
  reviews: {
    forEvent: (eventId: string) => fetcher<{ reviews: Review[]; average: number | null; total: number }>(`/reviews/event/${eventId}`),
    create: (body: { eventId: string; rating: number; comment?: string }) => fetcher<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  },

  // Recommendations
  recommendations: {
    get: () => fetcher<Event[]>('/recommendations'),
  },

  // Organizer
  organizer: {
    dashboard: () => fetcher<any>('/organizer/dashboard'),
    events: () => fetcher<OrganizerEventSummary[]>('/organizer/events'),
    attendees: (eventId: string) => fetcher<any[]>(`/organizer/events/${eventId}/attendees`),
    analytics: (eventId: string) => fetcher<any>(`/organizer/events/${eventId}/analytics`),
  },

  // Admin
  admin: {
    dashboard: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => sp.append(key, String(value)));
      const query = sp.toString();
      return fetcher<any>(`/admin/dashboard${query ? `?${query}` : ''}`);
    },
    users: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return fetcher<any>(`/admin/users?${sp.toString()}`);
    },
    user: (id: string) => fetcher<any>(`/admin/users/${encodeURIComponent(id)}`),
    updateUserRole: (id: string, role: string, reason: string) => fetcher<any>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, reason }),
    }),
    updateUserSuspension: (id: string, suspended: boolean, reason: string) => fetcher<any>(`/admin/users/${id}/suspension`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended, reason }),
    }),
    events: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return fetcher<any>(`/admin/events?${sp.toString()}`);
    },
    bookings: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return fetcher<any>(`/admin/bookings?${sp.toString()}`);
    },
    updateEventStatus: (id: string, status: string, reason: string) => fetcher<any>(`/admin/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
    categories: () => fetcher<any[]>('/admin/categories'),
    createCategory: (body: Record<string, string>) => fetcher<any>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    updateCategory: (id: string, body: Record<string, string>) => fetcher<any>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    removeCategory: (id: string, reason: string) => fetcher<void>(`/admin/categories/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
    waitlists: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return fetcher<any>(`/admin/waitlists?${sp.toString()}`);
    },
    promoteWaitlist: (eventId: string, reason: string) => fetcher<any>('/admin/waitlists/promote', {
      method: 'POST',
      body: JSON.stringify({ eventId, reason }),
    }),
    removeWaitlist: (id: string, reason: string) => fetcher<any>(`/admin/waitlists/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
    reviews: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return fetcher<any>(`/admin/reviews?${sp.toString()}`);
    },
    moderateReview: (id: string, status: string, reason: string) => fetcher<any>(`/admin/reviews/${id}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
    audit: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return fetcher<any>(`/admin/audit?${sp.toString()}`);
    },
    systemStatus: () => fetcher<any>('/admin/system-status'),
    checkins: (eventId?: string) => fetcher<any[]>(`/admin/checkins${eventId ? `?eventId=${eventId}` : ''}`),
    scannerCheckin: (code: string, method: 'QR' | 'Manual' = 'QR') => fetcher<{ status: string; ticket: any }>(`/admin/scanner/tickets/${encodeURIComponent(code)}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),
    exportBookingsUrl: () => `${API_BASE}/admin/export/bookings`,
    downloadCsv: async (path: string, filename: string): Promise<{ success: boolean; message?: string }> => {
      const headers = new Headers();
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('eventora_token');
        if (token) headers.set('Authorization', `Bearer ${token}`);
      }
      try {
        const response = await fetch(`${API_BASE}${path}`, { headers, credentials: 'include' });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return { success: false, message: error.message || 'Report export failed.' };
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
        return { success: true };
      } catch {
        return { success: false, message: 'Unable to reach the report service.' };
      }
    },
  },

  support: {
    mine: () => fetcher<any[]>('/support/mine'),
    create: (body: Record<string, string>) => fetcher<any>('/support', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    adminList: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => sp.append(key, String(value)));
      return fetcher<any>(`/support/admin?${sp.toString()}`);
    },
    update: (id: string, body: Record<string, string | null>) => fetcher<any>(`/support/admin/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  },

  // Proposals
  proposals: {
    list: () => fetcher<Proposal[]>('/proposals'),
    create: (body: any) => fetcher<Proposal>('/proposals', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    adminList: () => fetcher<Proposal[]>('/proposals/admin'),
    approve: (id: string, adminNotes: string) => fetcher<any>(`/proposals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes }),
    }),
    reject: (id: string, rejectionReason: string) => fetcher<any>(`/proposals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    }),
  },
};
