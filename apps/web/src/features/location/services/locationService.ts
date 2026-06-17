/**
 * Location Service Wrapper - Gradual Migration to @onserve/api
 *
 * Phase 0a Migration: This module re-exports location services from @onserve/api
 * with a backward-compatible wrapper that injects the web app's supabase instance.
 *
 * Temporary re-export strategy:
 * - Web components continue importing from this path (no breaking changes)
 * - Functions are wrapped to inject the supabase client automatically
 * - Once all web components are updated to use @onserve/api directly, this file
 *   can be deleted entirely
 *
 * Timeline:
 * 1. This PR: Move service logic to @onserve/api, wrap here for compatibility
 * 2. Next PR: Update web components to import from @onserve/api
 * 3. Final PR: Delete this wrapper file
 *
 * TODO: Remove this wrapper once web app is fully migrated
 */

import { supabase } from '../../../lib/supabase';
import * as apiLocation from '@onserve/api';
import type { SavedLocation } from '@onserve/types';

// Wrapper exports: pass supabase instance automatically to maintain backward compatibility
export async function getSavedLocations(): Promise<SavedLocation[]> {
  return apiLocation.getSavedLocations(supabase);
}

export async function saveLocation(
  location: Omit<SavedLocation, 'id' | 'visitCount' | 'trustScore' | 'createdAt'>
): Promise<SavedLocation> {
  return apiLocation.saveLocation(supabase, location);
}

export async function updateLocation(
  id: string,
  updates: { label?: SavedLocation['label']; customName?: string | null }
): Promise<SavedLocation> {
  return apiLocation.updateLocation(supabase, id, updates);
}

export async function setDefaultLocation(id: string): Promise<void> {
  return apiLocation.setDefaultLocation(supabase, id);
}

export async function deleteLocation(id: string): Promise<void> {
  return apiLocation.deleteLocation(supabase, id);
}
