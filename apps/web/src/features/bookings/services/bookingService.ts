import { supabase } from '../../../lib/supabase';
import type { Booking, BookingStatus } from '@onserve/types';

export async function getCustomerBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*), provider:provider_profiles(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Booking[];
}

export async function getBookingById(id: string): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as Booking;
}

export async function createBooking(
  booking: Omit<
    Booking,
    | 'id'
    | 'status'
    | 'createdAt'
    | 'completedAt'
    | 'cancelledAt'
    | 'providerCheckedInAt'
    | 'providerCheckedOutAt'
  >
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...booking, status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Booking;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}
