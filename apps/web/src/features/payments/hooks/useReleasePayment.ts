import { useMutation, useQueryClient } from '@tanstack/react-query';
import { releasePayment } from '../services/paymentService';

/**
 * Hook to release an escrowed payment to the provider
 *
 * Called by customer after verifying service completion, or triggered
 * automatically by cron after 48 hours.
 *
 * Usage:
 * ```tsx
 * const releaseMutation = useReleasePayment();
 *
 * const handleRelease = () => {
 *   releaseMutation.mutate(paymentId);
 * };
 * ```
 */
export function useReleasePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => releasePayment(paymentId),
    onSuccess: () => {
      // Invalidate payment queries to reflect updated status
      queryClient.invalidateQueries({ queryKey: ['payment'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      console.error('Payment release failed:', error);
    },
  });
}
