import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServiceCategories } from '@/features/services/hooks/useServices';

const CATEGORY_COLORS: Record<string, string> = {
  cleaning: 'text-primary',
  beauty: 'text-purple',
  plumbing: 'text-warning',
  electrical: 'text-foreground',
  gardening: 'text-primary',
  photography: 'text-purple',
  catering: 'text-warning',
  tutoring: 'text-foreground',
};

export function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useServiceCategories();

  const firstName = user?.user_metadata?.['full_name']?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const displayed = categories.slice(0, 5);

  return (
    <AppShell className="pb-20">
      <main className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="w-7 h-7 rounded-full bg-purple/20 flex items-center justify-center">
            <span className="text-[10px] font-medium text-purple">
              {firstName.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-foreground">
          {greeting}, {firstName}
        </h1>

        <button
          onClick={() => navigate('/search')}
          className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 w-full text-left"
        >
          <Search className="w-4 h-4 text-muted-foreground" aria-hidden />
          <span className="text-sm text-muted-foreground">Search any service…</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-primary">Sandton</span>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-[10px] h-5">
            Trusted
          </Badge>
        </div>

        <section aria-label="Service categories">
          <h2 className="text-sm font-medium text-foreground mb-3">What do you need?</h2>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg py-3 animate-pulse h-10" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {displayed.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/search?categoryId=${cat.id}&category=${cat.slug}`)}
                  className="bg-card border border-border rounded-lg py-3 px-2 text-center"
                >
                  <span className={`text-xs font-medium ${CATEGORY_COLORS[cat.slug] ?? 'text-foreground'}`}>
                    {cat.name}
                  </span>
                </button>
              ))}
              {categories.length > 5 && (
                <button
                  onClick={() => navigate('/search')}
                  className="bg-card border border-border rounded-lg py-3 px-2 text-center"
                >
                  <span className="text-xs font-medium text-muted-foreground">More…</span>
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </AppShell>
  );
}
