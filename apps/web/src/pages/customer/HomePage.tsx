import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServiceCategories } from '@/features/services/hooks/useServices';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  cleaning:    { bg: 'bg-primary/10',     text: 'text-primary' },
  beauty:      { bg: 'bg-purple/10',      text: 'text-purple' },
  plumbing:    { bg: 'bg-warning/10',     text: 'text-warning' },
  electrical:  { bg: 'bg-warning/10',     text: 'text-warning' },
  gardening:   { bg: 'bg-primary/10',     text: 'text-primary' },
  photography: { bg: 'bg-purple/10',      text: 'text-purple' },
  catering:    { bg: 'bg-destructive/10', text: 'text-destructive' },
  tutoring:    { bg: 'bg-primary/10',     text: 'text-primary' },
};

const CATEGORY_EMOJIS: Record<string, string> = {
  cleaning: '🧹', beauty: '✂️', plumbing: '🔧', electrical: '⚡',
  gardening: '🌿', photography: '📷', catering: '🍽️', tutoring: '📚',
};

export function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useServiceCategories();

  const firstName = (user?.user_metadata?.['full_name'] as string | undefined)?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <PageLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              {greeting}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">What would you like to get done today?</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-xs h-6 px-3">
              Sandton · Trusted
            </Badge>
          </div>
        </div>

        {/* Search bar */}
        <button
          onClick={() => navigate('/search')}
          className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-4 w-full text-left hover:border-primary/40 transition-colors"
        >
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden />
          <span className="text-sm text-muted-foreground">Search any service — cleaning, beauty, plumbing…</span>
        </button>

        {/* Service categories */}
        <section aria-label="Service categories">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">Browse services</h2>
            <button
              onClick={() => navigate('/search')}
              className="flex items-center gap-1 text-sm text-primary hover:opacity-80 transition-opacity"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl h-28 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {categories.map((cat) => {
                const colors = CATEGORY_COLORS[cat.slug] ?? { bg: 'bg-card', text: 'text-foreground' };
                const emoji = CATEGORY_EMOJIS[cat.slug] ?? '⚙️';
                return (
                  <button
                    key={cat.id}
                    onClick={() => navigate(`/search?categoryId=${cat.id}&category=${cat.slug}`)}
                    className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 transition-all hover:shadow-sm group"
                  >
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-3 text-xl`}>
                      {emoji}
                    </div>
                    <p className={`text-sm font-medium ${colors.text}`}>{cat.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">
                      Find providers →
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick actions</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'My bookings', description: 'View and manage your bookings', to: '/bookings', color: 'border-primary/20 bg-primary/5' },
              { label: 'Saved locations', description: 'Manage your service addresses', to: '/profile', color: 'border-purple/20 bg-purple/5' },
              { label: 'Profile', description: 'Update your account details', to: '/profile', color: 'border-border bg-card' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={`border rounded-xl p-5 text-left hover:opacity-80 transition-opacity ${action.color}`}
              >
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
