import { supabase } from '../../../lib/supabase';
import type { SavedLocation } from '@onserve/types';

// DB returns snake_case; map to the camelCase TypeScript type
function mapRow(row: Record<string, unknown>): SavedLocation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    label: row.label as SavedLocation['label'],
    customName: row.custom_name as string | null,
    formattedAddress: row.formatted_address as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    visitCount: row.visit_count as number,
    trustScore: row.trust_score as number,
    isDefault: row.is_default as boolean,
    createdAt: row.created_at as string,
  };
}

export async function getSavedLocations(): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .order('is_default', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function saveLocation(
  location: Omit<SavedLocation, 'id' | 'visitCount' | 'trustScore' | 'createdAt'>
): Promise<SavedLocation> {
  const { data, error } = await supabase
    .from('saved_locations')
    .insert({
      user_id: location.userId,
      label: location.label,
      custom_name: location.customName,
      formatted_address: location.formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      is_default: location.isDefault,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function updateLocation(
  id: string,
  updates: { label?: SavedLocation['label']; customName?: string | null }
): Promise<SavedLocation> {
  const patch: Record<string, unknown> = {};
  if (updates.label !== undefined) patch.label = updates.label;
  if (updates.customName !== undefined) patch.custom_name = updates.customName;

  const { data, error } = await supabase
    .from('saved_locations')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function setDefaultLocation(id: string): Promise<void> {
  // Unset all defaults for current user (RLS limits to own rows)
  await supabase.from('saved_locations').update({ is_default: false }).neq('id', id);
  const { error } = await supabase
    .from('saved_locations')
    .update({ is_default: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('saved_locations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
