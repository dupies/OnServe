import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const { searchProviders, getProviderProfile } = await import('./providerService');

const PROVIDER_PROFILE = {
  id: 'pp-1',
  user_id: 'user-1',
  bio: 'Experienced cleaner',
  id_document_url: null,
  verification_status: 'verified',
  rating_average: 4.9,
  total_jobs_completed: 234,
  completion_rate: 0.98,
  no_show_rate: 0.01,
  dispute_rate: 0.005,
  reputation_score: 92,
  verified_at: '2026-01-15T00:00:00Z',
};

const SEARCH_RESULT = {
  provider_id: 'pp-1',
  user_id: 'user-1',
  reputation_score: 92,
  rating_average: 4.9,
  distance_km: 1.2,
};

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('searchProviders', () => {
  it('calls the search_providers_near RPC with correct parameters', async () => {
    mock.rpc.mockResolvedValueOnce({ data: [SEARCH_RESULT], error: null });

    await searchProviders(-26.1076, 28.0567, 10);

    expect(mock.rpc).toHaveBeenCalledWith('search_providers_near', {
      lat: -26.1076,
      lng: 28.0567,
      radius_km: 10,
    });
  });

  it('uses 10km as the default radius', async () => {
    mock.rpc.mockResolvedValueOnce({ data: [], error: null });

    await searchProviders(-26.1076, 28.0567);

    expect(mock.rpc).toHaveBeenCalledWith('search_providers_near', {
      lat: -26.1076,
      lng: 28.0567,
      radius_km: 10,
    });
  });

  it('returns the RPC results', async () => {
    mock.rpc.mockResolvedValueOnce({ data: [SEARCH_RESULT], error: null });

    const result = await searchProviders(-26.1076, 28.0567);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no providers are nearby', async () => {
    mock.rpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await searchProviders(-33.9249, 18.4241); // Cape Town
    expect(result).toEqual([]);
  });

  it('throws when the RPC returns an error', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'PostGIS error' } });

    await expect(searchProviders(-26.1076, 28.0567)).rejects.toThrow('PostGIS error');
  });
});

describe('getProviderProfile', () => {
  it('fetches the provider profile for the given userId', async () => {
    mock._setTable('provider_profiles', PROVIDER_PROFILE);

    await getProviderProfile('user-1');

    expect(mock.from).toHaveBeenCalledWith('provider_profiles');
    const handler = mock.from('provider_profiles');
    expect(handler.select).toHaveBeenCalledWith('*, users(*), provider_services(*, service_types(*))');
    expect(handler.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(handler.single).toHaveBeenCalled();
  });

  it('returns the profile data', async () => {
    mock._setTable('provider_profiles', PROVIDER_PROFILE);

    const result = await getProviderProfile('user-1');
    expect(result).toEqual(PROVIDER_PROFILE);
  });

  it('throws when provider is not found', async () => {
    mock._setTable('provider_profiles', null, { message: 'No rows returned' });

    await expect(getProviderProfile('user-unknown')).rejects.toThrow('No rows returned');
  });
});
