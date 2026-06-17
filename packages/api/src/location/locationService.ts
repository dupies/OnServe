/**
 * Location Service
 * Handles saved location CRUD operations via Supabase
 *
 * Phase 0a Migration: Extracted from apps/web/src/features/location/services/locationService.ts
 * This service provides database-agnostic location management and is shared between
 * web and mobile apps. It requires a SupabaseClient instance to be provided at initialization.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
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

export async function getSavedLocations(supabase: SupabaseClient): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .order('is_default', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function saveLocation(
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
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

export async function setDefaultLocation(supabase: SupabaseClient, id: string): Promise<void> {
  // Unset all defaults for current user (RLS limits to own rows)
  await supabase.from('saved_locations').update({ is_default: false }).neq('id', id);
  const { error } = await supabase
    .from('saved_locations')
    .update({ is_default: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteLocation(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('saved_locations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Add a new location for the current user
 * This is a convenience wrapper around saveLocation with minimal required fields.
 * @param supabase Supabase client instance
 * @param userId The user ID
 * @param address Address details
 * @returns The created SavedLocation
 */
export async function addLocation(
  supabase: SupabaseClient,
  userId: string,
  address: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  }
): Promise<SavedLocation> {
  const formattedAddress = `${address.street}, ${address.city}, ${address.postalCode}`;

  return saveLocation(supabase, {
    userId,
    label: 'Other', // Default label for new locations
    customName: address.name,
    formattedAddress,
    latitude: address.latitude,
    longitude: address.longitude,
    isDefault: address.isDefault ?? false,
  });
}
