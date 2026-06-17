import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';

/**
 * Runs on a schedule (pg_cron or external cron trigger).
 * Finds all escrowed payments older than 48h with no dispute
 * and auto-releases them.
 *
 * Schedule: every 30 minutes
 * pg_cron: SELECT cron.schedule('auto-release', '*/30 * * * *',
 *   $$SELECT net.http_post(...)$$);
 */
serve(async (_req: Request) => {
  const supabase = createClient(
    config.app.supabaseUrl,
    config.app.supabaseServiceKey,
  );

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Find escrowed payments past the 48h window with no active dispute
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, booking_id')
    .eq('status', 'escrowed')
    .lt('escrowed_at', cutoff);

  if (!pendingPayments?.length) {
    return new Response(JSON.stringify({ released: 0 }), { status: 200 });
  }

  // Check none have active disputes
  const bookingIds = pendingPayments.map((p) => p.booking_id);
  const { data: disputes } = await supabase
    .from('disputes')
    .select('booking_id')
    .in('booking_id', bookingIds)
    .in('status', ['open', 'under_review']);

  const disputedBookingIds = new Set(disputes?.map((d) => d.booking_id) ?? []);

  let releasedCount = 0;
  for (const payment of pendingPayments) {
    if (disputedBookingIds.has(payment.booking_id)) {
      continue; // Skip — has active dispute
    }

    // Call release-payment Edge Function internally
    const releaseUrl = `${config.app.supabaseUrl}/functions/v1/release-payment`;
    await fetch(releaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.app.supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_id: payment.id,
        triggered_by: 'auto_release',
      }),
    });
    releasedCount++;
  }

  return new Response(JSON.stringify({ released: releasedCount }), {
    status: 200,
  });
});
