import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const { getServiceCategories, getServiceTypesByCategory } = await import('./serviceService');

const RAW_CATEGORY = {
  id: 'cat-1',
  name: 'Cleaning',
  slug: 'cleaning',
  icon_url: null,
  is_active: true,
  sort_order: 1,
};

const RAW_SERVICE_TYPE = {
  id: 'st-1',
  category_id: 'cat-1',
  name: 'Deep clean',
  description: 'Full deep clean',
  pricing_model: 'fixed',
  base_price: 450,
  hourly_rate: null,
  estimated_duration_mins: 180,
  required_skills: [],
  required_certifications: [],
  is_active: true,
};

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('getServiceCategories', () => {
  it('returns categories mapped from snake_case to camelCase', async () => {
    mock._setTable('service_categories', [RAW_CATEGORY]);
    const result = await getServiceCategories();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'cat-1',
      name: 'Cleaning',
      slug: 'cleaning',
      iconUrl: null,
      isActive: true,
      sortOrder: 1,
    });
  });

  it('returns an empty array when no categories exist', async () => {
    mock._setTable('service_categories', []);
    const result = await getServiceCategories();
    expect(result).toEqual([]);
  });

  it('queries only active categories ordered by sort_order', async () => {
    mock._setTable('service_categories', []);
    await getServiceCategories();

    const fromCall = mock.from.mock.calls[0][0];
    expect(fromCall).toBe('service_categories');

    const handler = mock.from('service_categories');
    expect(handler.eq).toHaveBeenCalledWith('is_active', true);
    expect(handler.order).toHaveBeenCalledWith('sort_order');
  });

  it('throws when Supabase returns an error', async () => {
    mock._setTable('service_categories', null, { message: 'DB error' });
    await expect(getServiceCategories()).rejects.toThrow('DB error');
  });
});

describe('getServiceTypesByCategory', () => {
  it('returns service types mapped from snake_case to camelCase', async () => {
    mock._setTable('service_types', [RAW_SERVICE_TYPE]);
    const result = await getServiceTypesByCategory('cat-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'st-1',
      categoryId: 'cat-1',
      name: 'Deep clean',
      description: 'Full deep clean',
      pricingModel: 'fixed',
      basePrice: 450,
      hourlyRate: null,
      estimatedDurationMins: 180,
      requiredSkills: [],
      requiredCertifications: [],
      isActive: true,
    });
  });

  it('filters by category_id and is_active', async () => {
    mock._setTable('service_types', []);
    await getServiceTypesByCategory('cat-1');

    const handler = mock.from('service_types');
    expect(handler.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    expect(handler.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('returns empty array for category with no service types', async () => {
    mock._setTable('service_types', []);
    const result = await getServiceTypesByCategory('cat-999');
    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    mock._setTable('service_types', null, { message: 'Query failed' });
    await expect(getServiceTypesByCategory('cat-1')).rejects.toThrow('Query failed');
  });
});
