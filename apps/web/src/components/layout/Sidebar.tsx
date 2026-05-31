import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarCheck, User, Briefcase, DollarSign, Search, Bell, FileText, LayoutDashboard, Users, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
}

const customerNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/quote-requests', label: 'My Quotes', icon: FileText },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/profile', label: 'Profile', icon: User },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/disputes', label: 'Disputes', icon: ShieldAlert },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
];

const providerNav: NavItem[] = [
  { to: '/provider/jobs', label: 'Job Board', icon: Briefcase },
  { to: '/provider/quotes', label: 'Quotes', icon: FileText },
  { to: '/provider/earnings', label: 'Earnings', icon: DollarSign },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, role, signOut } = useAuthStore();
  const { data: unreadCount = 0 } = useUnreadCount();

  const items = role === 'admin' ? adminNav : role === 'provider' ? providerNav : customerNav;
  const fullName = (user?.user_metadata?.['full_name'] as string | undefined) ?? 'User';
  const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const avatarUrl = user?.user_metadata?.['avatar_url'] as string | undefined;

  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 bg-surface border-r border-border flex-col sticky top-0 h-svh">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="9" r="5" fill="var(--primary)" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">OnServe</span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon, badge }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
          const showBadge = badge && unreadCount > 0;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-semibold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-border pt-4 flex flex-col gap-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              : <span className="text-[10px] font-semibold text-primary">{initials}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{fullName.split(' ')[0]}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{role ?? 'user'}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-card"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
