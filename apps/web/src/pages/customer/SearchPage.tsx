import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLayout } from '@/components/layout/PageLayout';
import { useSearchProviders } from '@/features/providers/hooks/useProviders';
import { cn } from '@/lib/utils';

type Coords = { lat: number; lng: number } | null;

function useCurrentPosition() {
  const [coords, setCoords] = useState<Coords>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords({ lat: -26.1076, lng: 28.0567 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: -26.1076, lng: 28.0567 }),
      { timeout: 5000 },
    );
  }, []);

  return { coords };
}

const RADIUS_OPTIONS = [5, 10, 20, 50];
const RATING_OPTIONS = [
  { label: 'Any rating', min: 0 },
  { label: '4.5+', min: 4.5 },
  { label: '4.0+', min: 4.0 },
  { label: '3.5+', min: 3.5 },
];

export function SearchPage() {
  const [params] = useSearchParams();
  const category = params.get('category') ?? 'services';
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [minRating, setMinRating] = useState(0);

  const { coords } = useCurrentPosition();
  const { data: providers = [], isLoading } = useSearchProviders(
    coords?.lat ?? null,
    coords?.lng ?? null,
    radiusKm,
  );

  const filtered = useMemo(() => {
    let result = providers;
    if (minRating > 0) {
      result = result.filter((p) => p.ratingAverage >= minRating);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((p) =>
        p.bio?.toLowerCase().includes(q) ||
        p.userId.toLowerCase().includes(q)
      );
    }
    return result;
  }, [providers, minRating, query]);

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        {/* Header + search input */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground capitalize">{category}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {coords ? 'Providers near your location' : 'Locating you…'}
            </p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search providers…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-[220px_1fr] gap-6">
          {/* Filters sidebar */}
          <aside className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Rating</h2>
              <div className="flex flex-col gap-1">
                {RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setMinRating(opt.min)}
                    className={cn(
                      'text-left text-sm px-2 py-1.5 rounded-lg transition-colors',
                      minRating === opt.min
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Search radius</h2>
              <div className="flex flex-col gap-1">
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    onClick={() => setRadiusKm(km)}
                    className={cn(
                      'text-left text-sm px-2 py-1.5 rounded-lg transition-colors',
                      radiusKm === km
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface',
                    )}
                  >
                    {km} km
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{coords ? 'Your location' : 'Sandton, Johannesburg'}</span>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-32" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">
                  {providers.length === 0 ? 'No providers found nearby' : 'No providers match your filters'}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {providers.length === 0
                    ? 'Try increasing the search radius'
                    : 'Clear your filters or try a different search'}
                </p>
                {(minRating > 0 || query) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => { setMinRating(0); setQuery(''); }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} provider{filtered.length !== 1 ? 's' : ''}
                  {providers.length !== filtered.length && ` (${providers.length} total within ${radiusKm} km)`}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {filtered.map((p) => (
                    <article
                      key={p.id}
                      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                            {String(p.userId).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Provider</p>
                            <p className="text-xs text-muted-foreground">
                              {(p as unknown as Record<string, unknown>)['distance_km'] !== undefined
                                ? `${Number((p as unknown as Record<string, unknown>)['distance_km']).toFixed(1)} km away`
                                : `${radiusKm} km radius`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-warning font-medium">★ {p.ratingAverage.toFixed(1)}</p>
                          <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30 bg-primary/10 mt-1">
                            Available
                          </Badge>
                        </div>
                      </div>

                      {p.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.bio}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.totalJobsCompleted} jobs</span>
                        <span>{Math.round(p.completionRate * 100)}% completion</span>
                      </div>

                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/providers/${p.userId}`)}
                      >
                        View profile
                      </Button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
