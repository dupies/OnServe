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
  const { data: profile } = await supabase
    .from('provider_profiles')
    .select('id')
    .single();
  if (!profile) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*)')
    .eq('provider_id', profile.id)
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
  const { data: serviceType, error: stError } = await supabase
    .from('service_types')
    .select('base_price')
    .eq('id', input.serviceTypeId)
    .single();
  if (stError) throw new Error(stError.message);

  const basePrice = (serviceType?.base_price as number) ?? 0;
  const platformFee = basePrice * 0.05;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      service_type_id: input.serviceTypeId,
      location_id: input.locationId,
      booking_type: 'instant',
      status: 'pending',
      total_amount: basePrice + platformFee,
      scheduled_at: input.scheduledAt,
      customer_notes: input.customerNotes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'in_progress') updates['provider_checked_in_at'] = new Date().toISOString();
  if (status === 'completed') updates['provider_checked_out_at'] = new Date().toISOString();

  const { error } = await supabase.from('bookings').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function acceptBooking(id: string): Promise<void> {
  return updateBookingStatus(id, 'confirmed');
}

export async function checkIn(id: string): Promise<void> {
  return updateBookingStatus(id, 'in_progress');
}

export async function checkOut(id: string): Promise<void> {
  return updateBookingStatus(id, 'completed');
}
