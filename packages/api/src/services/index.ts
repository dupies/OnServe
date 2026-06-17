/**
 * Services Service
 * Handles service category and type retrieval via Supabase
 *
 * Phase 2a Batch 2: Platform-agnostic service services for web/mobile consumption
 * Provides methods to list and search service types.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceCategory, ServiceType } from '@onserve/types';

/**
 * Map database row (snake_case) to TypeScript ServiceCategory interface (camelCase)
 */
function mapServiceCategoryRow(row: Record<string, unknown>): ServiceCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    iconUrl: row.icon_url as string | null,
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
  };
}

/**
 * Map database row (snake_case) to TypeScript ServiceType interface (camelCase)
 */
function mapServiceTypeRow(row: Record<string, unknown>): ServiceType {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    name: row.name as string,
    description: row.description as string,
    pricingModel: row.pricing_model as ServiceType['pricingModel'],
    basePrice: row.base_price as number | null,
    hourlyRate: row.hourly_rate as number | null,
    estimatedDurationMins: row.estimated_duration_mins as number | null,
    requiredSkills: row.required_skills as string[],
    requiredCertifications: row.required_certifications as string[],
    isActive: row.is_active as boolean,
  };
}

/**
 * Get all active service categories
 * Ordered by sort_order for display purposes.
 *
 * @param supabase Supabase client instance
 * @returns Array of ServiceCategory objects
 */
export async function getAllServiceCategories(
  supabase: SupabaseClient
): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapServiceCategoryRow);
}

/**
 * Get a single service category by ID
 * @param supabase Supabase client instance
 * @param categoryId The category ID
 * @returns The ServiceCategory object
 */
export async function getServiceCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<ServiceCategory> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) throw new Error(error.message);
  return mapServiceCategoryRow(data as Record<string, unknown>);
}

/**
 * Get all active service types
 * Ordered by name for display purposes.
 *
 * @param supabase Supabase client instance
 * @returns Array of ServiceType objects
 */
export async function getAllServiceTypes(
  supabase: SupabaseClient
): Promise<ServiceType[]> {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapServiceTypeRow);
}

/**
 * Get service types for a specific category
 * @param supabase Supabase client instance
 * @param categoryId The category ID
 * @returns Array of ServiceType objects in that category
 */
export async function getServiceTypesByCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<ServiceType[]> {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapServiceTypeRow);
}

/**
 * Get a single service type by ID
 * @param supabase Supabase client instance
 * @param serviceTypeId The service type ID
 * @returns The ServiceType object
 */
export async function getServiceType(
  supabase: SupabaseClient,
  serviceTypeId: string
): Promise<ServiceType> {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('id', serviceTypeId)
    .single();

  if (error) throw new Error(error.message);
  return mapServiceTypeRow(data as Record<string, unknown>);
}

/**
 * Search for service types by name or description
 * Case-insensitive partial match.
 *
 * @param supabase Supabase client instance
 * @param query Search query string
 * @returns Array of matching ServiceType objects
 */
export async function searchServiceTypes(
  supabase: SupabaseClient,
  query: string
): Promise<ServiceType[]> {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapServiceTypeRow);
}

/**
 * Get service categories with their associated service types
 * @param supabase Supabase client instance
 * @returns Array of categories with nested service types
 */
export async function getCategoriesWithServices(
  supabase: SupabaseClient
): Promise<
  Array<
    ServiceCategory & {
      services: ServiceType[];
    }
  >
> {
  const { data, error } = await supabase
    .from('service_categories')
    .select(`
      *,
      service_types (
        id,
        name,
        description,
        pricing_model,
        base_price,
        hourly_rate,
        estimated_duration_mins,
        required_skills,
        required_certifications,
        is_active
      )
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...mapServiceCategoryRow(row),
    services: (row.service_types as Record<string, unknown>[]).map(mapServiceTypeRow),
  }));
}
