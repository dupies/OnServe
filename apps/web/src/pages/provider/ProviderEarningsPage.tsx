import { useNavigate } from 'react-router-dom';
import { TrendingUp, DollarSign, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { PageLayout } from '@/components/layout/PageLayout';
import { useProviderBookings } from '@/features/bookings/hooks/useBookings';
import { format } from 'date-fns';

const MOCK_DAILY = [
  { day: 'Mon', amount: 950 },
  { day: 'Tue', amount: 400 },
  { day: 'Wed', amount: 1200 },
  { day: 'Thu', amount: 750 },
  { day: 'Fri', amount: 1150 },
  { day: 'Sat', amount: 0 },
  { day: 'Sun', amount: 0 },
];

export function ProviderEarningsPage() {
  const navigate = useNavigate();
  const { data: bookings = [] } = useProviderBookings();

  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const totalEarned = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const maxDay = Math.max(...MOCK_DAILY.map((d) => d.amount), 1);

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Earnings</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your income and request payouts</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<DollarSign className="w-4 h-4 text-primary" />}
            label="This month"
            value={`R ${totalEarned.toLocaleString()}`}
            accent
          />
          <StatCard
            icon={<Briefcase className="w-4 h-4 text-muted-foreground" />}
            label="Jobs done"
            value={String(completedBookings.length)}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
            label="Available"
            value={`R ${Math.max(0, totalEarned - 1200).toLocaleString()}`}
          />
        </div>

        {/* Daily chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">This week</h2>
          <div className="flex flex-col gap-3">
            {MOCK_DAILY.map((d) => (
              <div key={d.day}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground w-8">{d.day}</span>
                  <span className={`text-xs font-medium ${d.amount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {d.amount > 0 ? `R ${d.amount.toLocaleString()}` : '—'}
                  </span>
                </div>
                <Progress value={(d.amount / maxDay) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent payouts */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent jobs</h2>
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              {completedBookings.length} completed
            </Badge>
          </div>
          {completedBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No completed jobs yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {completedBookings.slice(0, 5).map((b, i) => {
                const svcName = ((b as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown> | undefined)?.['name'] as string ?? 'Service';
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{svcName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(b.scheduledAt), 'EEE d MMM')}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">R {b.totalAmount}</span>
                    </div>
                    {i < completedBookings.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payout CTA */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Available for payout</p>
            <p className="text-2xl font-semibold text-primary mt-1">
              R {Math.max(0, totalEarned - 1200).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Processed within 1–2 business days</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/provider/payout')}
          >
            Request payout
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-semibold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
