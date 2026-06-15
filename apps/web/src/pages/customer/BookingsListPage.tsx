import { useNavigate } from 'react-router-dom';
import { CalendarOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useCustomerBookings } from '@/features/bookings/hooks/useBookings';
import { LoadingState, EmptyState, ErrorState } from '@/components/common';
import { format } from 'date-fns';
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

export function BookingsListPage() {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading, isError, refetch } = useCustomerBookings();

  const active = bookings.filter((b) => ['pending', 'confirmed', 'in_progress'].includes(b.status));
  const past = bookings.filter((b) => ['completed', 'cancelled', 'disputed'].includes(b.status));

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My bookings</h1>
            <p className="text-muted-foreground text-sm mt-1">Track and manage your service bookings</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              {active.length} active
            </Badge>
            <Badge variant="outline" className="text-muted-foreground border-border">
              {past.length} past
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Loading your bookings…" />
        ) : isError ? (
          <ErrorState message="We couldn't load your bookings." onRetry={() => refetch()} />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No bookings yet"
            description="Book a service to get started."
            action={
              <Button size="sm" onClick={() => navigate('/search')}>
                Find a service
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-8">
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3">Active</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {active.map((b) => (
                    <BookingCard key={b.id} booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-70">
                  {past.map((b) => (
                    <BookingCard key={b.id} booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function BookingCard({
  booking,
  onClick,
}: {
  booking: { id: string; status: BookingStatus; scheduledAt: string; totalAmount: number };
  onClick: () => void;
}) {
  const svcName = ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown> | undefined)?.['name'] as string | undefined;

  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 text-left w-full hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className={`text-xs h-5 ${STATUS_STYLES[booking.status]}`}>
          {STATUS_LABELS[booking.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {format(new Date(booking.scheduledAt), 'EEE d MMM')}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{svcName ?? 'Service'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(booking.scheduledAt), 'HH:mm')}
          </p>
        </div>
        <span className={`text-base font-semibold ${booking.status === 'disputed' ? 'text-destructive' : 'text-primary'}`}>
          R{booking.totalAmount}
        </span>
      </div>
    </button>
  );
}
