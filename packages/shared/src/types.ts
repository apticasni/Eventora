// Shared types and enums
export type Role = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventFormat = 'IN_PERSON' | 'ONLINE' | 'HYBRID';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'CONFIRMED' | 'EXPIRED' | 'WITHDRAWN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  bio?: string | null;
  interests: string[];
  googleId?: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  color?: string | null;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  coverImage?: string | null;
  images: string[];
  category: Category;
  categoryId: string;
  organizer: Pick<User, 'id' | 'name' | 'avatar' | 'bio'>;
  organizerId: string;
  status: EventStatus;
  format: EventFormat;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  onlineLink?: string | null;
  totalCapacity: number;
  bookedSeats: number;
  availableSeats: number;
  price: number;
  currency: string;
  isFree: boolean;
  instructorName?: string | null;
  instructorBio?: string | null;
  instructorAvatar?: string | null;
  tags: string[];
  schedule?: unknown;
  requirements: string[];
  whatYouLearn: string[];
  isFeatured: boolean;
  viewCount: number;
  reviewCount?: number;
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  reference: string;
  userId: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  event?: Event;
  eventId: string;
  status: BookingStatus;
  seats: number;
  totalAmount: number;
  currency: string;
  payment?: Payment | null;
  tickets?: Ticket[];
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  bookingId: string;
  booking?: Booking;
  seatNumber: number;
  qrCode?: string | null;
  isCheckedIn: boolean;
  checkIn?: CheckIn | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  webhookVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  eventId: string;
  event?: Event;
  status: WaitlistStatus;
  position: number;
  offeredAt?: string | null;
  offerExpiresAt?: string | null;
  createdAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  proposedDate?: string | null;
  format: EventFormat;
  estimatedCapacity?: number | null;
  price?: number | null;
  status: ProposalStatus;
  organizerId: string;
  organizer?: Pick<User, 'id' | 'name' | 'email'>;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'name' | 'avatar'>;
  eventId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'name'>;
  eventId: string;
  event?: Pick<Event, 'id' | 'title'>;
  code: string;
  issuedAt: string;
}

export interface CheckIn {
  id: string;
  ticketId: string;
  eventId: string;
  staffId: string;
  staff?: Pick<User, 'id' | 'name'>;
  checkedInAt: string;
  method: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalAttendance: number;
  recentRegistrations: number;
}
