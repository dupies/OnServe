/**
 * Ratings Service
 * Handles rating retrieval and aggregation via Supabase
 *
 * Phase 2a Batch 2: Platform-agnostic rating services for web/mobile consumption
 * Provides methods to fetch and calculate provider ratings.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Rating } from '@onserve/types';

/**
 * Map database row (snake_case) to TypeScript Rating interface (camelCase)
 */
function mapRatingRow(row: Record<string, unknown>): Rating {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    ratedByUserId: row.rated_by_user_id as string,
    ratedUserId: row.rated_user_id as string,
    score: row.score as 1 | 2 | 3 | 4 | 5,
    comment: row.comment as string | null,
    isProviderRating: row.is_provider_rating as boolean,
    createdAt: row.created_at as string,
  };
}

/**
 * Get all ratings for a provider
 * Ordered by most recent first.
 *
 * @param supabase Supabase client instance
 * @param providerId The provider ID (user_id in provider_profiles)
 * @param limit Maximum number of ratings to return (default 5)
 * @returns Array of Rating objects
 */
export async function getProviderRatings(
  supabase: SupabaseClient,
  providerId: string,
  limit: number = 5
): Promise<Rating[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('rated_user_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRatingRow);
}

/**
 * Get all customer ratings given BY a provider (customer feedback)
 * Ordered by most recent first.
 *
 * @param supabase Supabase client instance
 * @param providerId The provider ID
 * @param limit Maximum number of ratings to return (default 10)
 * @returns Array of Rating objects given by this provider
 */
export async function getRatingsGivenByProvider(
  supabase: SupabaseClient,
  providerId: string,
  limit: number = 10
): Promise<Rating[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('rated_by_user_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRatingRow);
}

/**
 * Calculate the average rating for a provider
 * Returns 0 if provider has no ratings.
 *
 * @param supabase Supabase client instance
 * @param providerId The provider ID
 * @returns Average rating rounded to 1 decimal place
 */
export async function getAverageRating(
  supabase: SupabaseClient,
  providerId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('ratings')
    .select('score')
    .eq('rated_user_id', providerId);

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) return 0;

  const totalScore = data.reduce((sum: number, r: Record<string, unknown>) => sum + (r.score as number), 0);
  const average = totalScore / data.length;

  // Round to 1 decimal place
  return Math.round(average * 10) / 10;
}

export interface RatingStats {
  averageScore: number;
  totalRatings: number;
  ratingDistribution: {
    fiveStars: number;
    fourStars: number;
    threeStars: number;
    twoStars: number;
    oneStar: number;
  };
}

/**
 * Get comprehensive rating statistics for a provider
 * Includes average, count, and distribution by score.
 *
 * @param supabase Supabase client instance
 * @param providerId The provider ID
 * @returns Object containing rating statistics
 */
export async function getRatingStats(
  supabase: SupabaseClient,
  providerId: string
): Promise<RatingStats> {
  const { data, error } = await supabase
    .from('ratings')
    .select('score')
    .eq('rated_user_id', providerId);

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    return {
      averageScore: 0,
      totalRatings: 0,
      ratingDistribution: {
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      },
    };
  }

  const scores = data.map((r: Record<string, unknown>) => r.score as number);
  const totalScore = scores.reduce((sum: number, score: number) => sum + score, 0);
  const average = Math.round((totalScore / scores.length) * 10) / 10;

  const distribution = {
    fiveStars: scores.filter((s: number) => s === 5).length,
    fourStars: scores.filter((s: number) => s === 4).length,
    threeStars: scores.filter((s: number) => s === 3).length,
    twoStars: scores.filter((s: number) => s === 2).length,
    oneStar: scores.filter((s: number) => s === 1).length,
  };

  return {
    averageScore: average,
    totalRatings: scores.length,
    ratingDistribution: distribution,
  };
}

/**
 * Create a new rating for a user (provider or customer)
 * @param supabase Supabase client instance
 * @param bookingId The booking ID associated with the rating
 * @param ratedByUserId The ID of the user giving the rating
 * @param ratedUserId The ID of the user being rated
 * @param score Rating score 1-5
 * @param comment Optional comment text
 * @param isProviderRating Whether this is a provider rating a customer
 * @returns The created Rating object
 */
export async function createRating(
  supabase: SupabaseClient,
  bookingId: string,
  ratedByUserId: string,
  ratedUserId: string,
  score: 1 | 2 | 3 | 4 | 5,
  comment: string | null = null,
  isProviderRating: boolean = false
): Promise<Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .insert({
      booking_id: bookingId,
      rated_by_user_id: ratedByUserId,
      rated_user_id: ratedUserId,
      score,
      comment,
      is_provider_rating: isProviderRating,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRatingRow(data as Record<string, unknown>);
}
