import { supabase } from '@/lib/supabase';
import type { Dispute, DisputeStatus, User } from '@onserve/types';

function mapDispute(r: Record<string, unknown>): Dispute {
  return {
    id: r['id'] as string,
    bookingId: r['booking_id'] as string,
    paymentId: r['payment_id'] as string,
    raisedByUserId: r['raised_by_user_id'] as string,
    reason: r['reason'] as string,
    description: r['description'] as string,
    evidenceUrls: (r['evidence_urls'] as string[]) ?? [],
    status: r['status'] as DisputeStatus,
    resolvedByAdminId: r['resolved_by_admin_id'] as string | null,
    resolutionNotes: r['resolution_notes'] as string | null,
    createdAt: r['created_at'] as string,
    resolvedAt: r['resolved_at'] as string | null,
  };
}

function mapUser(r: Record<string, unknown>): User {
  return {
    id: r['id'] as string,
    email: r['email'] as string | null,
    phone: r['phone'] as string | null,
    fullName: r['full_name'] as string,
    avatarUrl: r['avatar_url'] as string | null,
    role: r['role'] as User['role'],
    isVerified: r['is_verified'] as boolean,
    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
  };
}

export async function getAdminDisputes(): Promise<Dispute[]> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDispute);
}

export async function getAdminDisputeById(
  id: string,
): Promise<Dispute & { booking: Record<string, unknown> }> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*, booking:bookings(id, status, total_amount, scheduled_at, customer_id, provider_id)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  const booking = (data['booking'] as Record<string, unknown>) ?? {};
  return { ...mapDispute(data), booking };
}

export async function resolveDispute(
  disputeId: string,
  outcome: Extract<DisputeStatus, 'resolved_customer' | 'resolved_provider' | 'escalated'>,
  notes: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('disputes')
    .update({
      status: outcome,
      resolved_by_admin_id: user?.id,
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId);
  if (error) throw new Error(error.message);
}

export async function getAdminUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapUser);
}

export async function updateUserRole(userId: string, role: User['role']): Promise<void> {
  const { error } = await supabase.from('users').update({ role }).eq('id', userId);
  if (error) throw new Error(error.message);
}
