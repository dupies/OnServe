import { supabase } from '../../../lib/supabase';
import type { SavedLocation } from '@onserve/types';

export async function getSavedLocations(): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .order('is_default', { ascending: false });
  if (error) throw new Error(error.message);
  return data as SavedLocation[];
}

export async function saveLocation(
  location: Omit<SavedLocation, 'id' | 'visitCount' | 'trustScore' | 'createdAt'>
): Promise<SavedLocation> {
  const { data, error } = await supabase
    .from('saved_locations')
    .insert(location)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SavedLocation;
}

export async function updateLocation(
  id: string,
  updates: { label?: 'Home' | 'Work' | 'Other'; customName?: string | null }
): Promise<SavedLocation> {
  const { data, error } = await supabase
    .from('saved_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SavedLocation;
}

export async function setDefaultLocation(id: string): Promise<void> {
  // Clear existing default (RLS limits this to current user's rows)
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
