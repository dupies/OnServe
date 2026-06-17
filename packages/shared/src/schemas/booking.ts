import { z } from 'zod';

export const createBookingSchema = z.object({
  serviceTypeId: z.string().uuid('Invalid service type ID'),
  providerId: z.string().uuid('Invalid provider ID').optional(),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  scheduledAt: z.string().datetime('Invalid date format').describe('Scheduled booking date and time in ISO 8601 format'),
  addressId: z.string().uuid('Invalid address ID'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  estimatedDuration: z.number().min(0.5, 'Duration must be at least 30 minutes').optional().describe('Estimated duration in hours'),
});

export const updateBookingSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  scheduledAt: z.string().datetime('Invalid date format').optional(),
  addressId: z.string().uuid('Invalid address ID').optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(200, 'Reason must be 200 characters or less'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
