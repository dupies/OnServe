// New modular schemas
export * from './booking';
export * from './quote';
export * from './payment';

// Legacy schemas (auth, booking, quote request, dispute, rating)
export {
  loginSchema,
  otpSchema,
  bookingSchema,
  quoteRequestSchema,
  disputeSchema,
  ratingSchema,
  type LoginInput,
  type OtpInput,
  type BookingInput,
  type QuoteRequestInput,
  type DisputeInput,
  type RatingInput,
} from '../schemas.ts';
