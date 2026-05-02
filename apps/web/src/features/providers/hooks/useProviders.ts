import { useQuery } from '@tanstack/react-query';
import { searchProviders, getProviderProfile } from '../services/providerService';

export function useSearchProviders(lat: number | null, lng: number | null, radiusKm = 10) {
  return useQuery({
    queryKey: ['providers', 'search', lat, lng, radiusKm],
    queryFn: () => searchProviders(lat!, lng!, radiusKm),
    enabled: lat !== null && lng !== null,
  });
}

export function useProviderProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['provider-profile', userId],
    queryFn: () => getProviderProfile(userId!),
    enabled: !!userId,
  });
}
