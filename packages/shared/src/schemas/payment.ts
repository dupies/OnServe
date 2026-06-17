import { z } from 'zod';

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['ZAR']).default('ZAR').describe('Payment currency (ISO 4217 code)'),
  paymentMethod: z.enum(['ozow_eft', 'yoco_card']).default('ozow_eft').describe('Payment method provider'),
});

export const paymentReturnSchema = z.object({
  status: z.enum(['success', 'failed', 'cancelled']).describe('Final payment status'),
  bookingId: z.string().uuid('Invalid booking ID'),
  transactionId: z.string().optional().describe('External transaction ID from payment provider'),
  errorMessage: z.string().optional().describe('Error details if payment failed'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentReturnInput = z.infer<typeof paymentReturnSchema>;
