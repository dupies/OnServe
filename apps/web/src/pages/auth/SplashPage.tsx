import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';

export function SplashPage() {
  return (
    <AppShell className="items-center justify-center gap-8 px-6 pb-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="9" r="5" fill="var(--primary)" />
            <path
              d="M4 21c0-4 3.6-7 8-7s8 3 8 7"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">OnServe</h1>
          <p className="text-muted-foreground mt-1">Services at your door</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {[true, false, false].map((active, i) => (
          <div
            key={i}
            className={`w-6 h-1.5 rounded-full ${active ? 'bg-primary' : 'bg-surface'}`}
          />
        ))}
      </div>

      <div className="w-full flex flex-col gap-3 mt-4">
        <Button asChild className="w-full">
          <Link to="/login">Get started</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </AppShell>
  );
}
