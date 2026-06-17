import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOzowNotificationHash } from '@onserve/shared/ozow';
import { config } from '../_shared/config.ts';

serve(async (req: Request) => {
  // 1. Parse form-urlencoded body (Ozow sends application/x-www-form-urlencoded)
  const formData = await req.formData();
  const notification: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    notification[key] = String(value);
  }

  // 2. Verify hash — reject tampered webhooks
  const isValid = await verifyOzowNotificationHash(
    notification,
    config.ozow.privateKey,
  );
  if (!isValid) {
    console.error('Ozow webhook hash verification failed', notification);
    return new Response('Invalid hash', { status: 400 });
  }

  // 3. Extract our IDs from optional fields
  const bookingId = notification.Optional1;
  const paymentId = notification.Optional2;
  const ozowStatus = notification.Status;
  const ozowTransactionId = notification.TransactionId;

  const supabase = createClient(
    config.app.supabaseUrl,
    config.app.supabaseServiceKey,
  );

  // 4. Idempotency check — don't process twice
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('id', paymentId)
    .single();

  if (!existingPayment) {
    console.error('Payment not found for webhook', { paymentId });
    return new Response('Payment not found', { status: 404 });
  }
  if (existingPayment.status !== 'pending') {
    // Already processed — return 200 so Ozow doesn't retry
    return new Response('Already processed', { status: 200 });
  }

  // 5. Handle by Ozow status
  switch (ozowStatus) {
    case 'Complete': {
      // Payment succeeded — move to escrowed
      await supabase
        .from('payments')
        .update({
          status: 'escrowed',
          ozow_transaction_id: ozowTransactionId,
          escrowed_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Update booking status to confirmed (provider can now see it)
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      // Notify provider — "New job available, payment secured"
      await supabase.from('notifications').insert({
        user_id: notification.Optional3, // provider_profile.user_id
        title: 'New Job Available',
        body: `A customer has booked and paid. Accept the job to get started.`,
        type: 'booking',
        is_read: false,
      });

      break;
    }

    case 'Cancelled':
    case 'Error':
    case 'Abandoned': {
      // Payment failed — cancel
      await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          ozow_transaction_id: ozowTransactionId,
        })
        .eq('id', paymentId);

      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      // Notify customer
      await supabase.from('notifications').insert({
        user_id: notification.Optional4, // customer_id
        title: 'Payment Failed',
        body: `Your payment was not completed. Please try again.`,
        type: 'payment',
        is_read: false,
      });

      break;
    }

    case 'PendingInvestigation':
    case 'Pending': {
      // Ozow is still processing — do nothing, wait for final webhook
      console.log('Ozow pending status, awaiting final notification', {
        paymentId,
        ozowStatus,
      });
      break;
    }
  }

  // Always return 200 to acknowledge receipt
  return new Response('OK', { status: 200 });
});
