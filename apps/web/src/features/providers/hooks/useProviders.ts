import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { searchProviders, getProviderProfile, listAllProviders } from '../services/providerService';

const PAGE_SIZE = 20;

export function useSearchProviders(lat: number | null, lng: number | null, radiusKm = 10) {
  return useQuery({
    queryKey: ['providers', 'search', lat, lng, radiusKm],
    queryFn: () => searchProviders(lat!, lng!, radiusKm),
    enabled: lat !== null && lng !== null,
  });
}

export function useAllProviders(lat: number | null, lng: number | null) {
  return useInfiniteQuery({
    queryKey: ['providers', 'all', lat, lng],
    queryFn: ({ pageParam }) => listAllProviders(lat!, lng!, PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
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
