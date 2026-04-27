import { supabase } from '../../../lib/supabase';
import type { ProviderProfile } from '@onserve/types';

export async function searchProviders(
  latitude: number,
  longitude: number,
  radiusKm = 10
): Promise<ProviderProfile[]> {
  const { data, error } = await supabase.rpc('search_providers_near', {
    lat: latitude,
    lng: longitude,
    radius_km: radiusKm,
  });
  if (error) throw new Error(error.message);
  return data as ProviderProfile[];
}

export async function getProviderProfile(userId: string): Promise<ProviderProfile> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*, users(*), provider_services(*, service_types(*))')
    .eq('user_id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data as ProviderProfile;
}
