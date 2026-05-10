import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin, Navigation, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLayout } from '@/components/layout/PageLayout';
import { useSearchProviders } from '@/features/providers/hooks/useProviders';
import { geocodeAddress } from '@/lib/geocoding';
import type { GeocodeResult } from '@/lib/geocoding';
import { cn } from '@/lib/utils';

// Sandton, JHB fallback
const FALLBACK = { lat: -26.1076, lng: 28.0567, label: 'Sandton, Johannesburg' };

type LocationMode = 'gps' | 'manual';
type Coords = { lat: number; lng: number; label: string } | null;

const RADIUS_OPTIONS = [5, 10, 20, 50];
const RATING_OPTIONS = [
  { label: 'Any rating', min: 0 },
  { label: '4.5+', min: 4.5 },
  { label: '4.0+', min: 4.0 },
  { label: '3.5+', min: 3.5 },
];

// ── GPS hook ──────────────────────────────────────────────────────────────────
function useGPSCoords() {
  // Start with fallback so providers load immediately — GPS refines the location
  const [coords, setCoords] = useState<Coords>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your location' });
        setLoading(false);
      },
      () => {
        setLoading(false); // keep FALLBACK coords
      },
      { timeout: 6000 },
    );
  }, []);

  return { coords, loading };
}

// ── Address autocomplete ───────────────────────────────────────────────────────
function AddressSearch({ onSelect }: { onSelect: (r: GeocodeResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function handleChange(val: string) {
    setQuery(val);
    setSelected('');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim() || val.length < 3) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await geocodeAddress(val);
        setResults(res.slice(0, 5));
      } finally {
        setSearching(false);
      }
    }, 700);
  }

  function pick(r: GeocodeResult) {
    setSelected(r.displayName);
    setQuery(r.displayName);
    setResults([]);
    onSelect(r);
  }

  function clear() {
    setQuery('');
    setSelected('');
    setResults([]);
  }

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="relative flex items-center">
        {searching
          ? <Loader2 className="absolute left-3 w-4 h-4 text-muted-foreground animate-spin pointer-events-none" />
          : <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />}
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter a city or address…"
          className="pl-9 pr-8"
        />
        {query && (
          <button onClick={clear} className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {results.length > 0 && !selected && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-lg z-50">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => pick(r)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface transition-colors text-sm border-b border-border last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground leading-snug line-clamp-2">{r.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') ?? 'services';
  const navigate = useNavigate();

  const [mode, setMode] = useState<LocationMode>('gps');
  const [manualCoords, setManualCoords] = useState<Coords>(null);
  const [query, setQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [minRating, setMinRating] = useState(0);

  const { coords: gpsCoords, loading: gpsLoading } = useGPSCoords();
  const activeCoords = mode === 'gps' ? gpsCoords : manualCoords;

  const { data: providers = [], isLoading } = useSearchProviders(
    activeCoords?.lat ?? null,
    activeCoords?.lng ?? null,
    radiusKm,
  );

  const filtered = useMemo(() => {
    let result = [...providers];
    if (minRating > 0) result = result.filter((p) => p.ratingAverage >= minRating);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) => p.bio?.toLowerCase().includes(q),
      );
    }
    // Sort by distance ascending (closest first)
    result.sort((a, b) => {
      const da = Number((a as unknown as Record<string, unknown>)['distance_km'] ?? Infinity);
      const db = Number((b as unknown as Record<string, unknown>)['distance_km'] ?? Infinity);
      return da - db;
    });
    return result;
  }, [providers, minRating, query]);

  const locationLabel = activeCoords?.label ?? (gpsLoading ? 'Locating…' : 'Unknown location');

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground capitalize">{category}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeCoords
              ? `Searching within ${radiusKm} km of ${locationLabel}`
              : mode === 'gps' && gpsLoading
              ? 'Getting your location…'
              : 'Enter a location to search'}
          </p>
        </div>

        {/* Location mode toggle + input */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
            <button
              onClick={() => setMode('gps')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm transition-colors',
                mode === 'gps'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground bg-card',
              )}
            >
              {gpsLoading && mode === 'gps'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Navigation className="w-3.5 h-3.5" />}
              My location
            </button>
            <div className="w-px bg-border" />
            <button
              onClick={() => setMode('manual')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm transition-colors',
                mode === 'manual'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground bg-card',
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              Enter address
            </button>
          </div>

          {mode === 'manual' ? (
            <AddressSearch
              onSelect={(r) => setManualCoords({ lat: r.lat, lng: r.lng, label: r.displayName })}
            />
          ) : (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter results…"
                className="pl-9"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-[220px_1fr] gap-6">
          {/* Filters */}
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
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {mode === 'manual' && !manualCoords ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">Enter a location to search</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Type a city or address above to find providers in that area
                </p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-36" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">
                  {providers.length === 0 ? 'No providers found in this area' : 'No providers match your filters'}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {providers.length === 0
                    ? 'Try increasing the search radius or a different location'
                    : 'Clear your filters to see all results'}
                </p>
                {(minRating > 0 || query) && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { setMinRating(0); setQuery(''); }}>
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

                      <Button size="sm" className="w-full" onClick={() => navigate(`/providers/${p.userId}`)}>
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
