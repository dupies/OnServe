import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function LiveTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);

  if (isLoading || !booking) {
    return (
      <PageLayout>
        <div className="max-w-3xl animate-pulse flex flex-col gap-4">
          <div className="h-64 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  const provider = (booking as unknown as Record<string, unknown>)['provider'] as Record<string, unknown> | undefined;
  const svcName = ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown> | undefined)?.['name'] as string | undefined ?? 'Service';
  const checkedInAt = booking.providerCheckedInAt ? new Date(booking.providerCheckedInAt) : null;

  const isLive = booking.status === 'in_progress';

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/bookings/${booking.id}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Job in progress</h1>
              <p className="text-muted-foreground text-sm mt-1">{svcName}</p>
            </div>
            {isLive && (
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 animate-pulse">
                ● Live
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-6 items-start">
          {/* Map */}
          <div className="flex flex-col gap-4">
            <div className="relative bg-[#1A2A1A] border border-border rounded-xl overflow-hidden h-72 flex items-center justify-center">
              <svg width="100%" height="288" viewBox="0 0 600 288" aria-label="Live tracking map" role="img">
                {Array.from({ length: 10 }, (_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 32} x2="600" y2={i * 32} stroke="#2A2A38" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 14 }, (_, i) => (
                  <line key={`v${i}`} x1={i * 43} y1="0" x2={i * 43} y2="288" stroke="#2A2A38" strokeWidth="0.5" />
                ))}
                {/* Route */}
                <path d="M120 220 Q200 160 280 150 Q360 140 420 80" stroke="#00D97E" strokeWidth="2" strokeDasharray="6 4" fill="none" />
                {/* Provider dot */}
                <circle cx="400" cy="90" r="14" fill="rgba(0,217,126,0.12)" stroke="#00D97E" strokeWidth="1.5" />
                <circle cx="400" cy="90" r="5" fill="#00D97E" />
                {/* Customer dot */}
                <circle cx="120" cy="220" r="10" fill="rgba(123,110,246,0.15)" stroke="#7B6EF6" strokeWidth="1.5" />
                <circle cx="120" cy="220" r="4" fill="#7B6EF6" />
              </svg>
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                <div className="bg-background/90 border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs text-primary font-medium">Provider</span>
                </div>
                <div className="bg-background/90 border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#7B6EF6]" />
                  <span className="text-xs text-[#7B6EF6] font-medium">You</span>
                </div>
              </div>
              {checkedInAt && (
                <div className="absolute bottom-3 left-3 bg-background/90 border border-border rounded-lg px-3 py-1.5">
                  <span className="text-xs text-primary font-medium">
                    Checked in · {format(checkedInAt, 'HH:mm')}
                  </span>
                </div>
              )}
            </div>

            {/* Provider info */}
            {provider && (
              <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-primary text-sm">
                    {String(provider['display_name'] ?? 'P').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{String(provider['display_name'] ?? 'Provider')}</p>
                    <p className="text-xs text-muted-foreground">
                      {checkedInAt ? `Checked in · ${format(checkedInAt, 'HH:mm')}` : 'On the way'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toast.info('Call feature requires a phone number')}
                  className="flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted/10 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </button>
              </div>
            )}
          </div>

          {/* Timeline + Actions */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Progress</h2>
              <div className="flex flex-col gap-4">
                <StatusStep done label="Booking confirmed" time={format(new Date(booking.createdAt), 'HH:mm')} />
                <StatusStep done={!!checkedInAt} label="Provider checked in" time={checkedInAt ? format(checkedInAt, 'HH:mm') : undefined} />
                <StatusStep done={false} label="Job complete" muted />
              </div>
            </div>

            {isLive && (
              <>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/complete/${booking.id}`)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve completion
                </Button>
                <button
                  className="w-full bg-destructive/10 border border-destructive/20 rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
                  onClick={() => navigate(`/disputes/new/${booking.id}`)}
                >
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">Raise an issue</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function StatusStep({
  done,
  label,
  time,
  muted,
}: {
  done: boolean;
  label: string;
  time?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${done ? 'bg-primary' : muted ? 'bg-muted' : 'bg-muted'}`} />
      <div className="flex-1">
        <p className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {label}
        </p>
        {time && <p className="text-xs text-muted-foreground">{time}</p>}
      </div>
    </div>
  );
}
