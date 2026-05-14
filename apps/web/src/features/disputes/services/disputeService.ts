import { supabase } from '@/lib/supabase';
import type { Dispute } from '@onserve/types';
import type { DisputeInput } from '@onserve/shared';

function mapRow(r: Record<string, unknown>): Dispute {
  return {
    id: r['id'] as string,
    bookingId: r['booking_id'] as string,
    paymentId: r['payment_id'] as string,
    raisedByUserId: r['raised_by_user_id'] as string,
    reason: r['reason'] as string,
    description: r['description'] as string,
    evidenceUrls: (r['evidence_urls'] as string[]) ?? [],
    status: r['status'] as Dispute['status'],
    resolvedByAdminId: r['resolved_by_admin_id'] as string | null,
    resolutionNotes: r['resolution_notes'] as string | null,
    createdAt: r['created_at'] as string,
    resolvedAt: r['resolved_at'] as string | null,
  };
}

export async function createDispute(bookingId: string, input: DisputeInput): Promise<Dispute> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: payment, error: pErr } = await supabase
    .from('payments')
    .select('id')
    .eq('booking_id', bookingId)
    .single();
  if (pErr) throw new Error(pErr.message);

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      booking_id: bookingId,
      payment_id: payment.id,
      raised_by_user_id: user.id,
      reason: input.reason,
      description: input.description,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'disputed' })
    .eq('id', bookingId);
  if (updateErr) throw new Error(updateErr.message);

  return mapRow(data);
}

export async function getDisputeByBooking(bookingId: string): Promise<Dispute | null> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

export async function getDisputeById(id: string): Promise<Dispute> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}
