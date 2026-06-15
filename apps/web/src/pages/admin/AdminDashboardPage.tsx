import { AlertTriangle, UserPlus, Users, User, Wrench, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingState, ErrorState } from '@/components/common';
import { getAdminOverview } from '@/features/admin/services/adminService';

const ACTION_ITEMS = [
  { id: '#1092', type: 'dispute', label: 'Dispute #1092 escalated', severity: 'high' as const, to: '/admin/disputes' },
  { id: 'ids', type: 'id_check', label: '8 provider IDs pending review', severity: 'medium' as const, to: '/admin/users' },
  { id: 'loc', type: 'location', label: 'Suspicious location flagged', severity: 'low' as const, to: null },
];

const RECENT_ACTIVITY = [
  { label: 'New booking', detail: 'Deep clean · Sandton', time: '2 min ago' },
  { label: 'Payment released', detail: 'R 450 → Zanele M.', time: '14 min ago' },
  { label: 'Provider registered', detail: 'Sipho K. awaiting ID check', time: '1 hr ago' },
  { label: 'Dispute raised', detail: 'Booking #A8F2 · Work not completed', time: '2 hr ago' },
  { label: 'Booking cancelled', detail: 'Box braids · Khanyi D.', time: '3 hr ago' },
];

export function AdminDashboardPage() {
  const { data: overview, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: getAdminOverview,
  });

  return (
    <PageLayout>
      <div className="max-w-5xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Platform overview</h1>
            <p className="text-muted-foreground text-sm mt-1">OnServe admin dashboard</p>
          </div>
          <Badge variant="outline" className="text-[#7B6EF6] border-[#7B6EF6]/30 bg-[#7B6EF6]/10">
            Admin
          </Badge>
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <LoadingState label="Loading metrics…" />
        ) : error || !overview ? (
          <ErrorState message="Could not load platform metrics." onRetry={() => refetch()} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total users" value={overview.totalUsers} icon={Users} color="text-foreground" />
            <StatCard label="Customers" value={overview.customers} icon={User} color="text-foreground" />
            <StatCard label="Providers" value={overview.providers} icon={Wrench} color="text-primary" />
            <StatCard label="New (7d)" value={overview.newSignups7d} icon={UserPlus} color="text-primary" accent />
            <StatCard
              label="Pending IDs"
              value={overview.pendingVerifications}
              icon={ShieldCheck}
              color="text-warning"
              to="/admin/verifications"
            />
            <StatCard
              label="Open disputes"
              value={overview.openDisputes}
              icon={AlertTriangle}
              color="text-destructive"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Requires action */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Requires action</h2>
            <div className="flex flex-col gap-3">
              {ACTION_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    item.severity === 'high'
                      ? 'border-destructive/20 bg-destructive/5'
                      : item.severity === 'medium'
                      ? 'border-warning/20 bg-warning/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.severity === 'high'
                        ? 'bg-destructive'
                        : item.severity === 'medium'
                        ? 'bg-warning'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  <p className="text-sm text-foreground flex-1">{item.label}</p>
                  {item.to ? (
                    <Link to={item.to} className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                      Review →
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Recent activity</h2>
            <div className="flex flex-col gap-3">
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  accent = false,
  to,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accent?: boolean;
  to?: string;
}) {
  const card = (
    <div
      className={`rounded-xl border p-5 h-full ${
        accent ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
      } ${to ? 'hover:border-primary/40 transition-colors' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
