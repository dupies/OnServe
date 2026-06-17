import { describe, it, expect } from 'vitest';
import {
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
} from './schemas/booking';
import {
  createQuoteSchema,
  acceptQuoteSchema,
} from './schemas/quote';
import {
  createPaymentSchema,
  paymentReturnSchema,
} from './schemas/payment';

describe('Booking Schemas', () => {
  describe('createBookingSchema', () => {
    it('should parse valid booking input', () => {
      const validInput = {
        serviceTypeId: '123e4567-e89b-12d3-a456-426614174000',
        providerId: '223e4567-e89b-12d3-a456-426614174000',
        scheduledAt: '2026-06-20T10:00:00Z',
        addressId: '323e4567-e89b-12d3-a456-426614174000',
        notes: 'Please be quiet',
        estimatedDuration: 2,
      };
      expect(() => createBookingSchema.parse(validInput)).not.toThrow();
    });

    it('should parse valid booking without optional fields', () => {
      const validInput = {
        serviceTypeId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledAt: '2026-06-20T10:00:00Z',
        addressId: '323e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => createBookingSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid service type ID', () => {
      const invalidInput = {
        serviceTypeId: 'not-a-uuid',
        scheduledAt: '2026-06-20T10:00:00Z',
        addressId: '323e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => createBookingSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidInput = {
        serviceTypeId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledAt: 'not-a-date',
        addressId: '323e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => createBookingSchema.parse(invalidInput)).toThrow();
    });

    it('should reject notes exceeding 500 characters', () => {
      const invalidInput = {
        serviceTypeId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledAt: '2026-06-20T10:00:00Z',
        addressId: '323e4567-e89b-12d3-a456-426614174000',
        notes: 'a'.repeat(501),
      };
      expect(() => createBookingSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid estimated duration', () => {
      const invalidInput = {
        serviceTypeId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledAt: '2026-06-20T10:00:00Z',
        addressId: '323e4567-e89b-12d3-a456-426614174000',
        estimatedDuration: 0.25,
      };
      expect(() => createBookingSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('updateBookingSchema', () => {
    it('should parse valid update input', () => {
      const validInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledAt: '2026-06-21T14:00:00Z',
      };
      expect(() => updateBookingSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid booking ID', () => {
      const invalidInput = {
        bookingId: 'not-a-uuid',
        scheduledAt: '2026-06-21T14:00:00Z',
      };
      expect(() => updateBookingSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('cancelBookingSchema', () => {
    it('should parse valid cancel input', () => {
      const validInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'Changed my mind about the booking',
      };
      expect(() => cancelBookingSchema.parse(validInput)).not.toThrow();
    });

    it('should reject reason less than 5 characters', () => {
      const invalidInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'No',
      };
      expect(() => cancelBookingSchema.parse(invalidInput)).toThrow();
    });

    it('should reject reason exceeding 200 characters', () => {
      const invalidInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'a'.repeat(201),
      };
      expect(() => cancelBookingSchema.parse(invalidInput)).toThrow();
    });
  });
});

describe('Quote Schemas', () => {
  describe('createQuoteSchema', () => {
    it('should parse valid quote input', () => {
      const validInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        providerId: '223e4567-e89b-12d3-a456-426614174000',
        quotedAmount: 250.50,
        estimatedDuration: 3,
        notes: 'Includes materials',
      };
      expect(() => createQuoteSchema.parse(validInput)).not.toThrow();
    });

    it('should parse valid quote without optional fields', () => {
      const validInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        providerId: '223e4567-e89b-12d3-a456-426614174000',
        quotedAmount: 250.50,
        estimatedDuration: 3,
      };
      expect(() => createQuoteSchema.parse(validInput)).not.toThrow();
    });

    it('should reject zero or negative amount', () => {
      const invalidInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        providerId: '223e4567-e89b-12d3-a456-426614174000',
        quotedAmount: -50,
        estimatedDuration: 3,
      };
      expect(() => createQuoteSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid duration', () => {
      const invalidInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        providerId: '223e4567-e89b-12d3-a456-426614174000',
        quotedAmount: 250.50,
        estimatedDuration: 0.25,
      };
      expect(() => createQuoteSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('acceptQuoteSchema', () => {
    it('should parse valid accept quote input', () => {
      const validInput = {
        quoteId: '123e4567-e89b-12d3-a456-426614174000',
        bookingId: '223e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => acceptQuoteSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid quote ID', () => {
      const invalidInput = {
        quoteId: 'not-a-uuid',
        bookingId: '223e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => acceptQuoteSchema.parse(invalidInput)).toThrow();
    });
  });
});

describe('Payment Schemas', () => {
  describe('createPaymentSchema', () => {
    it('should parse valid payment input with defaults', () => {
      const validInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 500.00,
      };
      const parsed = createPaymentSchema.parse(validInput);
      expect(parsed.currency).toBe('ZAR');
      expect(parsed.paymentMethod).toBe('ozow_eft');
    });

    it('should parse valid payment with all fields', () => {
      const validInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 500.00,
        currency: 'ZAR',
        paymentMethod: 'yoco_card',
      };
      expect(() => createPaymentSchema.parse(validInput)).not.toThrow();
    });

    it('should reject zero or negative amount', () => {
      const invalidInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 0,
      };
      expect(() => createPaymentSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid payment method', () => {
      const invalidInput = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 500.00,
        paymentMethod: 'stripe',
      };
      expect(() => createPaymentSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('paymentReturnSchema', () => {
    it('should parse successful payment return', () => {
      const validInput = {
        status: 'success',
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        transactionId: 'txn_abc123',
      };
      expect(() => paymentReturnSchema.parse(validInput)).not.toThrow();
    });

    it('should parse failed payment return with error message', () => {
      const validInput = {
        status: 'failed',
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
        errorMessage: 'Insufficient funds',
      };
      expect(() => paymentReturnSchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid status', () => {
      const invalidInput = {
        status: 'pending',
        bookingId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => paymentReturnSchema.parse(invalidInput)).toThrow();
    });
  });
});
