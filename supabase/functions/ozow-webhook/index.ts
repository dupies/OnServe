import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyNotificationHash, getTransaction } from '../_shared/ozow.ts';

const FINAL_FAILURE_STATUSES = ['Cancelled', 'Error', 'Abandoned'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const form = await req.formData();
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) fields[key] = String(value);

  const privateKey = Deno.env.get('OZOW_PRIVATE_KEY')!;
  if (!(await verifyNotificationHash(fields, privateKey))) {
    console.error('ozow-webhook: hash verification failed', fields['TransactionReference']);
    return new Response('Invalid hash', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const txRef = fields['TransactionReference'];
  const { data: payment } = await admin
    .from('payments')
    .select('id, customer_id, amount, status')
    .eq('gateway_reference', txRef)
    .maybeSingle();
  if (!payment) {
    console.error('ozow-webhook: no payment for reference', txRef);
    return new Response('Unknown reference', { status: 404 });
  }
  // Idempotency: webhook may be delivered more than once.
  if (payment.status !== 'pending') return new Response('OK', { status: 200 });

  const status = fields['Status'];

  if (status === 'Complete') {
    // Defense in depth: confirm status and amount with Ozow directly.
    const tx = await getTransaction(
      Deno.env.get('OZOW_SITE_CODE')!,
      fields['TransactionId'],
      Deno.env.get('OZOW_API_KEY')!,
    );
    if (tx.status !== 'Complete' || Number(tx.amount).toFixed(2) !== Number(payment.amount).toFixed(2)) {
      console.error('ozow-webhook: GetTransaction mismatch', { txRef, tx });
      return new Response('Verification mismatch', { status: 409 });
    }

    const { error } = await admin
      .from('payments')
      .update({
        status: 'escrowed',
        escrowed_at: new Date().toISOString(),
        gateway_transaction_id: fields['TransactionId'],
      })
      .eq('id', payment.id);
    if (error) return new Response(error.message, { status: 500 });

    await admin.from('notifications').insert({
      user_id: payment.customer_id,
      title: 'Payment received',
      body: `Your payment of R ${Number(payment.amount).toFixed(2)} is held in escrow until the job is complete.`,
      type: 'payment',
      metadata: { paymentId: payment.id },
    });
  } else if (FINAL_FAILURE_STATUSES.includes(status)) {
    const { error } = await admin
      .from('payments')
      .update({
        status: 'failed',
        gateway_transaction_id: fields['TransactionId'],
      })
      .eq('id', payment.id);
    if (error) return new Response(error.message, { status: 500 });
  }
  // 'Pending' / 'PendingInvestigation': leave as pending; Ozow notifies again.

  return new Response('OK', { status: 200 });
});
