/**
 * Payment Service
 * Handles payment operations via Supabase and Ozow integration
 *
 * Phase 2b Batch 2: Core payment management integrating with Ozow payment gateway
 * Manages payment lifecycle: creation, status tracking, refunds
 * Edge functions are required for Ozow API calls:
 * - functions/create-ozow-session/ — Creates Ozow payment session
 * - functions/refund-ozow-payment/ — Refunds Ozow payment
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatePaymentInput, PaymentReturnInput } from '@onserve/shared/schemas/payment';

// Map database snake_case to TypeScript camelCase
interface PaymentRow {
  id: string;
  booking_id: string;
  transaction_id: string | null;
  status: string;
  error_message: string | null;
  payment_method: string | null;
  amount: number;
  currency: string;
  processed_at: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: PaymentRow) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    transactionId: row.transaction_id,
    status: row.status,
    errorMessage: row.error_message,
    paymentMethod: row.payment_method,
    amount: row.amount,
    currency: row.currency,
    processedAt: row.processed_at,
    refundReason: row.refund_reason,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createOzowPayment(
  supabase: SupabaseClient,
  input: CreatePaymentInput
) {
  // Call Supabase edge function to create Ozow session
  const { data, error } = await supabase.functions.invoke(
    'create-ozow-session',
    {
      body: {
        bookingId: input.bookingId,
        amount: input.amount,
        currency: input.currency || 'ZAR',
        paymentMethod: input.paymentMethod,
      },
    }
  );

  if (error) throw new Error(error.message);

  // Create payment record with pending status
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: input.bookingId,
      amount: input.amount,
      currency: input.currency || 'ZAR',
      payment_method: input.paymentMethod,
      status: 'pending',
    })
    .select()
    .single();

  if (paymentError) throw new Error(paymentError.message);

  return {
    ...mapRow(paymentData as PaymentRow),
    paymentUrl: data.paymentUrl,
    sessionId: data.sessionId,
  };
}

export async function recordPayment(
  supabase: SupabaseClient,
  input: PaymentReturnInput
) {
  // Record payment in database
  const { data, error } = await supabase
    .from('payments')
    .insert({
      booking_id: input.bookingId,
      transaction_id: input.transactionId || null,
      status: input.status,
      error_message: input.errorMessage || null,
      processed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update booking status based on payment success
  if (input.status === 'success') {
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
      })
      .eq('id', input.bookingId);
  } else if (input.status === 'failed') {
    await supabase
      .from('bookings')
      .update({
        payment_status: 'failed',
      })
      .eq('id', input.bookingId);
  } else if (input.status === 'cancelled') {
    await supabase
      .from('bookings')
      .update({
        payment_status: 'cancelled',
      })
      .eq('id', input.bookingId);
  }

  return mapRow(data as PaymentRow);
}

export async function getPayment(
  supabase: SupabaseClient,
  paymentId: string
) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw new Error(error.message);
  }

  return mapRow(data as PaymentRow);
}

export async function getPaymentStatus(
  supabase: SupabaseClient,
  bookingId: string
) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw new Error(error.message);
  }

  return mapRow(data as PaymentRow);
}

export async function getPaymentHistory(
  supabase: SupabaseClient,
  bookingId: string
) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as PaymentRow));
}

export async function refundPayment(
  supabase: SupabaseClient,
  paymentId: string,
  reason: string
) {
  // Get payment details first
  const payment = await getPayment(supabase, paymentId);
  if (!payment) throw new Error('Payment not found');

  // Call Ozow refund API via edge function
  const { data, error } = await supabase.functions.invoke(
    'refund-ozow-payment',
    {
      body: {
        transactionId: payment.transactionId,
        reason,
      },
    }
  );

  if (error) throw new Error(error.message);

  // Update payment record
  const { data: updatedPayment, error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'refunded',
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  return {
    ...mapRow(updatedPayment as PaymentRow),
    ozowRefundResponse: data,
  };
}

export async function updatePaymentStatus(
  supabase: SupabaseClient,
  paymentId: string,
  status: string,
  transactionId?: string
) {
  const patch: Record<string, unknown> = {
    status,
    processed_at: new Date().toISOString(),
  };

  if (transactionId) {
    patch.transaction_id = transactionId;
  }

  const { data, error } = await supabase
    .from('payments')
    .update(patch)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as PaymentRow);
}

export async function getProviderPayments(
  supabase: SupabaseClient,
  providerId: string,
  status?: string
) {
  let query = supabase
    .from('payments')
    .select(
      `
      *,
      booking:booking_id(provider_id)
    `
    )
    .eq('booking.provider_id', providerId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as PaymentRow));
}
