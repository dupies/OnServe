import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSavedLocations, saveLocation, deleteLocation } from '../services/locationService';
import type { SavedLocation } from '@onserve/types';

export function useSavedLocations() {
  return useQuery({
    queryKey: ['saved-locations'],
    queryFn: getSavedLocations,
  });
}

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (location: Omit<SavedLocation, 'id' | 'visitCount' | 'trustScore' | 'createdAt'>) =>
      saveLocation(location),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-locations'] }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-locations'] }),
  });
}
