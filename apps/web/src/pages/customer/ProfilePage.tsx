import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuthStore } from '@/features/auth/store/authStore';

const MENU_ITEMS = [
  { label: 'Edit profile', to: '/profile/edit' },
  { label: 'Payment methods', to: '/profile/payments' },
  { label: 'Saved locations', to: '/profile/locations' },
  { label: 'Notifications', to: '/notifications' },
];

export function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const fullName = (user?.user_metadata?.['full_name'] as string | undefined) ?? 'User';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const phone = user?.phone ?? user?.user_metadata?.['phone'] ?? '';

  return (
    <AppShell className="pb-20">
      <main className="flex flex-col gap-5 px-4 pt-4">
        <section className="flex flex-col items-center gap-3 py-2">
          <div className="w-16 h-16 rounded-full bg-purple/10 border-2 border-purple/20 flex items-center justify-center">
            <span className="text-xl font-semibold text-purple">{initials}</span>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">{fullName}</h1>
            {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30 bg-primary/10">
              {user?.user_metadata?.['email_verified'] ? 'Verified' : 'Active'}
            </Badge>
          </div>
        </section>

        <div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden mb-1">
            <Progress value={80} className="h-full" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Good standing</span>
            <span className="text-[10px] text-primary">80/100</span>
          </div>
        </div>

        <Separator />

        <nav className="flex flex-col gap-2">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <span className="text-sm text-foreground">{item.label}</span>
              <span className="text-muted-foreground text-sm" aria-hidden>›</span>
            </button>
          ))}
          <button
            onClick={() => signOut()}
            className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <span className="text-sm text-destructive">Sign out</span>
            <span className="text-muted-foreground text-sm" aria-hidden>›</span>
          </button>
        </nav>
      </main>

      <BottomNav />
    </AppShell>
  );
}
