import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { getAdminDisputes } from '@/features/admin/services/adminService';
import { format } from 'date-fns';
import type { DisputeStatus } from '@onserve/types';

const STATUS_META: Record<DisputeStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-destructive border-destructive/30 bg-destructive/10' },
  under_review: { label: 'Under review', color: 'text-warning border-warning/30 bg-warning/10' },
  resolved_customer: { label: 'Resolved (customer)', color: 'text-primary border-primary/30 bg-primary/10' },
  resolved_provider: { label: 'Resolved (provider)', color: 'text-primary border-primary/30 bg-primary/10' },
  escalated: { label: 'Escalated', color: 'text-destructive border-destructive/30 bg-destructive/10' },
};

const STATUSES: DisputeStatus[] = ['open', 'under_review', 'resolved_customer', 'resolved_provider', 'escalated'];

export function AdminDisputesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: getAdminDisputes,
  });

  const filtered = statusFilter === 'all'
    ? disputes
    : disputes.filter((d) => d.status === statusFilter);

  return (
    <PageLayout>
      <div className="max-w-5xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{disputes.length} total disputes</p>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {(['all', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <AlertTriangle className="w-6 h-6" />
              <p>No disputes found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Raised
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/admin/disputes/${d.id}`)}
                    className={`border-b border-border last:border-0 hover:bg-surface transition-colors cursor-pointer ${
                      i % 2 === 0 ? '' : 'bg-surface/30'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground capitalize">
                        {d.reason.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-muted-foreground truncate">{d.description}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={`text-xs w-fit ${STATUS_META[d.status].color}`}>
                        {STATUS_META[d.status].label}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(d.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs text-primary hover:text-primary/80 font-medium">View →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
