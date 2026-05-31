import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Home, CalendarCheck, User, Briefcase, DollarSign, Search, Bell, FileText, LayoutDashboard, Users, ShieldAlert, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';

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

const providerNav: NavItem[] = [
  { to: '/provider/jobs', label: 'Job Board', icon: Briefcase },
  { to: '/provider/quotes', label: 'Quotes', icon: FileText },
  { to: '/provider/earnings', label: 'Earnings', icon: DollarSign },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/profile', label: 'Profile', icon: User },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/disputes', label: 'Disputes', icon: ShieldAlert },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuthStore();
  const { data: unreadCount = 0 } = useUnreadCount();

  const items = role === 'admin' ? adminNav : role === 'provider' ? providerNav : customerNav;
  const fullName = (user?.user_metadata?.['full_name'] as string | undefined) ?? 'User';
  const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const avatarUrl = user?.user_metadata?.['avatar_url'] as string | undefined;

  function handleNav(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-background border-b border-border">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-card transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="9" r="5" fill="var(--primary)" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">OnServe</span>
        </div>

        {/* Notification bell or avatar */}
        <Link to="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-card transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </Link>
      </header>

      {/* Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 p-0 gap-0 bg-surface border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="9" r="5" fill="var(--primary)" />
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">OnServe</span>
            </div>
            <SheetClose className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
            {items.map(({ to, label, icon: Icon, badge }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
              const showBadge = badge && unreadCount > 0;
              return (
                <button
                  key={to}
                  onClick={() => handleNav(to)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors text-left',
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
                </button>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="border-t border-border px-3 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  : <span className="text-xs font-semibold text-primary">{initials}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{fullName.split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground capitalize">{role ?? 'user'}</p>
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-card text-left"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
