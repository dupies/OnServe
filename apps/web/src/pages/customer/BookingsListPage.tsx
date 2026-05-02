import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { useCustomerBookings } from '@/features/bookings/hooks/useBookings';
import { format } from 'date-fns';
import type { BookingStatus } from '@onserve/types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'text-warning border-warning/30 bg-warning/10',
  confirmed: 'text-primary border-primary/30 bg-primary/10',
  in_progress: 'text-primary border-primary/30 bg-primary/10',
  completed: 'text-muted-foreground border-border',
  cancelled: 'text-muted-foreground border-border',
  disputed: 'text-destructive border-destructive/30 bg-destructive/10',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export function BookingsListPage() {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading } = useCustomerBookings();

  return (
    <AppShell className="pb-20">
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">My bookings</h1>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30 bg-primary/10">
              Active
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground border-border">
              Past
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No bookings yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/bookings/${b.id}`)}
                className="bg-card border border-border rounded-xl p-4 text-left w-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={`text-[10px] h-5 ${STATUS_STYLES[b.status]}`}>
                    {STATUS_LABELS[b.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(b.scheduledAt), 'EEE d MMM')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {(b as unknown as Record<string, unknown>)['serviceType']
                        ? ((b as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown>)['name'] as string
                        : 'Service'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(b.scheduledAt), 'HH:mm')}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${b.status === 'disputed' ? 'text-destructive' : 'text-primary'}`}>
                    R{b.totalAmount}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
