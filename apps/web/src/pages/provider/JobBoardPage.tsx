import { useNavigate } from 'react-router-dom';
import { Briefcase, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
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
    <PageLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Job board</h1>
            <p className="text-muted-foreground text-sm mt-1">Review and accept incoming job requests</p>
          </div>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
            Online
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Active jobs', value: active.length.toString(), icon: Briefcase, color: 'text-primary' },
            { label: "Today's earnings", value: `R ${todayEarnings.toFixed(0)}`, icon: TrendingUp, color: 'text-primary' },
            { label: 'Pending requests', value: pending.length.toString(), icon: Clock, color: 'text-warning' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-semibold text-foreground mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          {/* New requests */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">New requests</h2>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-28" />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center mb-3 text-lg">
                  📋
                </div>
                <p className="text-sm font-medium text-foreground">No new job requests</p>
                <p className="text-xs text-muted-foreground mt-1">New requests will appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map((job) => {
                  const svcName = (job as unknown as Record<string, unknown>)['serviceType']
                    ? ((job as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown>)['name'] as string
                    : 'Service';
                  return (
                    <article key={job.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{svcName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(job.scheduledAt), 'EEE d MMM · HH:mm')}
                          </p>
                        </div>
                        <span className="text-lg font-semibold text-primary">R {job.totalAmount}</span>
                      </div>
                      <Separator className="my-3" />
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
                          View details
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active jobs sidebar */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Active jobs</h2>
            {active.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <p className="text-xs text-muted-foreground">No active jobs right now</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {active.map((job) => {
                  const svcName = (job as unknown as Record<string, unknown>)['serviceType']
                    ? ((job as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown>)['name'] as string
                    : 'Service';
                  return (
                    <button
                      key={job.id}
                      onClick={() => navigate(`/provider/jobs/${job.id}/active`)}
                      className="bg-card border border-primary/20 rounded-xl p-4 text-left hover:border-primary/40 transition-colors w-full"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{svcName}</p>
                        <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30 bg-primary/10">
                          {job.status === 'in_progress' ? 'In progress' : 'Confirmed'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(job.scheduledAt), 'HH:mm')}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
