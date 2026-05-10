import { useEffect, useState } from 'react';
import { ArrowLeft, Home, Briefcase, MapPin, Star, Pencil, Trash2, Locate, Loader2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import {
  useSavedLocations,
  useSaveLocation,
  useUpdateLocation,
  useSetDefaultLocation,
  useDeleteLocation,
} from '@/features/location/hooks/useLocations';
import { useAuthStore } from '@/features/auth/store/authStore';
import { reverseGeocode } from '@/lib/geocoding';
import type { SavedLocation } from '@onserve/types';
import { cn } from '@/lib/utils';

const LABEL_ICONS = { Home, Work: Briefcase, Other: MapPin };
const LABELS: Array<SavedLocation['label']> = ['Home', 'Work', 'Other'];

// ── Add-from-GPS panel (mounted only while adding === true) ───────────────────
// Starts locating immediately on mount. Calls onDone() on success, cancel, or
// error — which unmounts this component and resets all internal state.
function AddLocationPanel({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [step, setStep] = useState<'locating' | 'confirm'>('locating');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState<SavedLocation['label']>('Home');
  const [customName, setCustomName] = useState('');
  const saveLocation = useSaveLocation();

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      onDone();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        try {
          const addr = await reverseGeocode(lat, lng);
          setAddress(addr);
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setStep('confirm');
      },
      () => {
        toast.error('Could not get your location. Please allow location access.');
        onDone();
      },
      { timeout: 10000 },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!coords) return;
    try {
      await saveLocation.mutateAsync({
        userId,
        label,
        customName: label === 'Other' && customName ? customName : null,
        formattedAddress: address,
        latitude: coords.lat,
        longitude: coords.lng,
        isDefault: false,
      });
      toast.success('Location saved');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save location');
    }
  }

  if (step === 'locating') {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-3" data-testid="locating-panel">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Getting your location…</p>
        </div>
        <button onClick={onDone} aria-label="Cancel" className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-5 flex flex-col gap-4" data-testid="confirm-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">New location</p>
        <button onClick={onDone} aria-label="Cancel" className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
        <span className="leading-relaxed" data-testid="resolved-address">{address}</span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Label</p>
        <div className="flex gap-2">
          {LABELS.map((l) => {
            const Icon = LABEL_ICONS[l];
            return (
              <button
                key={l}
                onClick={() => setLabel(l)}
                aria-pressed={label === l}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors',
                  label === l
                    ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {label === 'Other' && (
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Custom name (e.g. Gym, Parents)"
          data-testid="custom-name-input"
        />
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saveLocation.isPending} className="gap-1.5" data-testid="save-location-btn">
          {saveLocation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save location
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Inline edit form ──────────────────────────────────────────────────────────
function EditRow({ loc, onDone }: { loc: SavedLocation; onDone: () => void }) {
  const [label, setLabel] = useState<SavedLocation['label']>(loc.label);
  const [customName, setCustomName] = useState(loc.customName ?? '');
  const updateLocation = useUpdateLocation();

  async function save() {
    try {
      await updateLocation.mutateAsync({
        id: loc.id,
        updates: { label, customName: label === 'Other' ? customName || null : null },
      });
      toast.success('Location updated');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-3 bg-surface" data-testid="edit-row">
      <div className="flex gap-2">
        {LABELS.map((l) => {
          const Icon = LABEL_ICONS[l];
          return (
            <button
              key={l}
              onClick={() => setLabel(l)}
              aria-pressed={label === l}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors',
                label === l
                  ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {l}
            </button>
          );
        })}
      </div>
      {label === 'Other' && (
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Custom name"
          className="h-8 text-sm"
          data-testid="edit-custom-name"
        />
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={updateLocation.isPending} className="gap-1.5" data-testid="edit-save-btn">
          {updateLocation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────
function LocationCard({ loc }: { loc: SavedLocation }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const setDefault = useSetDefaultLocation();
  const deleteLocation = useDeleteLocation();

  const Icon = LABEL_ICONS[loc.label];
  const displayName = loc.label === 'Other' && loc.customName ? loc.customName : loc.label;

  async function handleDelete() {
    try {
      await deleteLocation.mutateAsync(loc.id);
      toast.success('Location removed');
    } catch {
      toast.error('Failed to delete location');
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`location-card-${loc.id}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            {loc.isDefault && (
              <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30 bg-primary/10">
                Default
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{loc.formattedAddress}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!loc.isDefault && (
            <button
              onClick={() => setDefault.mutate(loc.id)}
              disabled={setDefault.isPending}
              aria-label="Set as default"
              title="Set as default"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => { setEditing((e) => !e); setConfirmDelete(false); }}
            aria-label="Edit"
            title="Edit"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setConfirmDelete((c) => !c); setEditing(false); }}
            aria-label="Delete"
            title="Delete"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <>
          <Separator />
          <EditRow loc={loc} onDone={() => setEditing(false)} />
        </>
      )}

      {confirmDelete && !editing && (
        <>
          <Separator />
          <div className="px-5 py-3 bg-destructive/5 flex items-center justify-between gap-4" data-testid="delete-confirm-row">
            <p className="text-xs text-destructive">Remove this location?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLocation.isPending}
                className="h-7 text-xs"
                data-testid="confirm-delete-btn"
              >
                {deleteLocation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SavedLocationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: locations = [], isLoading } = useSavedLocations();
  const [adding, setAdding] = useState(false);

  const defaultLoc = locations.find((l) => l.isDefault);
  const others = locations.filter((l) => !l.isDefault);

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to profile
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Saved locations</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage your home, work, and other addresses</p>
            </div>
            {!adding && (
              <Button onClick={() => setAdding(true)} className="gap-2" data-testid="add-location-btn">
                <Locate className="w-4 h-4" />
                Add from current location
              </Button>
            )}
          </div>

          {adding && (
            <div className="mt-4">
              <AddLocationPanel userId={user?.id ?? ''} onDone={() => setAdding(false)} />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-16" />
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-state">
            <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No saved locations</p>
            <p className="text-muted-foreground text-sm mt-1">Add your current location to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {defaultLoc && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Default</h2>
                <LocationCard loc={defaultLoc} />
              </section>
            )}
            {others.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Other locations</h2>
                <div className="flex flex-col gap-3">
                  {others.map((loc) => (
                    <LocationCard key={loc.id} loc={loc} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
