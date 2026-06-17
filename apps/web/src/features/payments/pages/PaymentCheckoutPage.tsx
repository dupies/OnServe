import { useParams, useNavigate } from 'react-router-dom';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { useCreatePayment } from '../hooks/useCreatePayment';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { calculateFees } from '@onserve/shared';
import { toast } from 'sonner';

/**
 * Payment checkout page - shows fee breakdown and payment confirmation
 *
 * This page displays:
 * - Service and booking details
 * - Fee breakdown (service cost, platform fee, transaction fee)
 * - "Pay with Ozow" button to trigger payment
 *
 * Flow:
 * 1. User reviews booking and fees
 * 2. Clicks "Pay with Ozow"
 * 3. useCreatePayment hook calls Edge Function
 * 4. Browser redirects to Ozow payment gateway
 * 5. After payment, Ozow redirects to /payment/success
 */
export function PaymentCheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  // Fetch booking details (service, location, date, etc.)
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useBooking(bookingId);

  // Payment creation mutation
  const { mutate: createPaymentMutation, isPending: isCreatingPayment, error: paymentError } = useCreatePayment();

  const handlePaymentClick = () => {
    if (!bookingId) {
      toast.error('Booking ID is missing');
      return;
    }

    createPaymentMutation(bookingId);
  };

  if (bookingLoading) {
    return (
      <AppShell className="px-6 pt-16 pb-8 gap-6 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </AppShell>
    );
  }

  if (bookingError) {
    return (
      <AppShell className="px-6 pt-16 pb-8 gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Unable to load booking</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {bookingError instanceof Error ? bookingError.message : 'Unknown error'}
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go back
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!booking) {
    return (
      <AppShell className="px-6 pt-16 pb-8 gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Booking not found</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            Go back
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell className="px-6 pt-16 pb-8 gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Payment checkout</h1>
        <p className="text-sm text-muted-foreground">Review and confirm your payment</p>
      </div>

      {/* Booking Summary Section */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Booking status</span>
            <span className="font-medium text-foreground">{booking?.status || 'Loading...'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Scheduled date</span>
            <span className="font-medium text-foreground">
              {booking?.scheduledAt
                ? new Date(booking.scheduledAt).toLocaleDateString()
                : 'Loading...'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Booking ID</span>
            <span className="font-medium text-foreground">{booking?.id?.substring(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* Fee Breakdown Section */}
      {booking && (
        (() => {
          const servicePrice = booking?.totalAmount || 0;
          const fees = calculateFees(servicePrice);

          return (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Payment summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service amount</span>
                  <span className="text-foreground font-medium">R{fees.servicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee (10%)</span>
                  <span className="text-foreground font-medium">R{fees.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction fee</span>
                  <span className="text-foreground font-medium">R{fees.transactionFee.toFixed(2)}</span>
                </div>

                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-semibold text-lg text-primary">R{fees.totalCharged.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Payment Method Info */}
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <p>
          💳 Payment will be processed securely through Ozow, SA's leading EFT gateway. Your transaction
          is encrypted and PCI-DSS compliant.
        </p>
      </div>

      {/* Error Display */}
      {paymentError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Payment creation failed</p>
          <p>{paymentError instanceof Error ? paymentError.message : 'Unknown error'}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-auto pt-6">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="flex-1"
          disabled={isCreatingPayment}
        >
          Cancel
        </Button>
        <Button
          onClick={handlePaymentClick}
          className="flex-1"
          disabled={isCreatingPayment}
        >
          {isCreatingPayment ? 'Processing...' : 'Pay with Ozow'}
        </Button>
      </div>

      {/* Development Note */}
      {/* TODO: Remove in production - shows payment state flow for testing */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>Route: /payment/checkout/:bookingId</p>
        <p>Next: Redirects to Ozow → /payment/success on completion</p>
      </div>
    </AppShell>
  );
}
