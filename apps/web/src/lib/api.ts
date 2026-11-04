import {
  User,
  Event,
  EventStatus,
  Booking,
  Ticket,
  Category,
  ApiResponse,
  PaginatedResponse,
  DashboardStats,
  Proposal,
  Review,
  UpdateProfileInput,
} from '@eventora/shared';

const configuredApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const normalizedApiBase = configuredApiBase.replace(/\/+$/, '');
const API_BASE = normalizedApiBase.endsWith('/api')
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

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
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Network error occurred. Please check backend connection.',
    };
  }
}

export const api = {
  // Auth
  auth: {
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
    forgotPassword: (email: string) => fetcher<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
    resetPassword: (body: any) => fetcher<void>('/auth/reset-password', {
      method: 'POST',
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
    checkin: (code: string, method: string = 'QR') => fetcher<{ ticket: Ticket }>(`/tickets/${code}/checkin`, {
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
    dashboard: () => fetcher<DashboardStats>('/admin/dashboard'),
    users: (params: Record<string, string | number> = {}) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.append(k, String(v)));
      return fetcher<any>(`/admin/users?${sp.toString()}`);
    },
    updateUserRole: (id: string, role: string) => fetcher<any>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
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
    analyticsRegistrations: () => fetcher<any[]>('/admin/analytics/registrations'),
    analyticsRevenue: () => fetcher<any[]>('/admin/analytics/revenue'),
    analyticsCategories: () => fetcher<any[]>('/admin/analytics/categories'),
    checkins: (eventId?: string) => fetcher<any[]>(`/admin/checkins${eventId ? `?eventId=${eventId}` : ''}`),
    exportBookingsUrl: () => `${API_BASE}/admin/export/bookings`,
  },

  // Proposals
  proposals: {
    list: () => fetcher<Proposal[]>('/proposals'),
    create: (body: any) => fetcher<Proposal>('/proposals', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    adminList: () => fetcher<Proposal[]>('/proposals/admin'),
    approve: (id: string, adminNotes?: string) => fetcher<any>(`/proposals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes }),
    }),
    reject: (id: string, rejectionReason: string) => fetcher<any>(`/proposals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    }),
  },
};
