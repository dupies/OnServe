import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRating } from '../services/ratingService';
import type { RatingInput } from '@onserve/shared';

export function useCreateRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, input }: { bookingId: string; input: RatingInput }) =>
      createRating(bookingId, input),
    onSuccess: (_, { bookingId }) => {
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
