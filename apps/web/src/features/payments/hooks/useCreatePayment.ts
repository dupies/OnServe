import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPayment } from '../services/paymentService';

/**
 * Hook to create a payment and redirect to Ozow payment gateway
 * Triggers payment creation, polls for success/failure, and redirects
 *
 * Usage:
 * ```tsx
 * const createPaymentMutation = useCreatePayment();
 * const handlePayment = () => {
 *   createPaymentMutation.mutate(bookingId);
 * };
 * ```
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => createPayment(bookingId),
    onSuccess: (data) => {
      // Invalidate payment queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      // Redirect to Ozow payment page
      // Note: This will leave the app briefly; payment status poll handled on return via /payment/success
      window.location.href = data.paymentUrl;
    },
    onError: (error) => {
      // Error is handled by the component via mutation.error
      console.error('Payment creation failed:', error);
    },
  });
}
