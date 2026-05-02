import { z } from 'zod';

export const loginSchema = z.object({
  phone: z
    .string()
    .min(9, 'Enter a valid SA mobile number')
    .regex(/^[0-9\s]+$/, 'Numbers only'),
});

export const otpSchema = z.object({
  token: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Digits only'),
});

export const bookingSchema = z.object({
  serviceTypeId: z.string().uuid('Select a service'),
  locationId: z.string().uuid('Select a location'),
  scheduledAt: z.string().min(1, 'Select a date and time'),
  customerNotes: z.string().max(500).optional(),
});

export const quoteRequestSchema = z.object({
  serviceTypeId: z.string().uuid('Select a service'),
  locationId: z.string().uuid('Select a location'),
  problemDescription: z.string().min(10, 'Describe the problem (min 10 chars)').max(1000),
  expiresInHours: z.enum(['24', '48', '72']),
});

export const disputeSchema = z.object({
  reason: z.enum(['work_not_completed', 'quality_not_acceptable', 'provider_no_show']),
  description: z.string().min(10, 'Describe what happened (min 10 chars)').max(1000),
});

export const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
