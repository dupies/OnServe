import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingState } from '@/components/common';
import { usePaymentForBooking } from '@/features/payments/hooks/usePayments';

// Landing page for Ozow's Success/Cancel/Error redirects. The redirect itself
// is untrusted — the payments row (settled by the ozow-webhook edge function)
// is the source of truth, so we poll it until it leaves 'pending'.
export function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId') ?? undefined;

  const { data: payment } = usePaymentForBooking(bookingId, { poll: true });

  if (!bookingId) {
    navigate('/bookings', { replace: true });
    return null;
  }

  if (!payment || payment.status === 'pending') {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto py-16">
          <LoadingState label="Confirming your payment with Ozow…" />
          <p className="text-xs text-muted-foreground text-center mt-4">
            This usually takes a few seconds. Don't close this page.
          </p>
        </div>
      </PageLayout>
    );
  }

  const succeeded = payment.status !== 'failed';

  return (
    <PageLayout>
      <div className="max-w-md mx-auto py-16 flex flex-col items-center gap-4 text-center">
        {succeeded ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Payment received</h1>
            <p className="text-sm text-muted-foreground">
              R {payment.amount} is held in escrow and will be released to the provider once
              you approve the completed job.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate(`/bookings/${bookingId}`, { replace: true })}
            >
              View booking
            </Button>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-destructive" />
            <h1 className="text-2xl font-semibold text-foreground">Payment not completed</h1>
            <p className="text-sm text-muted-foreground">
              Your payment was cancelled or failed. No money has been taken — you can try again.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate('/payment', { state: { bookingId }, replace: true })}
            >
              Try again
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/bookings', { replace: true })}>
              Back to bookings
            </Button>
          </>
        )}
      </div>
    </PageLayout>
  );
}
