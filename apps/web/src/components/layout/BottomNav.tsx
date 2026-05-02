import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarCheck, MessageSquare, User, Briefcase, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const customerNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
];

const providerNav: NavItem[] = [
  { to: '/provider', label: 'Overview', icon: Home },
  { to: '/provider/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/provider/earnings', label: 'Earn', icon: DollarSign },
  { to: '/provider/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { role } = useAuthStore();

  const items = role === 'provider' ? providerNav : customerNav;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm border-t border-border bg-background z-50">
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
