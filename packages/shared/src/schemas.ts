import { z } from 'zod';

// Auth Schemas
export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(['ATTENDEE', 'ORGANIZER']).optional().default('ATTENDEE'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.union([
    z.string().url().refine((value) => !value.startsWith('data:')),
    z.string()
      .max(300_000, 'Profile photos must be 300 KB or smaller after compression')
      .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
    z.literal(''),
  ]).optional(),
  interests: z.array(z.string()).optional(),
});

// Event Schemas
export const CreateEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20),
  shortDescription: z.string().max(300).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  images: z.array(z.string().url()).optional().default([]),
  categoryId: z.string().cuid(),
  format: z.enum(['IN_PERSON', 'ONLINE', 'HYBRID']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  timezone: z.string().optional().default('Asia/Kolkata'),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional().default('India'),
  onlineLink: z.string().url().optional().or(z.literal('')),
  totalCapacity: z.number().int().min(1).max(10000),
  price: z.number().min(0),
  currency: z.string().optional().default('INR'),
  isFree: z.boolean().optional().default(false),
  instructorName: z.string().optional(),
  instructorBio: z.string().optional(),
  instructorAvatar: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).optional().default([]),
  schedule: z.unknown().optional(),
  requirements: z.array(z.string()).optional().default([]),
  whatYouLearn: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
});

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
});

export const SearchEventsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  format: z.enum(['IN_PERSON', 'ONLINE', 'HYBRID']).optional(),
  city: z.string().optional(),
  isFree: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date', 'popularity', 'price', 'price_desc']).optional().default('date'),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('12'),
  status: z.string().optional(),
});

// Booking Schemas
export const CreateBookingSchema = z.object({
  eventId: z.string().cuid(),
  seats: z.number().int().min(1).max(5),
});

export const CancelBookingSchema = z.object({
  reason: z.string().optional(),
});

// Payment Schemas
export const CreateOrderSchema = z.object({
  bookingId: z.string().cuid(),
});

export const VerifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  bookingId: z.string().cuid(),
});

// Review Schemas
export const CreateReviewSchema = z.object({
  eventId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// Proposal Schemas
export const CreateProposalSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20),
  category: z.string(),
  proposedDate: z.string().datetime().optional(),
  format: z.enum(['IN_PERSON', 'ONLINE', 'HYBRID']).optional().default('IN_PERSON'),
  estimatedCapacity: z.number().int().min(1).optional(),
  price: z.number().min(0).optional(),
});

export const UpdateProposalSchema = CreateProposalSchema.partial();

// Admin Schemas
export const UpdateUserRoleSchema = z.object({
  role: z.enum(['ATTENDEE', 'ORGANIZER', 'ADMIN']),
});

export const ApproveProposalSchema = z.object({
  adminNotes: z.string().optional(),
});

export const RejectProposalSchema = z.object({
  rejectionReason: z.string().min(10),
});

// Type exports from schemas
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type SearchEventsInput = z.infer<typeof SearchEventsSchema>;
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type CreateProposalInput = z.infer<typeof CreateProposalSchema>;
