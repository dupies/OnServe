import { supabase } from '@/lib/supabase';
import type { SavedLocation } from '@onserve/types';

function mapRow(row: Record<string, unknown>): SavedLocation {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    label: row['label'] as SavedLocation['label'],
    customName: row['custom_name'] as string | null,
    formattedAddress: row['formatted_address'] as string,
    latitude: row['latitude'] as number,
    longitude: row['longitude'] as number,
    visitCount: row['visit_count'] as number,
    trustScore: row['trust_score'] as number,
    isDefault: row['is_default'] as boolean,
    createdAt: row['created_at'] as string,
  };
}

export async function getSavedLocations(): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .order('is_default', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}
