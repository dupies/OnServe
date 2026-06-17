import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Payment cancellation page - shown if user cancels on Ozow
 *
 * Flow:
 * 1. User starts payment on Ozow
 * 2. User clicks "Cancel" on Ozow gateway
 * 3. Ozow redirects to /payment/cancel?booking=xxx
 * 4. This page shows cancellation message with retry option
 *
 * Note: The booking remains in pending payment status
 * User can retry payment from checkout page or booking details
 */
export function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('booking');

  return (
    <AppShell className="px-6 pt-16 pb-8 gap-6">
      <div className="text-center">
        <div className="mb-6 text-4xl">⏹️</div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Payment cancelled</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You cancelled the payment on the Ozow gateway. Your booking is still waiting for payment.
        </p>
      </div>

      {/* Information Section */}
      {/* TODO: Display booking details and payment status */}
      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">What happened:</span>
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Your booking is still pending payment</li>
            <li>The service provider hasn't been notified yet</li>
            <li>You can retry the payment anytime before the booking expires</li>
          </ul>
        </div>
      </div>

      {/* Next Steps Section */}
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Next steps:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Review your payment details</li>
          <li>Ensure you have sufficient funds</li>
          <li>Try the payment again</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-auto pt-6">
        {bookingId ? (
          <Button onClick={() => navigate(`/payment/checkout/${bookingId}`)} className="w-full">
            Try payment again
          </Button>
        ) : (
          <Button onClick={() => navigate('/bookings')} className="w-full">
            View my bookings
          </Button>
        )}

        <Button onClick={() => navigate('/bookings')} variant="outline" className="w-full">
          View all bookings
        </Button>
      </div>

      {/* Development Note */}
      {/* TODO: Remove in production */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>Route: /payment/cancel?booking=:bookingId</p>
        <p>User cancelled payment on Ozow. Booking status remains pending_payment.</p>
      </div>
    </AppShell>
  );
}
