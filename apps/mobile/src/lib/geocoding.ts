export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
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
