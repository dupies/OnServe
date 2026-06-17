import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProviderBankDetails,
  updateProviderBankDetails,
} from '../services/paymentService';

interface BankDetailsInput {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  accountType: 'savings' | 'cheque';
  branchCode?: string;
}

/**
 * Hook to fetch provider's bank details
 *
 * Used to pre-fill bank details edit form
 *
 * Usage:
 * ```tsx
 * const { data: bankDetails, isLoading } = useGetBankDetails(providerId);
 * ```
 */
export function useGetBankDetails(providerId: string | undefined) {
  return useQuery({
    queryKey: ['bankDetails', providerId],
    queryFn: () => (providerId ? getProviderBankDetails(providerId) : null),
    enabled: !!providerId,
  });
}

/**
 * Hook to save provider bank details
 *
 * Called during provider onboarding or when updating bank account.
 * Validates account format and triggers verification flow.
 *
 * Usage:
 * ```tsx
 * const saveBankDetailsMutation = useSaveBankDetails();
 *
 * const handleSave = async (data: BankDetailsInput) => {
 *   saveBankDetailsMutation.mutate({ providerId, data });
 * };
 * ```
 */
export function useSaveBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: BankDetailsInput }) =>
      updateProviderBankDetails(providerId, data),
    onSuccess: (_data, variables) => {
      // Invalidate cache for this provider's bank details
      queryClient.invalidateQueries({
        queryKey: ['bankDetails', variables.providerId],
      });
    },
    onError: (error) => {
      console.error('Failed to save bank details:', error);
    },
  });
}
