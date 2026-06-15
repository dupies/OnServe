import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog } from '@/components/common';
import {
  getPendingVerifications,
  updateProviderVerification,
} from '@/features/admin/services/adminService';
import { notify } from '@/lib/notify';
import { format } from 'date-fns';

type PendingAction = { providerId: string; status: 'verified' | 'rejected'; name: string };

export function AdminVerificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [action, setAction] = useState<PendingAction | null>(null);

  const { data: pending = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: getPendingVerifications,
  });

  const { mutate: review, isPending } = useMutation({
    mutationFn: ({ providerId, status }: { providerId: string; status: 'verified' | 'rejected' }) =>
      updateProviderVerification(providerId, status),
    onSuccess: (_data, vars) => {
      notify.success(vars.status === 'verified' ? 'Provider approved' : 'Provider rejected');
      qc.invalidateQueries({ queryKey: ['admin-verifications'] });
      setAction(null);
    },
  });

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">Provider verifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pending.length} provider{pending.length === 1 ? '' : 's'} awaiting KYC review
          </p>
        </div>

        {isLoading ? (
          <LoadingState label="Loading verifications…" />
        ) : error ? (
          <ErrorState message="Could not load pending verifications." onRetry={() => refetch()} />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No pending verifications"
            description="All provider applications have been reviewed."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{p.fullName}</p>
                    {p.createdAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {format(new Date(p.createdAt), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  {p.idDocumentUrl ? (
                    <a
                      href={p.idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" /> View ID document
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground flex-shrink-0">No ID document</span>
                  )}
                </div>

                {p.bio && <p className="text-sm text-muted-foreground leading-relaxed">{p.bio}</p>}

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setAction({ providerId: p.id, status: 'verified', name: p.fullName })}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setAction({ providerId: p.id, status: 'rejected', name: p.fullName })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => (o ? undefined : setAction(null))}
        title={action?.status === 'verified' ? 'Approve provider' : 'Reject provider'}
        description={
          action
            ? action.status === 'verified'
              ? `Approve ${action.name}'s verification? They will be able to take jobs.`
              : `Reject ${action.name}'s verification? They will need to resubmit.`
            : undefined
        }
        confirmLabel={action?.status === 'verified' ? 'Approve' : 'Reject'}
        destructive={action?.status === 'rejected'}
        loading={isPending}
        onConfirm={() => {
          if (action) review({ providerId: action.providerId, status: action.status });
        }}
      />
    </PageLayout>
  );
}
