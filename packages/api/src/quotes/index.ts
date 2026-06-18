/**
 * Quote Service
 * Handles quote CRUD operations via Supabase
 *
 * Phase 2b Batch 2: Core quote management for booking workflow
 * Manages quote lifecycle: creation, retrieval, acceptance, rejection, expiration
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateQuoteInput, AcceptQuoteInput } from '@onserve/shared';

// Map database snake_case to TypeScript camelCase
interface QuoteRow {
  id: string;
  booking_id: string;
  provider_id: string;
  quoted_amount: number;
  estimated_duration: number;
  notes: string | null;
  expires_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: QuoteRow) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    providerId: row.provider_id,
    quotedAmount: row.quoted_amount,
    estimatedDuration: row.estimated_duration,
    notes: row.notes,
    expiresAt: row.expires_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createQuote(
  supabase: SupabaseClient,
  input: CreateQuoteInput
) {
  const expiresAt =
    input.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h default

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      booking_id: input.bookingId,
      provider_id: input.providerId,
      quoted_amount: input.quotedAmount,
      estimated_duration: input.estimatedDuration,
      notes: input.notes || null,
      expires_at: expiresAt,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as QuoteRow);
}

export async function getQuote(supabase: SupabaseClient, quoteId: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select(
      `
      *,
      provider:provider_id(id, name, avatar_url, rating),
      booking:booking_id(*)
    `
    )
    .eq('id', quoteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw new Error(error.message);
  }

  return {
    ...mapRow(data as QuoteRow),
    provider: data.provider,
    booking: data.booking,
  };
}

export async function getQuoteForBooking(
  supabase: SupabaseClient,
  bookingId: string
) {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw new Error(error.message);
  }

  return mapRow(data as QuoteRow);
}

export async function getQuotesForBooking(
  supabase: SupabaseClient,
  bookingId: string
) {
  const { data, error } = await supabase
    .from('quotes')
    .select(
      `
      *,
      provider:provider_id(id, name, avatar_url, rating)
    `
    )
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...mapRow(row as QuoteRow),
    provider: row.provider,
  }));
}

export async function getQuotesForProvider(
  supabase: SupabaseClient,
  providerId: string,
  status?: string
) {
  let query = supabase
    .from('quotes')
    .select('*')
    .eq('provider_id', providerId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as QuoteRow));
}

export async function acceptQuote(
  supabase: SupabaseClient,
  quoteId: string,
  input: AcceptQuoteInput
) {
  // Update quote status
  const { error: quoteError } = await supabase
    .from('quotes')
    .update({ status: 'accepted' })
    .eq('id', quoteId);

  if (quoteError) throw new Error(quoteError.message);

  // Update booking status to 'quoted'
  const { data, error: bookingError } = await supabase
    .from('bookings')
    .update({ status: 'quoted' })
    .eq('id', input.bookingId)
    .select()
    .single();

  if (bookingError) throw new Error(bookingError.message);
  return data;
}

export async function rejectQuote(
  supabase: SupabaseClient,
  quoteId: string
) {
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'rejected' })
    .eq('id', quoteId);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateQuote(
  supabase: SupabaseClient,
  quoteId: string,
  updates: {
    quotedAmount?: number;
    estimatedDuration?: number;
    notes?: string;
    expiresAt?: string;
  }
) {
  const patch: Record<string, unknown> = {};
  if (updates.quotedAmount !== undefined)
    patch.quoted_amount = updates.quotedAmount;
  if (updates.estimatedDuration !== undefined)
    patch.estimated_duration = updates.estimatedDuration;
  if (updates.notes !== undefined) patch.notes = updates.notes || null;
  if (updates.expiresAt !== undefined) patch.expires_at = updates.expiresAt;

  const { data, error } = await supabase
    .from('quotes')
    .update(patch)
    .eq('id', quoteId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as QuoteRow);
}

export async function expireQuote(
  supabase: SupabaseClient,
  quoteId: string
) {
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'expired' })
    .eq('id', quoteId);

  if (error) throw new Error(error.message);
  return { success: true };
}
