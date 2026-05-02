import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { useBooking, useCheckIn } from '@/features/bookings/hooks/useBookings';
import { format, formatDistanceStrict } from 'date-fns';

export function ActiveJobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);
  const checkIn = useCheckIn();

  async function handleCheckIn() {
    if (!id) return;
    try {
      await checkIn.mutateAsync(id);
      toast.success('Checked in — job started');
      navigate(`/provider/jobs/${id}/checkout`);
    } catch {
      toast.error('Failed to check in');
    }
  }

  if (isLoading || !booking) {
    return (
      <AppShell className="px-4 pt-4 pb-8 gap-5">
        <div className="animate-pulse h-20 bg-card rounded" />
      </AppShell>
    );
  }

  const svcName = (booking as unknown as Record<string, unknown>)['serviceType']
    ? ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown>)['name'] as string
    : 'Service';

  const checkedInAt = booking.providerCheckedInAt
    ? new Date(booking.providerCheckedInAt)
    : null;

  const elapsed = checkedInAt
    ? formatDistanceStrict(new Date(), checkedInAt)
    : null;

  return (
    <AppShell className="px-4 pt-4 pb-8 gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30 bg-primary/10">
          {booking.status === 'in_progress' ? 'In progress' : 'Confirmed'}
        </Badge>
      </div>

      {/* Map placeholder */}
      <div className="relative bg-surface border border-border rounded-xl h-28 flex items-center justify-center overflow-hidden">
        <svg width="100%" height="112" viewBox="0 0 320 112" aria-hidden>
          <line x1="0" y1="56" x2="320" y2="56" stroke="#2A2A38" strokeWidth="0.5" />
          <line x1="160" y1="0" x2="160" y2="112" stroke="#2A2A38" strokeWidth="0.5" />
          <circle cx="160" cy="56" r="32" fill="rgba(123,110,246,0.1)" stroke="rgba(123,110,246,0.2)" strokeWidth="1" />
          <circle cx="160" cy="56" r="10" fill="#7B6EF6" />
        </svg>
        {checkedInAt && (
          <div className="absolute top-2 left-3">
            <span className="text-[10px] text-primary">
              ● Checked in · {format(checkedInAt, 'HH:mm')}
            </span>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
        {[
          { label: 'Service', value: svcName },
          { label: 'Scheduled', value: format(new Date(booking.scheduledAt), 'EEE d MMM · HH:mm') },
          ...(elapsed ? [{ label: 'Elapsed', value: elapsed }] : []),
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className={`text-xs ${row.label === 'Elapsed' ? 'font-semibold text-primary' : 'text-foreground'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
        <p className="text-xs text-warning">R{booking.totalAmount} escrowed · releases on completion</p>
      </div>

      <div className="flex gap-2 mt-auto">
        <button className="flex-1 bg-destructive/10 border border-destructive/20 rounded-xl py-3 text-center">
          <span className="text-xs text-destructive">Emergency</span>
        </button>
        {booking.status === 'confirmed' ? (
          <Button className="flex-[2]" onClick={handleCheckIn} disabled={checkIn.isPending}>
            {checkIn.isPending ? 'Checking in…' : 'Check in & start'}
          </Button>
        ) : (
          <Button className="flex-[2]" onClick={() => navigate(`/provider/jobs/${id}/checkout`)}>
            Complete job
          </Button>
        )}
      </div>
    </AppShell>
  );
}
