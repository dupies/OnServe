import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const { getSavedLocations, saveLocation, deleteLocation } = await import('./locationService');

// Raw DB row — snake_case as Supabase returns it
const DB_ROW = {
  id: 'loc-1',
  user_id: 'user-1',
  label: 'Home' as const,
  custom_name: null,
  formatted_address: '14 Maple Crescent, Sandton',
  latitude: -26.1076,
  longitude: 28.0567,
  visit_count: 12,
  trust_score: 84,
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
};

// Expected camelCase shape after service mapping
const MAPPED = {
  id: 'loc-1',
  userId: 'user-1',
  label: 'Home' as const,
  customName: null,
  formattedAddress: '14 Maple Crescent, Sandton',
  latitude: -26.1076,
  longitude: 28.0567,
  visitCount: 12,
  trustScore: 84,
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('getSavedLocations', () => {
  it('returns saved locations mapped to camelCase', async () => {
    mock._setTable('saved_locations', [DB_ROW]);
    const result = await getSavedLocations();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(MAPPED);
  });

  it('orders by is_default descending', async () => {
    mock._setTable('saved_locations', []);
    await getSavedLocations();

    const handler = mock.from('saved_locations');
    expect(handler.order).toHaveBeenCalledWith('is_default', { ascending: false });
  });

  it('returns empty array when no locations exist', async () => {
    mock._setTable('saved_locations', []);
    const result = await getSavedLocations();
    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    mock._setTable('saved_locations', null, { message: 'RLS violation' });
    await expect(getSavedLocations()).rejects.toThrow('RLS violation');
  });
});

describe('saveLocation', () => {
  it('inserts with snake_case keys and returns mapped location', async () => {
    mock._setTable('saved_locations', DB_ROW);
    const input = {
      userId: 'user-1',
      label: 'Home' as const,
      customName: null,
      formattedAddress: '14 Maple Crescent, Sandton',
      latitude: -26.1076,
      longitude: 28.0567,
      isDefault: true,
    };

    const result = await saveLocation(input);
    expect(result).toEqual(MAPPED);

    // Service must translate camelCase → snake_case before inserting
    const handler = mock.from('saved_locations');
    expect(handler.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      label: 'Home',
      custom_name: null,
      formatted_address: '14 Maple Crescent, Sandton',
      latitude: -26.1076,
      longitude: 28.0567,
      is_default: true,
    });
    expect(handler.select).toHaveBeenCalled();
    expect(handler.single).toHaveBeenCalled();
  });

  it('throws when insert fails', async () => {
    mock._setTable('saved_locations', null, { message: 'Max locations reached' });
    await expect(
      saveLocation({
        userId: 'user-1',
        label: 'Work',
        customName: null,
        formattedAddress: 'Rosebank Mall',
        latitude: -26.145,
        longitude: 28.043,
        isDefault: false,
      }),
    ).rejects.toThrow('Max locations reached');
  });
});

describe('deleteLocation', () => {
  it('deletes the location by id', async () => {
    mock._setTable('saved_locations', null);
    await deleteLocation('loc-1');

    const handler = mock.from('saved_locations');
    expect(handler.delete).toHaveBeenCalled();
    expect(handler.eq).toHaveBeenCalledWith('id', 'loc-1');
  });

  it('throws when delete fails', async () => {
    mock._setTable('saved_locations', null, { message: 'Not found' });
    await expect(deleteLocation('loc-999')).rejects.toThrow('Not found');
  });
});
