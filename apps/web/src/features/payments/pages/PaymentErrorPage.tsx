import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Payment error page - shown on payment failure
 *
 * Flow:
 * 1. User attempts payment on Ozow
 * 2. Payment fails (insufficient funds, invalid card, network error, etc.)
 * 3. Ozow redirects to /payment/error?booking=xxx&error=xxx
 * 4. This page shows error message with contact support option and retry
 *
 * Note: The booking remains in pending payment status
 * User can retry payment or contact support for assistance
 */
export function PaymentErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('booking');
  const errorCode = searchParams.get('error') || 'unknown';
  const errorMessage = searchParams.get('message') || 'Payment processing failed';

  const getErrorDescription = (code: string): string => {
    const errorMap: Record<string, string> = {
      insufficient_funds: 'Your account does not have sufficient funds for this transaction.',
      invalid_card: 'The card details provided are invalid or expired.',
      expired_card: 'Your card has expired. Please use a different payment method.',
      network_error: 'A network error occurred during payment. Please check your connection and try again.',
      transaction_declined: 'The transaction was declined by your bank. Please contact your bank for more details.',
      timeout: 'The payment gateway connection timed out. Please try again.',
      unknown: 'An unexpected error occurred during payment processing.',
    };
    return errorMap[code] || errorMessage;
  };

  return (
    <AppShell className="px-6 pt-16 pb-8 gap-6">
      <div className="text-center">
        <div className="mb-6 text-4xl">❌</div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Payment failed</h1>
        <p className="text-sm text-muted-foreground mb-6">{getErrorDescription(errorCode)}</p>
      </div>

      {/* Error Details Section */}
      {/* TODO: Display error code and details from Ozow response for debugging */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
        <p className="text-destructive font-medium mb-2">Error details:</p>
        <div className="text-xs text-destructive/80 space-y-1">
          <p>
            <span className="font-medium">Error code:</span> {errorCode}
          </p>
          {bookingId && (
            <p>
              <span className="font-medium">Booking ID:</span> {bookingId}
            </p>
          )}
        </div>
      </div>

      {/* Troubleshooting Section */}
      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <p className="font-medium text-foreground mb-3">What you can do:</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2">
          <li>Check your account has sufficient funds</li>
          <li>Verify your card details are correct</li>
          <li>Ensure your card is not expired or blocked</li>
          <li>Check your internet connection</li>
          <li>Try a different payment method</li>
          <li>Contact support if the issue persists</li>
        </ul>
      </div>

      {/* Contact Support Section */}
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
        <p className="font-medium text-foreground mb-2">Need help?</p>
        <p className="text-muted-foreground mb-3">
          If you're still having trouble, contact our support team and we'll help you complete your booking.
        </p>
        <Button variant="outline" className="w-full" onClick={() => navigate('/chat')}>
          Contact support
        </Button>
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
          Cancel booking
        </Button>
      </div>

      {/* Development Note */}
      {/* TODO: Remove in production */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>Route: /payment/error?booking=:bookingId&error=:errorCode</p>
        <p>Payment failed. Booking status remains pending_payment.</p>
      </div>
    </AppShell>
  );
}
