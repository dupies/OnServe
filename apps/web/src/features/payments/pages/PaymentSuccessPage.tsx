import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useGetPayment } from '../hooks/useGetPayment';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { toast } from 'sonner';

/**
 * Payment success page - shown after Ozow redirect
 *
 * Flow:
 * 1. User completes payment on Ozow
 * 2. Ozow redirects to /payment/success?booking=xxx
 * 3. This page polls payment status via useGetPayment hook
 * 4. Once payment status reaches "escrowed", booking is confirmed
 * 5. Shows "Payment secured — waiting for provider" message
 * 6. User can navigate to booking details
 *
 * Note: The webhook handler (ozow-webhook Edge Function) updates payment.status
 */
export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('booking') || undefined;

  // Use hook to poll payment status every 2 seconds
  const { data: payment, isLoading, error } = useGetPayment(bookingId, {
    refetchInterval: 2000,
    enabled: !!bookingId,
  });

  // Show success toast when payment is confirmed
  useEffect(() => {
    if (payment?.status === 'escrowed') {
      toast.success('Payment secured! Your booking is confirmed.');
    }
  }, [payment?.status]);

  if (!bookingId) {
    return (
      <AppShell className="px-6 pt-16 pb-8 gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Missing booking information</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Could not find booking ID in payment confirmation.
          </p>
          <Button onClick={() => navigate('/bookings')} className="w-full">
            View my bookings
          </Button>
        </div>
      </AppShell>
    );
  }

  const isWaitingForConfirmation = isLoading || (payment?.status !== 'escrowed' && payment?.status !== 'cancelled');

  return (
    <AppShell className="px-6 pt-16 pb-8 gap-6">
      <div className="text-center">
        {isWaitingForConfirmation ? (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Processing payment</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your payment is being confirmed. This usually takes a few moments...
            </p>
          </>
        ) : payment?.status === 'escrowed' ? (
          <>
            <div className="mb-6 text-4xl">✓</div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Payment secured!</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your booking is confirmed. The provider will be notified shortly.
            </p>
          </>
        ) : (
          <>
            <div className="mb-6 text-4xl">⚠️</div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Payment status unclear</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {error ? `Error: ${error instanceof Error ? error.message : String(error)}` : `Current status: ${payment?.status || 'checking...'}`}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Please contact support if the issue persists.
            </p>
          </>
        )}
      </div>

      {/* Status Display */}
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="space-y-2">
          <p>
            <span className="font-medium text-foreground">Booking ID:</span> {bookingId}
          </p>
          <p>
            <span className="font-medium text-foreground">Payment status:</span> {payment?.status || 'checking...'}
          </p>
          {payment?.id && (
            <p>
              <span className="font-medium text-foreground">Payment ID:</span> {payment.id.substring(0, 8)}...
            </p>
          )}
          {isWaitingForConfirmation && <p className="text-xs">Polling payment status...</p>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-auto pt-6">
        <Button
          onClick={() => navigate(`/bookings/${bookingId}`)}
          className="w-full"
          disabled={isWaitingForConfirmation}
        >
          View booking
        </Button>

        {!isWaitingForConfirmation && payment?.status !== 'escrowed' && (
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
            Try again
          </Button>
        )}

        <Button
          onClick={() => navigate('/bookings')}
          variant="ghost"
          className="w-full"
          disabled={isWaitingForConfirmation}
        >
          View all bookings
        </Button>
      </div>

      {/* Development Note */}
      {/* TODO: Remove in production */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>Route: /payment/success?booking=:bookingId</p>
        <p>Ozow callback triggers payment.status → escrowed via webhook</p>
      </div>
    </AppShell>
  );
}
