export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type BookingType = 'instant' | 'quote_based';

export interface Booking {
  id: string;
  customerId: string;
  providerId: string | null;
  serviceTypeId: string;
  locationId: string;
  bookingType: BookingType;
  status: BookingStatus;
  totalAmount: number;
  depositAmount: number | null;
  customerNotes: string | null;
  scheduledAt: string;
  providerCheckedInAt: string | null;
  providerCheckedOutAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface QuoteRequest {
  id: string;
  bookingId: string | null;
  customerId: string;
  serviceTypeId: string;
  locationId: string;
  problemDescription: string;
  uploadedImageUrls: string[];
  status: 'open' | 'in_review' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
  targetedProviderId: string | null;
}

export interface Quote {
  id: string;
  quoteRequestId: string;
  providerId: string;
  quotedPrice: number;
  estimatedDurationMins: number | null;
  notes: string | null;
  status: 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
  submittedAt: string;
  acceptedAt: string | null;
}
