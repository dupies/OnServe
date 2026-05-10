import { useQuery } from '@tanstack/react-query';
import { getServiceCategories, getServiceTypesByCategory, getAllServiceTypes } from '../services/serviceService';

export function useAllServiceTypes() {
  return useQuery({
    queryKey: ['service-types'],
    queryFn: getAllServiceTypes,
  });
}

export function useServiceCategories() {
  return useQuery({
    queryKey: ['service-categories'],
    queryFn: getServiceCategories,
  });
}

export function useServiceTypes(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['service-types', categoryId],
    queryFn: () => getServiceTypesByCategory(categoryId!),
    enabled: !!categoryId,
  });
}
