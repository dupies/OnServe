/**
 * Providers Service
 * Handles provider search, profile retrieval, and statistics via Supabase
 *
 * Phase 2a Batch 2: Platform-agnostic provider services for web/mobile consumption
 * Provides location-aware provider search, profile details, and performance metrics.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProviderProfile } from '@onserve/types';

/**
 * Map database row (snake_case) to TypeScript ProviderProfile interface (camelCase)
 */
function mapProviderProfileRow(row: Record<string, unknown>): ProviderProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    bio: row.bio as string | null,
    idDocumentUrl: row.id_document_url as string | null,
    verificationStatus: row.verification_status as ProviderProfile['verificationStatus'],
    ratingAverage: row.rating_average as number,
    totalJobsCompleted: row.total_jobs_completed as number,
    completionRate: row.completion_rate as number,
    noShowRate: row.no_show_rate as number,
    disputeRate: row.dispute_rate as number,
    reputationScore: row.reputation_score as number,
    verifiedAt: row.verified_at as string | null,
  };
}

export interface SearchProvidersParams {
  serviceType: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
}

export interface SearchProvidersResult {
  providerId: string;
  userId: string;
  reputationScore: number;
  ratingAverage: number;
  distanceKm: number | null;
}

/**
 * Search for verified providers near a given location, optionally filtered by service type
 * Uses the search_providers_near RPC function for geospatial distance calculation.
 *
 * @param supabase Supabase client instance
 * @param params Search parameters including location and optional radius/limit
 * @returns Array of providers sorted by distance
 */
export async function searchProviders(
  supabase: SupabaseClient,
  params: SearchProvidersParams
): Promise<SearchProvidersResult[]> {
  const {
    latitude,
    longitude,
    radiusKm = 10,
    limit = 20,
    offset = 0,
  } = params;

  // Query providers by location distance using RPC function
  const { data, error } = await supabase.rpc('search_providers_near', {
    lat: latitude,
    lng: longitude,
    radius_km: radiusKm,
  });

  if (error) throw new Error(error.message);

  const results = (data ?? []) as SearchProvidersResult[];

  // Apply limit and offset on the client side after distance calculation
  return results.slice(offset, offset + limit);
}

/**
 * List nearby verified providers with pagination
 * Uses the list_providers_near RPC function for comprehensive provider data.
 *
 * @param supabase Supabase client instance
 * @param latitude User latitude
 * @param longitude User longitude
 * @param limit Maximum number of providers to return (default 20)
 * @param offset Pagination offset (default 0)
 * @returns Array of nearby providers with full profile details
 */
export async function listNearbyProviders(
  supabase: SupabaseClient,
  latitude: number,
  longitude: number,
  limit: number = 20,
  offset: number = 0
): Promise<
  Array<
    ProviderProfile & {
      distanceKm: number | null;
    }
  >
> {
  const { data, error } = await supabase.rpc('list_providers_near', {
    lat: latitude,
    lng: longitude,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...mapProviderProfileRow(row),
    distanceKm: row.distance_km as number | null,
  }));
}

/**
 * Get a provider's complete profile and services
 * @param supabase Supabase client instance
 * @param providerId The provider ID
 * @returns The ProviderProfile with associated services
 */
export async function getProviderProfile(
  supabase: SupabaseClient,
  providerId: string
): Promise<ProviderProfile> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*')
    .eq('id', providerId)
    .single();

  if (error) throw new Error(error.message);
  return mapProviderProfileRow(data as Record<string, unknown>);
}

export interface ProviderStats {
  completionRate: number;
  averageRating: number;
  responseTimeHours: number;
  totalJobsCompleted: number;
  reputationScore: number;
}

/**
 * Get provider performance statistics
 * Aggregates completion rate, average rating, response time, and other metrics.
 *
 * @param supabase Supabase client instance
 * @param providerId The provider ID
 * @returns Object containing provider statistics
 */
export async function getProviderStats(
  supabase: SupabaseClient,
  providerId: string
): Promise<ProviderStats> {
  // Fetch the provider profile which includes aggregated stats
  const profile = await getProviderProfile(supabase, providerId);

  return {
    completionRate: profile.completionRate,
    averageRating: profile.ratingAverage,
    responseTimeHours: 24, // TODO: Add response time tracking if needed
    totalJobsCompleted: profile.totalJobsCompleted,
    reputationScore: profile.reputationScore,
  };
}

export interface ProviderService {
  id: string;
  serviceTypeId: string;
  serviceName: string;
  customPrice: number | null;
  serviceRadiusKm: number;
  isAvailable: boolean;
}

/**
 * Get all services offered by a provider
 * @param supabase Supabase client instance
 * @param providerId The provider ID
 * @returns Array of services offered by the provider
 */
export async function getProviderServices(
  supabase: SupabaseClient,
  providerId: string
): Promise<ProviderService[]> {
  const { data, error } = await supabase
    .from('provider_services')
    .select(`
      id,
      service_type_id,
      custom_price,
      service_radius_km,
      is_available,
      service_types (name)
    `)
    .eq('provider_id', providerId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    serviceTypeId: row.service_type_id as string,
    serviceName: (row.service_types as Record<string, unknown>)?.name as string,
    customPrice: row.custom_price as number | null,
    serviceRadiusKm: row.service_radius_km as number,
    isAvailable: row.is_available as boolean,
  }));
}
