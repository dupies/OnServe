import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AppShell } from '@/components/layout/AppShell';
import { useBooking, useAcceptBooking } from '@/features/bookings/hooks/useBookings';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);
  const acceptBooking = useAcceptBooking();

  async function handleAccept() {
    if (!id) return;
    try {
      await acceptBooking.mutateAsync(id);
      toast.success('Job accepted');
      navigate(`/provider/jobs/${id}/active`);
    } catch {
      toast.error('Failed to accept job');
    }
  }

  if (isLoading) {
    return (
      <AppShell className="px-4 pt-4 pb-8 gap-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-card rounded w-40" />
          <div className="h-20 bg-card rounded" />
        </div>
      </AppShell>
    );
  }

  if (!booking) {
    return (
      <AppShell className="px-4 pt-16 pb-8 items-center gap-4">
        <p className="text-muted-foreground text-sm">Job not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
      </AppShell>
    );
  }

  const svcName = (booking as unknown as Record<string, unknown>)['serviceType']
    ? ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown>)['name'] as string
    : 'Service';

  return (
    <AppShell className="px-4 pt-4 pb-8 gap-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30 bg-primary/10">
          Trusted area
        </Badge>
      </div>

      <h1 className="text-xl font-semibold text-foreground">Job detail</h1>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{svcName}</p>
          <span className="text-base font-semibold text-primary">R {booking.totalAmount}</span>
        </div>
        <Separator />
        {[
          { label: 'Date', value: format(new Date(booking.scheduledAt), 'EEE d MMM · HH:mm') },
          { label: 'Status', value: booking.status },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="text-xs text-foreground capitalize">{row.value.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-foreground mb-2">Area safety</p>
        <Progress value={80} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-1">Risk score: 80/100 (Low)</p>
      </div>

      {booking.status === 'pending' && (
        <div className="flex gap-2 mt-auto">
          <Button className="flex-1" onClick={handleAccept} disabled={acceptBooking.isPending}>
            {acceptBooking.isPending ? 'Accepting…' : 'Accept'}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => navigate(-1)}>
            Decline
          </Button>
        </div>
      )}

      {booking.status === 'confirmed' && (
        <Button className="w-full mt-auto" onClick={() => navigate(`/provider/jobs/${id}/active`)}>
          Start job
        </Button>
      )}
    </AppShell>
  );
}
