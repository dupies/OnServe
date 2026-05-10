import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { setUserRole } from '@/features/auth/services/authService';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { UserRole } from '@onserve/types';
import { cn } from '@/lib/utils';

const OPTIONS: { value: UserRole; label: string; sub: string }[] = [
  { value: 'customer', label: 'I need services', sub: 'Book providers near you' },
  { value: 'provider', label: 'I provide services', sub: 'Earn money on your schedule' },
];

export function RoleSelectPage() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { setRole } = useAuthStore();
  const navigate = useNavigate();

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    try {
      await setUserRole(selected);
      setRole(selected);
      navigate(selected === 'provider' ? '/provider/onboarding' : '/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell className="px-6 pt-16 pb-8 gap-6">
      <h1 className="text-2xl font-semibold text-foreground">
        How will you use OnServe?
      </h1>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={cn(
                'text-left rounded-xl border p-4 transition-colors',
                active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
              )}
            >
              <p className="font-medium text-foreground text-sm">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <Button className="w-full" onClick={handleContinue} disabled={!selected || loading}>
          {loading ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </AppShell>
  );
}
