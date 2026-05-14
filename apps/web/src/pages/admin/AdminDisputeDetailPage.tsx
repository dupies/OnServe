import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { getAdminDisputeById, resolveDispute } from '@/features/admin/services/adminService';
import { format } from 'date-fns';
import type { DisputeStatus } from '@onserve/types';

const STATUS_META: Record<DisputeStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-destructive border-destructive/30 bg-destructive/10' },
  under_review: { label: 'Under review', color: 'text-warning border-warning/30 bg-warning/10' },
  resolved_customer: { label: 'Resolved (customer)', color: 'text-primary border-primary/30 bg-primary/10' },
  resolved_provider: { label: 'Resolved (provider)', color: 'text-primary border-primary/30 bg-primary/10' },
  escalated: { label: 'Escalated', color: 'text-destructive border-destructive/30 bg-destructive/10' },
};

const OUTCOMES: { value: 'resolved_customer' | 'resolved_provider' | 'escalated'; label: string }[] = [
  { value: 'resolved_customer', label: 'Resolve — favour customer' },
  { value: 'resolved_provider', label: 'Resolve — favour provider' },
  { value: 'escalated', label: 'Escalate for further review' },
];

export function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<'resolved_customer' | 'resolved_provider' | 'escalated'>('resolved_customer');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dispute', id],
    queryFn: () => getAdminDisputeById(id!),
    enabled: !!id,
  });

  const { mutate: resolve, isPending } = useMutation({
    mutationFn: () => resolveDispute(id!, outcome, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dispute', id] });
      qc.invalidateQueries({ queryKey: ['admin-disputes'] });
    },
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-3xl animate-pulse flex flex-col gap-4">
          <div className="h-4 bg-card rounded w-24" />
          <div className="h-40 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <p className="text-muted-foreground">Dispute not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </PageLayout>
    );
  }

  const statusMeta = STATUS_META[data.status];
  const canResolve = data.status === 'open' || data.status === 'under_review';
  const booking = data.booking;
  const isResolved = data.status === 'resolved_customer' || data.status === 'resolved_provider';

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dispute</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{data.id}</p>
          </div>
          <Badge variant="outline" className={`text-xs ${statusMeta.color}`}>
            {statusMeta.label}
          </Badge>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Dispute info */}
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Dispute details</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Raised by</p>
                <p className="text-foreground font-mono text-xs">{data.raisedByUserId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-foreground capitalize">{data.reason.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-foreground leading-relaxed">{data.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Raised</p>
                <p className="text-foreground">{format(new Date(data.createdAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
            </div>
            {data.evidenceUrls.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Evidence</p>
                <div className="flex flex-col gap-1">
                  {data.evidenceUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> File {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking info */}
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Booking</h2>
            {Object.keys(booking).length > 0 ? (
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Booking ID</p>
                  <p className="text-foreground font-mono text-xs">{data.bookingId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className="text-foreground capitalize">{String(booking['status'] ?? '—').replace(/_/g, ' ')}</p>
                </div>
                {booking['scheduled_at'] && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
                    <p className="text-foreground">
                      {format(new Date(booking['scheduled_at'] as string), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                )}
                {booking['total_amount'] && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="text-foreground font-semibold">R {Number(booking['total_amount']).toFixed(2)}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Booking details unavailable</p>
            )}
          </div>
        </div>

        {/* Resolution */}
        {isResolved && data.resolutionNotes && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Resolution notes</p>
              <p className="text-sm text-muted-foreground">{data.resolutionNotes}</p>
              {data.resolvedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Resolved {format(new Date(data.resolvedAt), 'dd MMM yyyy HH:mm')}
                </p>
              )}
            </div>
          </div>
        )}

        {canResolve && (
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Resolve dispute</h2>
            <div className="flex flex-col gap-2">
              {OUTCOMES.map((o) => (
                <label key={o.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="outcome"
                    value={o.value}
                    checked={outcome === o.value}
                    onChange={() => setOutcome(o.value)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="text-sm text-foreground">{o.label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Resolution notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the outcome and reasoning..."
                rows={3}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
              />
            </div>
            <Button
              onClick={() => resolve()}
              disabled={!notes.trim() || isPending}
              className="w-full"
            >
              {isPending ? 'Resolving…' : 'Submit resolution'}
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
