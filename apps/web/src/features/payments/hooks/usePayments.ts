import { useMutation, useQuery } from '@tanstack/react-query';
import { createOzowPayment, getPaymentByBookingId } from '../services/paymentService';

export function useCreateOzowPayment() {
  return useMutation({
    mutationFn: (bookingId: string) => createOzowPayment(bookingId),
  });
}

// poll: refetch every 3s while the webhook settles the payment (result page).
export function usePaymentForBooking(
  bookingId: string | undefined,
  opts: { poll?: boolean } = {},
) {
  return useQuery({
    queryKey: ['payment', bookingId],
    queryFn: () => getPaymentByBookingId(bookingId!),
    enabled: !!bookingId,
    refetchInterval: opts.poll
      ? (query) => (query.state.data?.status === 'pending' || !query.state.data ? 3000 : false)
      : false,
  });
}
