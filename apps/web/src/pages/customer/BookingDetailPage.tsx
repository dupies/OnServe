import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, MapPin, Shield, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking, useCancelBooking } from '@/features/bookings/hooks/useBookings';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { BookingStatus } from '@onserve/types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:     'text-warning border-warning/30 bg-warning/10',
  confirmed:   'text-primary border-primary/30 bg-primary/10',
  in_progress: 'text-primary border-primary/30 bg-primary/10',
  completed:   'text-muted-foreground border-border',
  cancelled:   'text-muted-foreground border-border',
  disputed:    'text-destructive border-destructive/30 bg-destructive/10',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending:     'Pending',
  confirmed:   'Confirmed',
  in_progress: 'In progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  disputed:    'Disputed',
};

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);
  const cancel = useCancelBooking();

  async function handleCancel() {
    if (!id) return;
    try {
      await cancel.mutateAsync(id);
      toast.success('Booking cancelled');
      navigate('/bookings');
    } catch {
      toast.error('Failed to cancel booking');
    }
  }

  if (isLoading || !booking) {
    return (
      <PageLayout>
        <div className="max-w-2xl animate-pulse flex flex-col gap-4">
          <div className="h-8 bg-card rounded-lg w-48" />
          <div className="h-48 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  const svcName = ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown> | undefined)?.['name'] as string | undefined ?? 'Service';
  const location = (booking as unknown as Record<string, unknown>)['location'] as Record<string, unknown> | undefined;
  const provider = (booking as unknown as Record<string, unknown>)['provider'] as Record<string, unknown> | undefined;

  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canTrack = booking.status === 'in_progress';
  const canRate = booking.status === 'completed';
  const canDispute = booking.status === 'in_progress' || booking.status === 'completed';

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/bookings')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to bookings
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Booking detail</h1>
            <Badge variant="outline" className={`${STATUS_STYLES[booking.status]}`}>
              {STATUS_LABELS[booking.status]}
            </Badge>
          </div>
        </div>

        {/* Provider card */}
        {provider && (
          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary text-sm">
                {String(provider['display_name'] ?? 'P').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">{String(provider['display_name'] ?? 'Provider')}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-warning text-xs">★</span>
                  <span className="text-xs text-muted-foreground">{String(provider['rating_average'] ?? '—')}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/chat/${booking.id}`)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
          </div>
        )}

        {/* Booking details */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>
          <Separator />
          {[
            { label: 'Service', value: svcName },
            {
              label: 'Date',
              value: format(new Date(booking.scheduledAt), 'EEE d MMM · HH:mm'),
            },
            {
              label: 'Location',
              value: location
                ? String(location['address'] ?? location['label'] ?? 'Saved location')
                : 'Location not set',
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm text-foreground">{row.value}</span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-semibold text-primary">R {booking.totalAmount}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Timeline</h2>
          <div className="flex flex-col gap-3">
            <TimelineItem done label="Booking created" time={format(new Date(booking.createdAt), 'EEE d MMM · HH:mm')} />
            <TimelineItem done={booking.status !== 'pending'} label="Confirmed by provider" />
            <TimelineItem done={!!booking.providerCheckedInAt} label="Provider checked in" time={booking.providerCheckedInAt ? format(new Date(booking.providerCheckedInAt), 'HH:mm') : undefined} />
            <TimelineItem done={!!booking.completedAt} label="Job completed" />
          </div>
        </div>

        {/* Escrow notice */}
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl px-5 py-4">
          <Shield className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-sm text-warning">Funds held in escrow · released on your approval</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {canTrack && (
            <Button className="w-full" onClick={() => navigate(`/tracking/${booking.id}`)}>
              <Clock className="w-4 h-4 mr-2" /> Track live
            </Button>
          )}
          {canRate && (
            <Button className="w-full" onClick={() => navigate(`/rate/${booking.id}`)}>
              Rate &amp; release funds
            </Button>
          )}
          {canDispute && (
            <button
              onClick={() => navigate(`/disputes/new/${booking.id}`)}
              className="w-full border border-destructive/20 bg-destructive/10 rounded-xl py-3 text-sm text-destructive font-medium hover:bg-destructive/20 transition-colors"
            >
              Raise a dispute
            </button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? 'Cancelling…' : 'Cancel booking'}
            </Button>
          )}
          {booking.status === 'cancelled' && (
            <div className="flex items-center gap-2 bg-muted/10 border border-border rounded-xl px-5 py-4">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">This booking has been cancelled</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function TimelineItem({ done, label, time }: { done: boolean; label: string; time?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-primary' : 'bg-muted'}`} />
      <div className="flex items-center justify-between flex-1">
        <span className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {label}
        </span>
        {time && <span className="text-xs text-muted-foreground">{time}</span>}
      </div>
    </div>
  );
}
