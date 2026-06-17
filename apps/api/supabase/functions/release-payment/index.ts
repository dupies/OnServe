import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';

/**
 * Called by:
 * - Customer tapping "Approve & Pay Provider" in the UI
 * - auto-release-cron after 48h
 * - Admin resolving a dispute in provider's favour
 */
serve(async (req: Request) => {
  const { payment_id, triggered_by } = await req.json();
  // triggered_by: 'customer' | 'auto_release' | 'admin'

  const supabase = createClient(
    config.app.supabaseUrl,
    config.app.supabaseServiceKey,
  );

  // 1. Fetch payment + provider bank details
  const { data: payment } = await supabase
    .from('payments')
    .select(`
      id, booking_id, provider_payout, status,
      bookings!inner (
        provider_id,
        provider_profiles!inner (
          user_id,
          bank_name,
          bank_account_number,
          bank_branch_code,
          bank_account_type,
          bank_verified
        )
      )
    `)
    .eq('id', payment_id)
    .single();

  if (!payment || payment.status !== 'escrowed') {
    return new Response(
      JSON.stringify({ error: 'Payment not in escrowed state' }),
      { status: 400 },
    );
  }

  const provider = payment.bookings.provider_profiles;
  if (!provider.bank_verified || !provider.bank_account_number) {
    // Can't pay out — notify provider to add bank details
    await supabase.from('notifications').insert({
      user_id: provider.user_id,
      title: 'Add Bank Details',
      body: 'Your job payment is ready but we need your bank details to pay you.',
      type: 'payment',
      is_read: false,
    });
    return new Response(
      JSON.stringify({ error: 'Provider bank details not verified' }),
      { status: 400 },
    );
  }

  // 2. Call Ozow Payouts API
  // TODO: Ozow sales blockers to confirm:
  // Q1: Exact Payout API endpoint and auth header (ApiKey vs AccessToken)
  //     Current placeholder: 'https://api.ozow.com/payouts' with AccessToken header
  // Q2: Exact payout JSON payload fields (amount, bankAccountNumber, bankCode, accountType, reference, etc.)
  //     Current placeholder matches spec pattern
  // Q3: Does payout draw from settled balance (float) or pre-funded wallet?
  //     Currently assuming settled balance float
  const payoutResponse = await fetch(`${config.ozow.apiBaseUrl}/payouts`, {
    method: 'POST',
    headers: {
      'AccessToken': config.ozow.apiKey, // TODO: Confirm header name with Ozow (was ApiKey, changed to AccessToken in v1.4)
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: payment.provider_payout,
      bankAccountNumber: provider.bank_account_number, // decrypt first if using pgcrypto
      bankCode: provider.bank_branch_code,
      accountType: provider.bank_account_type,
      reference: `ONSERVE-${payment.booking_id.slice(0, 8)}`,
      // isRealTimeClearance: true — for instant payouts (confirm availability)
    }),
  });

  if (!payoutResponse.ok) {
    const error = await payoutResponse.text();
    await supabase
      .from('payments')
      .update({ payout_failed_reason: error })
      .eq('id', payment_id);

    console.error('Ozow payout failed', { payment_id, error });
    return new Response(JSON.stringify({ error: 'Payout failed' }), {
      status: 502,
    });
  }

  const payoutData = await payoutResponse.json();

  // 3. Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      payout_at: new Date().toISOString(),
      ozow_payout_id: payoutData.payoutId ?? payoutData.id ?? null,
    })
    .eq('id', payment_id);

  // 4. Update booking status
  await supabase
    .from('bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', payment.booking_id);

  // 5. Notify both parties
  await supabase.from('notifications').insert([
    {
      user_id: provider.user_id,
      title: 'Payment Received',
      body: `R${payment.provider_payout.toFixed(2)} has been sent to your bank account.`,
      type: 'payment',
      is_read: false,
    },
  ]);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
