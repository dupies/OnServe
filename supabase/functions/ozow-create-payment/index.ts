import { createClient } from 'npm:@supabase/supabase-js@2';
import { requestPaymentUrl, type OzowPaymentRequest } from '../_shared/ozow.ts';
import { corsHeaders } from '../_shared/cors.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !user) return json(401, { error: 'Not authenticated' });

  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) return json(400, { error: 'bookingId is required' });

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id, customer_id, status, total_amount')
    .eq('id', bookingId)
    .single();
  if (bookingError || !booking) return json(404, { error: 'Booking not found' });
  if (booking.customer_id !== user.id) return json(403, { error: 'Not your booking' });
  if (booking.status === 'cancelled') return json(409, { error: 'Booking is cancelled' });

  const { data: existing } = await admin
    .from('payments')
    .select('id, status')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (existing && !['pending', 'failed'].includes(existing.status)) {
    return json(409, { error: `Booking already has a ${existing.status} payment` });
  }

  // Amount is computed server-side from the booking — never trusted from the client.
  const amount = Number(booking.total_amount).toFixed(2);
  const transactionReference = `ONS-${bookingId.slice(0, 8)}-${Date.now()}`;

  const paymentRow = {
    booking_id: bookingId,
    customer_id: user.id,
    amount: booking.total_amount,
    status: 'pending',
    payment_gateway: 'ozow',
    gateway_reference: transactionReference,
  };
  const { error: upsertError } = existing
    ? await admin.from('payments').update(paymentRow).eq('id', existing.id)
    : await admin.from('payments').insert(paymentRow);
  if (upsertError) return json(500, { error: upsertError.message });

  const webAppUrl = Deno.env.get('WEB_APP_URL')!; // e.g. https://onserve.vercel.app
  const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ozow-webhook`;
  const resultUrl = (outcome: string) =>
    `${webAppUrl}/payment/result?bookingId=${bookingId}&outcome=${outcome}`;

  const ozowRequest: OzowPaymentRequest = {
    siteCode: Deno.env.get('OZOW_SITE_CODE')!,
    countryCode: 'ZA',
    currencyCode: 'ZAR',
    amount,
    transactionReference,
    bankReference: 'ONSERVE',
    cancelUrl: resultUrl('cancel'),
    errorUrl: resultUrl('error'),
    successUrl: resultUrl('success'),
    notifyUrl,
    isTest: Deno.env.get('OZOW_IS_TEST') === 'true',
  };

  try {
    const url = await requestPaymentUrl(
      ozowRequest,
      Deno.env.get('OZOW_PRIVATE_KEY')!,
      Deno.env.get('OZOW_API_KEY')!,
    );
    return json(200, { url });
  } catch (e) {
    return json(502, { error: e instanceof Error ? e.message : 'Ozow request failed' });
  }
});
