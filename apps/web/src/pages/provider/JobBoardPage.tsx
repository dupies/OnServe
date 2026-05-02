import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { useProviderBookings, useAcceptBooking } from '@/features/bookings/hooks/useBookings';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function JobBoardPage() {
  const navigate = useNavigate();
  const { data: bookings = [], isLoading } = useProviderBookings();
  const acceptBooking = useAcceptBooking();

  const pending = bookings.filter((b) => b.status === 'pending');
  const active = bookings.filter((b) => ['confirmed', 'in_progress'].includes(b.status));
  const todayEarnings = active.reduce((sum, b) => sum + b.totalAmount, 0);

  async function handleAccept(id: string) {
    try {
      await acceptBooking.mutateAsync(id);
      toast.success('Job accepted');
    } catch {
      toast.error('Failed to accept job');
    }
  }

  return (
    <AppShell className="pb-20">
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30 bg-primary/10">
            Online
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card border border-border rounded-xl py-4 text-center">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-xl font-semibold text-foreground mt-1">{active.length} jobs</p>
          </div>
          <div className="bg-card border border-border rounded-xl py-4 text-center">
            <p className="text-xs text-muted-foreground">Earnings</p>
            <p className="text-xl font-semibold text-primary mt-1">
              R {todayEarnings.toFixed(0)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No new job requests</p>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-medium text-foreground">New requests</h2>
            <div className="flex flex-col gap-3">
              {pending.map((job) => {
                const svcName = (job as unknown as Record<string, unknown>)['serviceType']
                  ? ((job as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown>)['name'] as string
                  : 'Service';
                return (
                  <article key={job.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-foreground">{svcName}</p>
                      <span className="text-base font-semibold text-primary">R {job.totalAmount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {format(new Date(job.scheduledAt), 'EEE d MMM · HH:mm')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAccept(job.id)}
                        disabled={acceptBooking.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/provider/jobs/${job.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
