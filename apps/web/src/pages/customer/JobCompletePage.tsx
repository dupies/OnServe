import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { format, formatDistanceStrict } from 'date-fns';

export function JobCompletePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);

  if (isLoading || !booking) {
    return (
      <PageLayout>
        <div className="max-w-md animate-pulse flex flex-col gap-4 mx-auto">
          <div className="h-48 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  const svcName = ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown> | undefined)?.['name'] as string | undefined ?? 'Service';
  const provider = (booking as unknown as Record<string, unknown>)['provider'] as Record<string, unknown> | undefined;

  const checkedIn = booking.providerCheckedInAt ? new Date(booking.providerCheckedInAt) : null;
  const checkedOut = booking.providerCheckedOutAt ? new Date(booking.providerCheckedOutAt) : new Date();
  const duration = checkedIn ? formatDistanceStrict(checkedOut, checkedIn) : null;

  return (
    <PageLayout>
      <div className="max-w-md mx-auto flex flex-col gap-6">
        {/* Success icon */}
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">Job complete!</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {provider ? `${String(provider['display_name'])}` : svcName}
              {duration ? ` · ${duration}` : ''}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Summary</h2>
          <Separator />
          {[
            { label: 'Service', value: svcName },
            { label: 'Date', value: format(new Date(booking.scheduledAt), 'EEE d MMM · HH:mm') },
            ...(duration ? [{ label: 'Duration', value: duration }] : []),
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm text-foreground">{row.value}</span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total escrowed</span>
            <span className="text-xl font-semibold text-primary">R {booking.totalAmount}</span>
          </div>
        </div>

        {/* Escrow notice */}
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
          <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-primary">
            Approving the job will release R {booking.totalAmount} to the provider. If there is an issue, raise a dispute instead.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate(`/rate/${booking.id}`)}
          >
            Approve &amp; rate provider
          </Button>
          <button
            className="w-full border border-destructive/20 bg-destructive/10 rounded-xl py-3 text-sm text-destructive font-medium hover:bg-destructive/20 transition-colors"
            onClick={() => navigate(`/disputes/new/${booking.id}`)}
          >
            Raise a dispute
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
