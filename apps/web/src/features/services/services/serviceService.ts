import { supabase } from '@/lib/supabase';
import type { ServiceCategory, ServiceType } from '@onserve/types';

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    iconUrl: r.icon_url,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }));
}

export async function getAllServiceTypes(): Promise<ServiceType[]> {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    pricingModel: r.pricing_model,
    basePrice: r.base_price,
    hourlyRate: r.hourly_rate,
    estimatedDurationMins: r.estimated_duration_mins,
    requiredSkills: r.required_skills,
    requiredCertifications: r.required_certifications,
    isActive: r.is_active,
  }));
}

export async function getServiceTypesByCategory(categoryId: string): Promise<ServiceType[]> {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    pricingModel: r.pricing_model,
    basePrice: r.base_price,
    hourlyRate: r.hourly_rate,
    estimatedDurationMins: r.estimated_duration_mins,
    requiredSkills: r.required_skills,
    requiredCertifications: r.required_certifications,
    isActive: r.is_active,
  }));
}
