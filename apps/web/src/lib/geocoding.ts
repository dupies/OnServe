export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    displayName: r.display_name,
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = (await res.json()) as { display_name: string };
  return data.display_name;
}

export async function reverseGeocodeShort(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return 'Your location';
  const data = (await res.json()) as {
    address?: { suburb?: string; city_district?: string; city?: string; town?: string; village?: string; state?: string };
  };
  const a = data.address ?? {};
  return a.suburb ?? a.city_district ?? a.city ?? a.town ?? a.village ?? a.state ?? 'Your location';
}
