export type PaymentStatus =
  | 'pending'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'disputed';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_customer'
  | 'resolved_provider'
  | 'escalated';

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  depositAmount: number;
  balanceAmount: number;
  status: PaymentStatus;
  paymentGateway: 'yoco' | 'peach';
  gatewayTransactionId: string | null;
  gatewayReference: string | null;
  escrowedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  paymentId: string;
  raisedByUserId: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolvedByAdminId: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
