import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarCheck, MessageSquare, User, Briefcase, DollarSign, Search, LayoutDashboard, Users, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const customerNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/profile', label: 'Profile', icon: User },
];

const providerNav: NavItem[] = [
  { to: '/provider/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/provider/quotes', label: 'Quotes', icon: MessageSquare },
  { to: '/provider/earnings', label: 'Earn', icon: DollarSign },
  { to: '/profile', label: 'Profile', icon: User },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/disputes', label: 'Disputes', icon: ShieldAlert },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { role } = useAuthStore();

  const items = role === 'admin' ? adminNav : role === 'provider' ? providerNav : customerNav;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background z-50">
      <div className="flex justify-around py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              {active && (
                <span className="w-4 h-0.5 rounded-full bg-primary" />
              )}
              {!active && <span className="w-4 h-0.5" />}
              <Icon
                className={cn(
                  'w-4 h-4',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-[10px]',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
