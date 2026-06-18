/**
 * Booking Service
 * Handles booking CRUD operations via Supabase
 *
 * Phase 2b Batch 2: Core booking management for the mobile and web applications
 * Manages booking lifecycle: creation, retrieval, updates, cancellations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  CancelBookingInput,
} from '@onserve/shared';

// Map database snake_case to TypeScript camelCase
interface BookingRow {
  id: string;
  customer_id: string;
  provider_id: string | null;
  service_type_id: string;
  scheduled_at: string;
  address_id: string;
  notes: string | null;
  status: string;
  payment_status: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: BookingRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    providerId: row.provider_id,
    serviceTypeId: row.service_type_id,
    scheduledAt: row.scheduled_at,
    addressId: row.address_id,
    notes: row.notes,
    status: row.status,
    paymentStatus: row.payment_status,
    cancellationReason: row.cancellation_reason,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBooking(
  supabase: SupabaseClient,
  input: CreateBookingInput,
  customerId: string
) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: customerId,
      provider_id: input.providerId || null,
      service_type_id: input.serviceTypeId,
      scheduled_at: input.scheduledAt,
      address_id: input.addressId,
      notes: input.notes || null,
      status: 'pending_quote', // Awaiting provider quote
      payment_status: null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as BookingRow);
}

export async function getBooking(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      provider:provider_id(id, name, avatar_url),
      customer:customer_id(id, name, phone),
      address:address_id(*)
    `
    )
    .eq('id', bookingId)
    .single();

  if (error) throw new Error(error.message);
  return {
    ...mapRow(data as BookingRow),
    provider: data.provider,
    customer: data.customer,
    address: data.address,
  };
}

export async function updateBooking(
  supabase: SupabaseClient,
  bookingId: string,
  input: UpdateBookingInput
) {
  const patch: Record<string, unknown> = {};
  if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
  if (input.addressId !== undefined) patch.address_id = input.addressId;
  if (input.notes !== undefined) patch.notes = input.notes || null;

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as BookingRow);
}

export async function cancelBooking(
  supabase: SupabaseClient,
  bookingId: string,
  input: CancelBookingInput
) {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason: input.reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as BookingRow);
}

export async function getActiveBookings(
  supabase: SupabaseClient,
  customerId: string
) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .in('status', ['pending_quote', 'quoted', 'confirmed', 'in_progress'])
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as BookingRow));
}

export async function getBookingHistory(
  supabase: SupabaseClient,
  customerId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as BookingRow));
}

export async function getProviderBookings(
  supabase: SupabaseClient,
  providerId: string,
  status?: string
) {
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', providerId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('scheduled_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as BookingRow));
}

export async function updateBookingStatus(
  supabase: SupabaseClient,
  bookingId: string,
  status: string,
  metadata?: Record<string, unknown>
) {
  const patch: Record<string, unknown> = { status };
  if (metadata) {
    Object.assign(patch, metadata);
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as BookingRow);
}
