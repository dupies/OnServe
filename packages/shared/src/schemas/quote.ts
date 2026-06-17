import { z } from 'zod';

export const createQuoteSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  providerId: z.string().uuid('Invalid provider ID'),
  quotedAmount: z.number().positive('Amount must be positive'),
  estimatedDuration: z.number().min(0.5, 'Duration must be at least 30 minutes').describe('Estimated duration in hours'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  expiresAt: z.string().datetime('Invalid date format').optional().describe('Quote expiration date in ISO 8601 format'),
});

export const acceptQuoteSchema = z.object({
  quoteId: z.string().uuid('Invalid quote ID'),
  bookingId: z.string().uuid('Invalid booking ID'),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type AcceptQuoteInput = z.infer<typeof acceptQuoteSchema>;
