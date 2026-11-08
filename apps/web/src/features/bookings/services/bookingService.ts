import { supabase } from '@/lib/supabase';
import type { Booking, BookingStatus } from '@onserve/types';
import type { BookingInput } from '@onserve/shared';

function mapRow(r: Record<string, unknown>): Booking {
  return {
    id: r['id'] as string,
    customerId: r['customer_id'] as string,
    providerId: r['provider_id'] as string | null,
    serviceTypeId: r['service_type_id'] as string,
    locationId: r['location_id'] as string,
    bookingType: r['booking_type'] as Booking['bookingType'],
    status: r['status'] as BookingStatus,
    totalAmount: r['total_amount'] as number,
    servicePrice: (r['service_price'] as number | null) ?? null,
    platformFee: (r['platform_fee'] as number | null) ?? null,
    cancellationCutoffMinutes: (r['cancellation_cutoff_minutes'] as number | undefined) ?? 60,
    depositAmount: r['deposit_amount'] as number | null,
    customerNotes: r['customer_notes'] as string | null,
    scheduledAt: r['scheduled_at'] as string,
    providerCheckedInAt: r['provider_checked_in_at'] as string | null,
    providerCheckedOutAt: r['provider_checked_out_at'] as string | null,
    completedAt: r['completed_at'] as string | null,
    cancelledAt: r['cancelled_at'] as string | null,
    cancellationReason: r['cancellation_reason'] as string | null,
    createdAt: r['created_at'] as string,
    // joined relations passed through
    ...('service_types' in r && { serviceType: r['service_types'] }),
    ...('saved_locations' in r && { location: r['saved_locations'] }),
    ...('provider' in r && { provider: r['provider'] }),
  } as Booking;
}

export async function getCustomerBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*), provider:provider_profiles(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getProviderBookings(): Promise<Booking[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Must filter by user_id: all verified profiles are readable, so an
  // unfiltered .single() errors as soon as there is more than one provider.
  const { data: profile } = await supabase
    .from('provider_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) return [];

  // Only fully paid bookings reach the provider: unpaid drafts are invisible.
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*), payments!inner(status)')
    .eq('provider_id', profile.id)
    .eq('payments.status', 'escrowed')
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .order('scheduled_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getBookingById(id: string): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*), provider:provider_profiles(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Price, fee, status and type are set by the database (price_booking_insert
  // trigger) from the provider's listed price. total_amount is required by the
  // column but overwritten server-side.
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,
      provider_id: input.providerId ?? null,
      service_type_id: input.serviceTypeId,
      location_id: input.locationId,
      total_amount: 0,
      scheduled_at: input.scheduledAt,
      customer_notes: input.customerNotes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

// The database validates who may make each status change and stamps
// check-in/check-out/cancel times itself (guard_bookings_update trigger).
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function acceptBooking(id: string): Promise<void> {
  return updateBookingStatus(id, 'confirmed');
}

/**
 * Customer starts the service once the provider has arrived (booking day only).
 * Future: the provider sends a "ready to start" request that the customer
 * accepts; this call stays the customer's action.
 */
export async function startService(id: string): Promise<void> {
  return updateBookingStatus(id, 'in_progress');
}

/** Provider marks the job done; starts the 48h hold before auto-release. */
export async function checkOut(id: string): Promise<void> {
  return updateBookingStatus(id, 'completed');
}
