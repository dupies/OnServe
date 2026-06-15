import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { LoadingState } from '@/components/common';
import { notify } from '@/lib/notify';

interface PaymentLocationState {
  bookingId?: string;
}

const PLATFORM_FEE_RATE = 0.05;

export function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = (location.state as PaymentLocationState | null)?.bookingId;

  const { data: booking, isLoading } = useBooking(bookingId);

  // The booking is created earlier in the wizard (BookingPage). Here we only
  // confirm it and hand off to the real booking detail screen — no payment
  // processor is integrated (payments are out of scope).
  function handleConfirm() {
    if (bookingId) {
      notify.success('Booking confirmed');
      navigate(`/bookings/${bookingId}`, { replace: true });
    } else {
      notify.success('Booking confirmed');
      navigate('/bookings', { replace: true });
    }
  }

  const total = booking?.totalAmount ?? 0;
  const platformFee = Math.round(total * PLATFORM_FEE_RATE * 100) / 100;
  const serviceFee = Math.round((total - platformFee) * 100) / 100;

  const serviceName =
    ((booking as unknown as Record<string, unknown> | undefined)?.['serviceType'] as
      | Record<string, unknown>
      | undefined)?.['name'] as string | undefined;
  const locationLabel =
    ((booking as unknown as Record<string, unknown> | undefined)?.['location'] as
      | Record<string, unknown>
      | undefined)?.['label'] as string | undefined;

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Confirm &amp; pay</h1>
          <p className="text-muted-foreground text-sm mt-1">Review your booking before confirming</p>
        </div>

        {bookingId && isLoading ? (
          <LoadingState label="Loading your booking…" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Booking summary */}
            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Booking details</h2>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Service</span>
                    <span className="text-sm text-foreground">{serviceName ?? 'Service'}</span>
                  </div>
                  {booking?.scheduledAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm text-foreground">
                        {new Date(booking.scheduledAt).toLocaleString('en-ZA', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">Location</span>
                    <div className="text-right">
                      <p className="text-sm text-foreground">{locationLabel ?? 'Your saved location'}</p>
                      <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30 bg-primary/10 mt-1">
                        Trusted area
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl px-5 py-4">
                <Shield className="w-4 h-4 text-warning flex-shrink-0" />
                <p className="text-sm text-warning">
                  Funds are held in escrow and only released when you approve the completed job
                </p>
              </div>
            </div>

            {/* Payment card */}
            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-foreground">Payment summary</h2>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Service fee</span>
                  <span className="text-foreground">R {serviceFee}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Platform fee (5%)</span>
                  <span className="text-foreground">R {platformFee}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-lg font-semibold text-primary">R {total}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleConfirm}>
                Confirm booking
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Secured by Yoco · Payment held in escrow until job completion
              </p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
