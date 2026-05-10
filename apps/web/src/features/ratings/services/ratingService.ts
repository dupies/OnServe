import { supabase } from '@/lib/supabase';
import type { Rating } from '@onserve/types';
import type { RatingInput } from '@onserve/shared';

export async function createRating(bookingId: string, input: RatingInput): Promise<Rating> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('customer_id, provider_id')
    .eq('id', bookingId)
    .single();
  if (bErr) throw new Error(bErr.message);

  const ratedUserId = booking.provider_id;
  if (!ratedUserId) throw new Error('No provider on booking');

  const { data, error } = await supabase
    .from('ratings')
    .insert({
      booking_id: bookingId,
      rated_by_user_id: user.id,
      rated_user_id: ratedUserId,
      score: input.score,
      comment: input.comment ?? null,
      is_provider_rating: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    bookingId: data.booking_id,
    ratedByUserId: data.rated_by_user_id,
    ratedUserId: data.rated_user_id,
    score: data.score as Rating['score'],
    comment: data.comment,
    isProviderRating: data.is_provider_rating,
    createdAt: data.created_at,
  };
}
