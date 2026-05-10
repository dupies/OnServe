import { supabase } from '@/lib/supabase';
import type { QuoteRequest, Quote } from '@onserve/types';
import type { QuoteRequestInput } from '@onserve/shared';

function mapQuoteRequest(r: Record<string, unknown>): QuoteRequest {
  return {
    id: r['id'] as string,
    bookingId: r['booking_id'] as string | null,
    customerId: r['customer_id'] as string,
    serviceTypeId: r['service_type_id'] as string,
    locationId: r['location_id'] as string,
    problemDescription: r['problem_description'] as string,
    uploadedImageUrls: (r['uploaded_image_urls'] as string[]) ?? [],
    status: r['status'] as QuoteRequest['status'],
    expiresAt: r['expires_at'] as string,
    createdAt: r['created_at'] as string,
  };
}

function mapQuote(r: Record<string, unknown>): Quote {
  return {
    id: r['id'] as string,
    quoteRequestId: r['quote_request_id'] as string,
    providerId: r['provider_id'] as string,
    quotedPrice: r['quoted_price'] as number,
    estimatedDurationMins: r['estimated_duration_mins'] as number | null,
    notes: r['notes'] as string | null,
    status: r['status'] as Quote['status'],
    submittedAt: r['submitted_at'] as string,
    acceptedAt: r['accepted_at'] as string | null,
  };
}

export async function createQuoteRequest(input: QuoteRequestInput): Promise<QuoteRequest> {
  const expiresAt = new Date(
    Date.now() + parseInt(input.expiresInHours) * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('quote_requests')
    .insert({
      service_type_id: input.serviceTypeId,
      location_id: input.locationId,
      problem_description: input.problemDescription,
      status: 'open',
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapQuoteRequest(data);
}

export async function getCustomerQuoteRequests(): Promise<QuoteRequest[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, service_types(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapQuoteRequest);
}

export async function getQuoteRequestById(id: string): Promise<QuoteRequest & { quotes: Quote[] }> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, quotes(*), service_types(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  const quotes = ((data['quotes'] as Record<string, unknown>[]) ?? []).map(mapQuote);
  return { ...mapQuoteRequest(data), quotes };
}

export async function getProviderQuoteRequests(): Promise<QuoteRequest[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, service_types(*)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapQuoteRequest);
}

export async function submitQuote(
  quoteRequestId: string,
  quotedPrice: number,
  estimatedDurationMins: number | null,
  notes: string | null
): Promise<Quote> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('provider_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) throw new Error('No provider profile');

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      quote_request_id: quoteRequestId,
      provider_id: profile.id,
      quoted_price: quotedPrice,
      estimated_duration_mins: estimatedDurationMins,
      notes,
      status: 'submitted',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapQuote(data);
}

export async function acceptQuote(quoteId: string): Promise<void> {
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quoteId);
  if (error) throw new Error(error.message);
}
