import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useDispute } from '@/features/disputes/hooks/useDisputes';
import { format } from 'date-fns';
import type { DisputeStatus } from '@onserve/types';

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  resolved_customer: 'Resolved — refunded',
  resolved_provider: 'Resolved — released to provider',
  escalated: 'Escalated',
};

const STATUS_STYLES: Record<DisputeStatus, string> = {
  open: 'text-destructive border-destructive/30 bg-destructive/10',
  under_review: 'text-warning border-warning/30 bg-warning/10',
  resolved_customer: 'text-primary border-primary/30 bg-primary/10',
  resolved_provider: 'text-muted-foreground border-border',
  escalated: 'text-destructive border-destructive/30 bg-destructive/10',
};

const REASON_LABELS: Record<string, string> = {
  work_not_completed: 'Work not completed',
  quality_not_acceptable: 'Quality not acceptable',
  provider_no_show: 'Provider no-show',
};

export function DisputeStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dispute, isLoading } = useDispute(id);

  if (isLoading || !dispute) {
    return (
      <PageLayout>
        <div className="max-w-2xl animate-pulse flex flex-col gap-4">
          <div className="h-24 bg-card rounded-xl" />
          <div className="h-48 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  const isResolved = dispute.status.startsWith('resolved');
  const shortId = dispute.id.slice(0, 8).toUpperCase();

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/bookings')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to bookings
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Dispute #{shortId}</h1>
            <Badge variant="outline" className={STATUS_STYLES[dispute.status]}>
              {STATUS_LABELS[dispute.status]}
            </Badge>
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          {[
            { label: 'Reason', value: REASON_LABELS[dispute.reason] ?? dispute.reason },
            { label: 'Raised', value: format(new Date(dispute.createdAt), 'EEE d MMM · HH:mm') },
            ...(dispute.resolvedAt
              ? [{ label: 'Resolved', value: format(new Date(dispute.resolvedAt), 'EEE d MMM · HH:mm') }]
              : []),
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm text-foreground">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Timeline</h2>
          <div className="flex flex-col gap-4">
            <DisputeStep done color="destructive" label="Dispute raised" time={format(new Date(dispute.createdAt), 'HH:mm')} />
            <DisputeStep done color="warning" label="Funds frozen" />
            <DisputeStep done={dispute.status !== 'open'} color="warning" label="Admin reviewing" />
            <DisputeStep
              done={isResolved}
              color="primary"
              label="Resolution"
              subtitle={isResolved ? dispute.resolutionNotes ?? undefined : 'Est. 24–48 hours'}
            />
          </div>
        </div>

        {/* Frozen notice */}
        {!isResolved && (
          <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl px-5 py-4">
            <Shield className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-warning">Funds are frozen until the dispute is resolved</p>
          </div>
        )}

        {/* Resolution notes */}
        {dispute.resolutionNotes && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            <p className="text-xs font-semibold text-primary mb-2">Resolution notes</p>
            <p className="text-sm text-foreground">{dispute.resolutionNotes}</p>
          </div>
        )}

        {!isResolved && (
          <div className="flex flex-col gap-3">
            <Button variant="outline" className="w-full" onClick={() => navigate('/bookings')}>
              View bookings
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function DisputeStep({
  done,
  color,
  label,
  time,
  subtitle,
}: {
  done: boolean;
  color: 'destructive' | 'warning' | 'primary';
  label: string;
  time?: string;
  subtitle?: string;
}) {
  const dotClass = {
    destructive: 'bg-destructive',
    warning: 'bg-warning',
    primary: 'bg-primary',
  }[color];

  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${done ? dotClass : 'bg-muted'}`} />
      <div>
        <p className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {label}
        </p>
        {time && <p className="text-xs text-muted-foreground">{time}</p>}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
