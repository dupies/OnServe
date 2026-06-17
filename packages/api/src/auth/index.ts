/**
 * Auth Service
 * Handles user authentication and profile management via Supabase
 *
 * Phase 2a Batch 2: Platform-agnostic auth services for web/mobile consumption
 * Provides role assignment and profile retrieval operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@onserve/types';

/**
 * Map database row (snake_case) to TypeScript User interface (camelCase)
 */
function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    fullName: row.full_name as string,
    avatarUrl: row.avatar_url as string | null,
    role: row.role as User['role'],
    isVerified: row.is_verified as boolean,
    accountStatus: row.account_status as User['accountStatus'],
    suspensionReason: row.suspension_reason as string | null,
    suspendedAt: row.suspended_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Set the role of a user (customer or provider)
 * @param supabase Supabase client instance
 * @param userId The user ID
 * @param role The role to assign ('customer' | 'provider')
 * @returns Promise indicating success
 */
export async function setUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: 'customer' | 'provider'
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Get the complete profile for a user
 * @param supabase Supabase client instance
 * @param userId The user ID
 * @returns The User profile object
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return mapUserRow(data as Record<string, unknown>);
}

/**
 * Update the user profile
 * @param supabase Supabase client instance
 * @param userId The user ID
 * @param updates Partial user fields to update
 * @returns The updated User profile
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<{
    fullName: string;
    phone: string;
    avatarUrl: string;
  }>
): Promise<User> {
  const patch: Record<string, unknown> = {};
  if (updates.fullName !== undefined) patch.full_name = updates.fullName;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.avatarUrl !== undefined) patch.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapUserRow(data as Record<string, unknown>);
}
