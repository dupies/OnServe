import { useQuery } from '@tanstack/react-query';
import { getUserDocuments } from '@/features/auth/services/identityService';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { IdentityDocument } from '@onserve/types';

export function useIdentityDocuments() {
  const user = useAuthStore((state: any) => state.user);

  return useQuery<IdentityDocument[], Error>({
    queryKey: ['identity-documents', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getUserDocuments(user.id);
    },
    enabled: !!user?.id,
  });
}
