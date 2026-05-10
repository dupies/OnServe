import { supabase } from '@/lib/supabase';

export type QuoteRequestInput = {
  serviceTypeId: string;
  locationId: string;
  problemDescription: string;
  expiresInHours: '24' | '48' | '72';
};

export async function createQuoteRequest(input: QuoteRequestInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const expiresAt = new Date(
    Date.now() + parseInt(input.expiresInHours) * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from('quote_requests').insert({
    customer_id: user.id,
    service_type_id: input.serviceTypeId,
    location_id: input.locationId,
    problem_description: input.problemDescription,
    status: 'open',
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
}
