import { supabase } from '@/lib/supabase';
import type { Payment } from '@onserve/types';

function mapRow(r: Record<string, unknown>): Payment {
  return {
    id: r['id'] as string,
    bookingId: r['booking_id'] as string,
    customerId: r['customer_id'] as string,
    amount: r['amount'] as number,
    depositAmount: r['deposit_amount'] as number,
    balanceAmount: r['balance_amount'] as number,
    status: r['status'] as Payment['status'],
    paymentGateway: r['payment_gateway'] as Payment['paymentGateway'],
    gatewayTransactionId: r['gateway_transaction_id'] as string | null,
    gatewayReference: r['gateway_reference'] as string | null,
    escrowedAt: r['escrowed_at'] as string | null,
    releasedAt: r['released_at'] as string | null,
    createdAt: r['created_at'] as string,
  };
}

export async function createOzowPayment(bookingId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('ozow-create-payment', {
    body: { bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { url: string };
}

export async function getPaymentByBookingId(bookingId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}
