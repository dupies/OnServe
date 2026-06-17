import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateFees } from '@onserve/shared';
import { generateOzowRequestHash } from '@onserve/shared/ozow';
import { config } from '../_shared/config.ts';

serve(async (req: Request) => {
  // 1. Auth — verify the calling user via JWT
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    config.app.supabaseUrl,
    config.app.supabaseServiceKey,
  );
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    token,
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  // 2. Parse input
  const { booking_id } = await req.json();

  // 3. Fetch booking + service details (service role — bypasses RLS)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      provider_id,
      service_type_id,
      total_amount,
      status,
      service_types ( name, base_price ),
      provider_services ( custom_price )
    `)
    .eq('id', booking_id)
    .single();

  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
    });
  }
  if (booking.customer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Not your booking' }), {
      status: 403,
    });
  }
  if (booking.status !== 'pending') {
    return new Response(
      JSON.stringify({ error: 'Booking already paid or cancelled' }),
      { status: 400 },
    );
  }

  // 4. Calculate fees
  const servicePrice = booking.provider_services?.custom_price ??
    booking.service_types?.base_price ??
    booking.total_amount;
  const fees = calculateFees(servicePrice);

  // 5. Create payment record (status: pending)
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      customer_id: user.id,
      amount: fees.totalCharged,
      platform_fee: fees.platformFee,
      transaction_fee: fees.transactionFee,
      provider_payout: fees.providerPayout,
      status: 'pending',
      payment_gateway: 'ozow',
    })
    .select('id')
    .single();

  if (paymentError) {
    return new Response(JSON.stringify({ error: 'Failed to create payment' }), {
      status: 500,
    });
  }

  // 6. Build Ozow payment request
  const transactionRef = `ONSERVE-${booking.id.slice(0, 8)}`;
  const bankRef = `OS-${booking.id.slice(0, 12)}`.substring(0, 20); // max 20 chars

  const ozowFields = {
    siteCode: config.ozow.siteCode,
    countryCode: 'ZA',
    currencyCode: 'ZAR',
    amount: fees.totalCharged.toFixed(2),
    transactionReference: transactionRef,
    bankReference: bankRef,
    optional1: booking.id, // booking_id — passed back in webhook
    optional2: payment.id, // payment_id — passed back in webhook
    optional3: booking.provider_id, // provider_profile_id
    optional4: user.id, // customer_id
    cancelUrl: `${config.app.baseUrl}/payment/cancel?booking=${booking.id}`,
    errorUrl: `${config.app.baseUrl}/payment/error?booking=${booking.id}`,
    successUrl: `${config.app.baseUrl}/payment/success?booking=${booking.id}`,
    notifyUrl: `${config.app.supabaseUrl}/functions/v1/ozow-webhook`,
    isTest: String(config.ozow.isTest),
  };

  // 7. Generate hash (field order matters — matches Ozow parameter table)
  const hashFields = [
    ozowFields.siteCode,
    ozowFields.countryCode,
    ozowFields.currencyCode,
    ozowFields.amount,
    ozowFields.transactionReference,
    ozowFields.bankReference,
    ozowFields.optional1,
    ozowFields.optional2,
    ozowFields.optional3,
    ozowFields.optional4,
    '', // optional5 — empty but included
    ozowFields.cancelUrl,
    ozowFields.errorUrl,
    ozowFields.successUrl,
    ozowFields.notifyUrl,
    ozowFields.isTest,
  ];
  const hashCheck = await generateOzowRequestHash(
    hashFields,
    config.ozow.privateKey,
  );

  // 8. Call Ozow API
  const ozowResponse = await fetch(
    `${config.ozow.apiBaseUrl}/PostPaymentRequest`,
    {
      method: 'POST',
      headers: {
        'ApiKey': config.ozow.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ ...ozowFields, hashCheck }),
    },
  );
  const ozowData = await ozowResponse.json();

  if (ozowData.errorMessage || !ozowData.url) {
    // Roll back payment record
    await supabase.from('payments').delete().eq('id', payment.id);
    return new Response(
      JSON.stringify({
        error: 'Ozow rejected the payment request',
        detail: ozowData.errorMessage,
      }),
      { status: 502 },
    );
  }

  // 9. Return the Ozow payment URL to the frontend
  return new Response(
    JSON.stringify({
      paymentUrl: ozowData.url,
      paymentId: payment.id,
      fees,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
