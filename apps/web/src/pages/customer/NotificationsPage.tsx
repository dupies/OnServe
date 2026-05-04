import { formatDistanceToNow } from 'date-fns';
import { Bell, CalendarCheck, CreditCard, Star, AlertTriangle, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/features/notifications/hooks/useNotifications';
import type { Notification } from '@/features/notifications/services/notificationService';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  booking:  { icon: CalendarCheck, color: 'text-primary',     bg: 'bg-primary/10' },
  payment:  { icon: CreditCard,    color: 'text-primary',     bg: 'bg-primary/10' },
  rating:   { icon: Star,          color: 'text-warning',     bg: 'bg-warning/10' },
  dispute:  { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  system:   { icon: Bell,          color: 'text-muted-foreground', bg: 'bg-card' },
};

function groupByDay(notifications: Notification[]) {
  const today = new Date();
  const todayStr = today.toDateString();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'This week', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (d.toDateString() === todayStr) groups[0].items.push(n);
    else if (d >= weekAgo) groups[1].items.push(n);
    else groups[2].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

function NotificationRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const cfg = TYPE_CONFIG[n.type];
  const Icon = cfg.icon;

  return (
    <button
      onClick={() => { if (!n.isRead) onRead(n.id); }}
      className={cn(
        'w-full flex items-start gap-4 px-5 py-4 text-left transition-colors',
        n.isRead ? 'opacity-60' : 'bg-primary/[0.03] hover:bg-primary/[0.06]',
        !n.isRead && 'hover:bg-surface',
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('w-4 h-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', n.isRead ? 'font-normal text-foreground' : 'font-semibold text-foreground')}>
            {n.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
      </div>
      {!n.isRead && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" aria-label="Unread" />
      )}
    </button>
  );
}

export function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = groupByDay(notifications);

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="gap-2"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-surface flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 bg-surface rounded w-48" />
                  <div className="h-2.5 bg-surface rounded w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No notifications yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              You'll be notified about bookings, payments, and updates here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {unreadCount > 0 && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                  {unreadCount} unread
                </Badge>
              </div>
            )}

            {groups.map((group, gi) => (
              <section key={group.label}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {group.items.map((n, i) => (
                    <div key={n.id}>
                      {i > 0 && <Separator />}
                      <NotificationRow
                        n={n}
                        onRead={(id) => markAsRead.mutate(id)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
