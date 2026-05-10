import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createDispute, getDisputeByBooking, getDisputeById } from '../services/disputeService';
import type { DisputeInput } from '@onserve/shared';

export function useDisputeByBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['dispute', 'booking', bookingId],
    queryFn: () => getDisputeByBooking(bookingId!),
    enabled: !!bookingId,
  });
}

export function useDispute(id: string | undefined) {
  return useQuery({
    queryKey: ['dispute', id],
    queryFn: () => getDisputeById(id!),
    enabled: !!id,
  });
}

export function useCreateDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, input }: { bookingId: string; input: DisputeInput }) =>
      createDispute(bookingId, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['booking', data.bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
