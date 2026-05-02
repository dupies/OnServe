import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { useSearchProviders } from '@/features/providers/hooks/useProviders';
import { DEFAULT_SERVICE_RADIUS_KM } from '@onserve/shared';

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

export function SearchPage() {
  const [params] = useSearchParams();
  const category = params.get('category') ?? 'services';
  const navigate = useNavigate();

  const { coords } = useCurrentPosition();
  const { data: providers = [], isLoading } = useSearchProviders(
    coords?.lat ?? null,
    coords?.lng ?? null,
    DEFAULT_SERVICE_RADIUS_KM,
  );

  return (
    <AppShell className="pb-20">
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-card border border-primary/30 rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-primary" aria-hidden />
            <span className="text-sm text-foreground capitalize">{category}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No providers found nearby</p>
            <p className="text-xs text-muted-foreground mt-1">Try increasing the search radius</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{providers.length} providers near you</p>
            <div className="flex flex-col gap-3">
              {providers.map((p) => (
                <article key={p.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {String(p.userId).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Provider</p>
                        <p className="text-xs text-muted-foreground">
                          {(p as unknown as Record<string, unknown>)['distance_km'] as string}km away
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-warning">★ {p.ratingAverage.toFixed(1)}</p>
                      <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30 bg-primary/10 mt-1">
                        Available
                      </Badge>
                    </div>
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

      <BottomNav />
    </AppShell>
  );
}
