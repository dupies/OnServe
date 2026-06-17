import { supabase } from '@/lib/supabase';
import type { FeeBreakdown } from '@onserve/types';

interface CreatePaymentResponse {
  paymentUrl: string;
  paymentId: string;
  fees: FeeBreakdown;
}

/**
 * Create a payment for a booking via Ozow
 * Calls Edge Function which handles Ozow API integration
 *
 * @param bookingId - The booking ID to create payment for
 * @returns Payment response with Ozow redirect URL and fee breakdown
 */
export async function createPayment(bookingId: string): Promise<CreatePaymentResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ booking_id: bookingId }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail ?? error.error ?? 'Payment creation failed');
  }

  return response.json();
}

/**
 * Get payment record for a booking
 * Used to check payment status (pending, escrowed, failed, etc.)
 *
 * @param bookingId - The booking ID to fetch payment for
 * @returns Payment record from database
 */
export async function getPaymentByBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Release an escrowed payment to provider
 * Called by customer after service completion (or auto-released after 48h)
 *
 * @param paymentId - The payment ID
 * @returns Release result
 */
export async function releasePayment(paymentId: string) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/release-payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_id: paymentId,
        triggered_by: 'customer',
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail ?? error.error ?? 'Payment release failed');
  }

  return response.json();
}

/**
 * Update provider bank details
 * Called during provider onboarding flow
 *
 * @param providerId - The provider ID
 * @param bankDetails - Bank account details for payouts
 * @returns Updated provider record
 */
export async function updateProviderBankDetails(
  providerId: string,
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    accountType: 'savings' | 'cheque';
    branchCode?: string;
  },
) {
  const { data, error } = await supabase
    .from('provider_profiles')
    .update({
      bank_name: bankDetails.bankName,
      account_number: bankDetails.accountNumber,
      account_holder: bankDetails.accountHolder,
      account_type: bankDetails.accountType,
      branch_code: bankDetails.branchCode,
      bank_verified: false, // Flag for verification via AVS or test payout
    })
    .eq('id', providerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get provider bank details
 * Used to pre-fill bank details edit form
 *
 * @param providerId - The provider ID
 * @returns Provider bank details
 */
export async function getProviderBankDetails(providerId: string) {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('bank_name, account_number, account_holder, account_type, branch_code, bank_verified')
    .eq('id', providerId)
    .single();

  if (error) throw error;
  return data;
}
