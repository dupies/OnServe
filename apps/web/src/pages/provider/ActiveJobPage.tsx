import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
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
      <PageLayout>
        <div className="max-w-3xl animate-pulse flex flex-col gap-4">
          <div className="h-40 bg-card rounded-xl" />
          <div className="h-24 bg-card rounded-xl" />
        </div>
      </PageLayout>
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
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Active job</h1>
            <p className="text-muted-foreground text-sm mt-1">{svcName}</p>
          </div>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
            {booking.status === 'in_progress' ? 'In progress' : 'Confirmed'}
          </Badge>
        </div>

        <div className="grid grid-cols-[1fr_280px] gap-6 items-start">
          {/* Left: map + job details */}
          <div className="flex flex-col gap-4">
            {/* Map placeholder */}
            <div className="relative bg-surface border border-border rounded-xl overflow-hidden h-64 flex items-center justify-center">
              <svg width="100%" height="256" viewBox="0 0 600 256" aria-hidden>
                {Array.from({ length: 8 }, (_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 32} x2="600" y2={i * 32} stroke="#2A2A38" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 12 }, (_, i) => (
                  <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="256" stroke="#2A2A38" strokeWidth="0.5" />
                ))}
                <circle cx="300" cy="128" r="60" fill="rgba(123,110,246,0.08)" stroke="rgba(123,110,246,0.2)" strokeWidth="1" />
                <circle cx="300" cy="128" r="16" fill="#7B6EF6" />
                <circle cx="300" cy="128" r="6" fill="white" />
              </svg>
              {checkedInAt && (
                <div className="absolute top-3 left-3 bg-background/90 border border-border rounded-lg px-3 py-1.5">
                  <span className="text-xs text-primary font-medium">
                    Checked in · {format(checkedInAt, 'HH:mm')}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              {[
                { label: 'Service', value: svcName },
                { label: 'Scheduled', value: format(new Date(booking.scheduledAt), 'EEE d MMM · HH:mm') },
                ...(elapsed ? [{ label: 'Elapsed', value: elapsed }] : []),
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className={`text-sm ${row.label === 'Elapsed' ? 'font-semibold text-primary' : 'text-foreground'}`}>
                      {row.value}
                    </span>
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </div>

          {/* Right: escrow + actions */}
          <div className="flex flex-col gap-4">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-5">
              <p className="text-xs font-semibold text-warning mb-1">Escrow held</p>
              <p className="text-2xl font-semibold text-warning">R {booking.totalAmount}</p>
              <p className="text-xs text-warning/80 mt-1">Released on customer approval</p>
            </div>

            {booking.status === 'confirmed' ? (
              <Button className="w-full" size="lg" onClick={handleCheckIn} disabled={checkIn.isPending}>
                {checkIn.isPending ? 'Checking in…' : 'Check in & start'}
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={() => navigate(`/provider/jobs/${id}/checkout`)}>
                Complete job
              </Button>
            )}

            <button
              className="w-full bg-destructive/10 border border-destructive/20 rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
              onClick={() => toast.error('Emergency contact — feature coming soon')}
            >
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">Emergency</span>
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
