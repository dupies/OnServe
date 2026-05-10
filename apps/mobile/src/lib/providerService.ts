import { supabase } from '@/lib/supabase';
import type { ProviderProfile } from '@onserve/types';

export type ProviderWithDistance = ProviderProfile & { distance_km: number | null };

function mapProviderProfile(r: Record<string, unknown>): ProviderProfile {
  return {
    id: r['id'] as string,
    userId: r['user_id'] as string,
    bio: r['bio'] as string | null,
    idDocumentUrl: r['id_document_url'] as string | null,
    verificationStatus: r['verification_status'] as ProviderProfile['verificationStatus'],
    ratingAverage: Number(r['rating_average']),
    totalJobsCompleted: Number(r['total_jobs_completed']),
    completionRate: Number(r['completion_rate']),
    noShowRate: Number(r['no_show_rate']),
    disputeRate: Number(r['dispute_rate']),
    reputationScore: Number(r['reputation_score']),
    verifiedAt: r['verified_at'] as string | null,
  };
}

export async function listAllProviders(
  latitude: number,
  longitude: number,
  limit = 20,
  offset = 0,
): Promise<ProviderWithDistance[]> {
  const { data, error } = await supabase.rpc('list_providers_near', {
    lat: latitude,
    lng: longitude,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...mapProviderProfile(r),
    distance_km: r['distance_km'] != null ? Number(r['distance_km']) : null,
  }));
}

export async function getProviderProfile(userId: string): Promise<ProviderProfile> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw new Error(error.message);
  return mapProviderProfile(data as Record<string, unknown>);
}
