export type PaymentGateway = 'ozow';

export type PaymentStatus =
  | 'pending'      // Payment record created, Ozow redirect initiated
  | 'escrowed'     // Ozow confirmed payment, funds in float
  | 'released'     // Payout sent to provider
  | 'refunded'     // Refund issued to customer
  | 'disputed'     // Frozen — admin investigating
  | 'cancelled';   // Payment abandoned or failed at Ozow

export interface FeeBreakdown {
  servicePrice: number;
  platformFee: number;
  subtotal: number;
  transactionFee: number;
  totalCharged: number;
  providerPayout: number;
  onserveRevenue: number;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  customer_id: string;
  amount: number;                // totalCharged (what customer paid)
  platform_fee: number;
  transaction_fee: number;
  provider_payout: number;
  status: PaymentStatus;
  payment_gateway: PaymentGateway;
  ozow_transaction_id: string | null;
  ozow_payout_id: string | null;
  escrowed_at: string | null;
  released_at: string | null;
  payout_at: string | null;
  created_at: string;
}

// Ozow webhook notification fields (from hub.ozow.com)
export interface OzowNotification {
  SiteCode: string;
  TransactionId: string;
  TransactionReference: string;
  Amount: string;
  Status: OzowTransactionStatus;
  Optional1: string;            // booking_id
  Optional2: string;            // payment_id
  Optional3: string;            // provider_profile_id
  Optional4: string;            // customer_id
  Optional5: string;            // reserved
  CurrencyCode: string;
  IsTest: string;
  StatusMessage: string;
  Hash: string;
}

export type OzowTransactionStatus =
  | 'Complete'
  | 'Cancelled'
  | 'Error'
  | 'Abandoned'
  | 'PendingInvestigation'
  | 'Pending';
