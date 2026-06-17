import { useQuery } from '@tanstack/react-query';
import { getPaymentByBooking } from '../services/paymentService';
import type { PaymentRecord } from '@onserve/types';

/**
 * Hook to fetch and poll payment status by booking ID
 *
 * Used in PaymentSuccessPage to check if Ozow webhook has confirmed payment.
 * Automatically refetches at intervals until payment status changes from pending.
 *
 * Usage:
 * ```tsx
 * const { data: payment, isLoading, error } = useGetPayment(bookingId, {
 *   refetchInterval: 2000, // Poll every 2 seconds
 *   enabled: bookingId !== undefined,
 * });
 * ```
 */
export function useGetPayment(
  bookingId: string | undefined,
  options?: {
    refetchInterval?: number; // Polling interval in ms (default 2000)
    enabled?: boolean;
  },
) {
  return useQuery<PaymentRecord | null>({
    queryKey: ['payment', bookingId],
    queryFn: () => (bookingId ? getPaymentByBooking(bookingId) : null),
    enabled: options?.enabled ?? !!bookingId,
    refetchInterval: options?.refetchInterval ?? 2000,
    staleTime: 0, // Always consider data stale to force fresh fetches
    retry: 1, // Retry once on error, but don't loop endlessly
  });
}
