import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { reverseGeocodeShort } from '@/lib/geocoding';

const FALLBACK = { lat: -26.1076, lng: 28.0567, label: 'Sandton, Johannesburg' };

export type GPSCoords = { lat: number; lng: number; label: string };

export function useGPS() {
  const [coords, setCoords] = useState<GPSCoords>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLoading(false); return; }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;

        const { latitude, longitude } = pos.coords;
        let label = 'Your location';
        try { label = await reverseGeocodeShort(latitude, longitude); } catch { /* keep default */ }
        if (!cancelled) setCoords({ lat: latitude, lng: longitude, label });
      } catch {
        // keep FALLBACK
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { coords, loading };
}
