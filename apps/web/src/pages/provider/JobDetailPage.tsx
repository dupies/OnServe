import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
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
      <PageLayout>
        <div className="max-w-3xl animate-pulse flex flex-col gap-4">
          <div className="h-4 bg-card rounded w-40" />
          <div className="h-40 bg-card rounded-xl" />
          <div className="h-24 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!booking) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-muted-foreground text-sm">Job not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </PageLayout>
    );
  }

  const svcName = (booking as unknown as Record<string, unknown>)['serviceType']
    ? ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown>)['name'] as string
    : 'Service';

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to jobs
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Job detail</h1>
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              {booking.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_280px] gap-6 items-start">
          {/* Left: job info */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">{svcName}</h2>
                <span className="text-xl font-semibold text-primary">R {booking.totalAmount}</span>
              </div>
              <Separator className="mb-4" />
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Scheduled', value: format(new Date(booking.scheduledAt), 'EEE d MMM · HH:mm'), icon: Clock },
                  { label: 'Status', value: booking.status.replace(/_/g, ' '), icon: Shield },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <row.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm text-foreground capitalize">{row.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer notes placeholder */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Customer notes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {(booking as unknown as Record<string, unknown>)['customerNotes'] as string || 'No special instructions provided.'}
              </p>
            </div>
          </div>

          {/* Right: safety + actions */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Area safety</p>
                <span className="text-sm font-semibold text-primary">80/100</span>
              </div>
              <Progress value={80} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">Risk score: Low</p>
              <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30 bg-primary/10 mt-3">
                Trusted area
              </Badge>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-3">Payment</p>
              <p className="text-2xl font-semibold text-primary">R {booking.totalAmount}</p>
              <p className="text-xs text-muted-foreground mt-1">Held in escrow</p>
            </div>

            {booking.status === 'pending' && (
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={handleAccept} disabled={acceptBooking.isPending}>
                  {acceptBooking.isPending ? 'Accepting…' : 'Accept job'}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => navigate(-1)}>
                  Decline
                </Button>
              </div>
            )}

            {booking.status === 'confirmed' && (
              <Button className="w-full" onClick={() => navigate(`/provider/jobs/${id}/active`)}>
                Start job
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
