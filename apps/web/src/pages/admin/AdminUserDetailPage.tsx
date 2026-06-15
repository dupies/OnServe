import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Shield, User as UserIcon, Wrench, Ban, PauseCircle, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog } from '@/components/common';
import { getAdminUserDetail, updateUserStatus } from '@/features/admin/services/adminService';
import { notify } from '@/lib/notify';
import { format } from 'date-fns';
import type { AccountStatus, UserRole } from '@onserve/types';

const ROLE_META: Record<UserRole, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  customer: { label: 'Customer', icon: UserIcon, color: 'text-foreground border-border bg-card' },
  provider: { label: 'Provider', icon: Wrench, color: 'text-primary border-primary/30 bg-primary/10' },
  admin: { label: 'Admin', icon: Shield, color: 'text-warning border-warning/30 bg-warning/10' },
};

const STATUS_META: Record<AccountStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-primary border-primary/30 bg-primary/10' },
  suspended: { label: 'Suspended', color: 'text-warning border-warning/30 bg-warning/10' },
  banned: { label: 'Banned', color: 'text-destructive border-destructive/30 bg-destructive/10' },
};

type Action = { status: AccountStatus; title: string; description: string; confirmLabel: string; needsReason: boolean; destructive: boolean };

const ACTIONS: Record<'suspend' | 'reactivate' | 'ban', Action> = {
  suspend: {
    status: 'suspended',
    title: 'Suspend user',
    description: 'Temporarily restrict this account. The user can be reactivated later.',
    confirmLabel: 'Suspend',
    needsReason: true,
    destructive: false,
  },
  ban: {
    status: 'banned',
    title: 'Ban user',
    description: 'Permanently ban this account from the platform.',
    confirmLabel: 'Ban',
    needsReason: true,
    destructive: true,
  },
  reactivate: {
    status: 'active',
    title: 'Reactivate user',
    description: 'Restore full access to this account.',
    confirmLabel: 'Reactivate',
    needsReason: false,
    destructive: false,
  },
};

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeAction, setActiveAction] = useState<keyof typeof ACTIONS | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => getAdminUserDetail(id!),
    enabled: !!id,
  });

  const { mutate: changeStatus, isPending } = useMutation({
    mutationFn: ({ status, reason: r }: { status: AccountStatus; reason?: string }) =>
      updateUserStatus(id!, status, r),
    onSuccess: (_data, vars) => {
      notify.success(
        vars.status === 'active'
          ? 'User reactivated'
          : vars.status === 'banned'
          ? 'User banned'
          : 'User suspended',
      );
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      closeDialog();
    },
  });

  function closeDialog() {
    setActiveAction(null);
    setReason('');
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-3xl">
          <LoadingState label="Loading user…" />
        </div>
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout>
        <div className="max-w-3xl">
          <ErrorState message="User not found." onRetry={() => refetch()} />
        </div>
      </PageLayout>
    );
  }

  const { user, bookings, disputes, ratings } = data;
  const role = ROLE_META[user.role];
  const RoleIcon = role.icon;
  const status = STATUS_META[user.accountStatus];
  const dialog = activeAction ? ACTIONS[activeAction] : null;
  const reasonInvalid = !!dialog?.needsReason && !reason.trim();

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to users
        </button>

        {/* Profile header */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-primary">
              {user.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{user.fullName}</h1>
              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${role.color}`}>
                <RoleIcon className="w-3 h-3" />
                {role.label}
              </Badge>
              <Badge variant="outline" className={`text-xs ${status.color}`}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.email ?? '—'}</p>
            {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Joined {format(new Date(user.createdAt), 'dd MMM yyyy')}
            </p>
            {user.accountStatus !== 'active' && user.suspensionReason && (
              <p className="text-xs text-warning mt-2">Reason: {user.suspensionReason}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {user.accountStatus === 'active' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveAction('suspend')}
                  className="gap-1"
                >
                  <PauseCircle className="w-4 h-4" /> Suspend
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setActiveAction('ban')}
                  className="gap-1"
                >
                  <Ban className="w-4 h-4" /> Ban
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setActiveAction('reactivate')} className="gap-1">
                <PlayCircle className="w-4 h-4" /> Reactivate
              </Button>
            )}
          </div>
        </div>

        {/* Bookings */}
        <Section title="Bookings" count={bookings.length}>
          {bookings.length === 0 ? (
            <EmptyState title="No bookings" description="This user has not made any bookings." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {bookings.map((b) => (
                <div key={String(b['id'])} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="text-foreground capitalize">
                      {String(b['status'] ?? '—').replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {String(b['id']).slice(0, 8)}…
                    </p>
                  </div>
                  <div className="text-right">
                    {b['total_amount'] != null && (
                      <p className="text-foreground font-medium">
                        R {Number(b['total_amount']).toFixed(2)}
                      </p>
                    )}
                    {b['created_at'] != null && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(String(b['created_at'])), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Disputes */}
        <Section title="Disputes" count={disputes.length}>
          {disputes.length === 0 ? (
            <EmptyState title="No disputes" description="This user has not raised any disputes." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {disputes.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/admin/disputes/${d.id}`)}
                  className="flex items-center justify-between py-3 text-sm text-left hover:bg-surface -mx-1 px-1 rounded transition-colors"
                >
                  <div>
                    <p className="text-foreground capitalize">{d.reason.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {d.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(d.createdAt), 'dd MMM yyyy')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Ratings */}
        <Section title="Ratings received" count={ratings.length}>
          {ratings.length === 0 ? (
            <EmptyState title="No ratings" description="This user has not received any ratings." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {ratings.map((r) => (
                <div key={String(r['id'])} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="text-foreground">{'★'.repeat(Number(r['score'] ?? 0)) || '—'}</p>
                    {r['comment'] != null && (
                      <p className="text-xs text-muted-foreground">{String(r['comment'])}</p>
                    )}
                  </div>
                  {r['created_at'] != null && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(String(r['created_at'])), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={!!dialog}
        onOpenChange={(o) => (o ? undefined : closeDialog())}
        title={dialog?.title ?? ''}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        destructive={dialog?.destructive}
        loading={isPending}
        onConfirm={() => {
          if (!dialog || reasonInvalid) return;
          changeStatus({ status: dialog.status, reason: dialog.needsReason ? reason.trim() : undefined });
        }}
      >
        {dialog?.needsReason && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this action is being taken…"
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
            />
          </div>
        )}
      </ConfirmDialog>
    </PageLayout>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {children}
    </div>
  );
}
