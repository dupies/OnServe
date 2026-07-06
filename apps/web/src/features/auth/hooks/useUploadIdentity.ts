import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '@/features/auth/services/identityService';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { DocumentUploadRequest, IdentityDocument } from '@onserve/types';

export function useUploadIdentity() {
  const user = useAuthStore((state: any) => state.user);
  const queryClient = useQueryClient();

  return useMutation<IdentityDocument, Error, DocumentUploadRequest>({
    mutationFn: (request) => {
      if (!user?.id) throw new Error('User not authenticated');
      return uploadDocument(user.id, request);
    },
    onSuccess: () => {
      // Invalidate documents query to refetch
      queryClient.invalidateQueries({ queryKey: ['identity-documents', user?.id] });
    },
  });
}
