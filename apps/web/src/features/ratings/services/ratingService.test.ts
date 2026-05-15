import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const { createRating } = await import('./ratingService');

const RAW_RATING = {
  id: 'r-1',
  booking_id: 'b-1',
  rated_by_user_id: 'user-1',
  rated_user_id: 'provider-user-1',
  score: 5,
  comment: 'Excellent service',
  is_provider_rating: true,
  created_at: '2026-05-01T10:00:00Z',
};

const MAPPED_RATING = {
  id: 'r-1',
  bookingId: 'b-1',
  ratedByUserId: 'user-1',
  ratedUserId: 'provider-user-1',
  score: 5 as const,
  comment: 'Excellent service',
  isProviderRating: true,
  createdAt: '2026-05-01T10:00:00Z',
};

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('createRating', () => {
  it('returns the created rating mapped to camelCase', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('bookings', { customer_id: 'user-1', provider_id: 'provider-user-1' });
    mock._setTable('ratings', RAW_RATING);

    const result = await createRating('b-1', { score: 5, comment: 'Excellent service' });

    expect(result).toMatchObject(MAPPED_RATING);
  });

  it('inserts with is_provider_rating true and correct rated_user_id', async () => {
    let insertArgs: unknown;
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('bookings', { customer_id: 'user-1', provider_id: 'provider-user-1' });

    const { makeQueryMock } = await import('@/test/mockSupabase');
    const handler = makeQueryMock(RAW_RATING);
    handler.insert = vi.fn((args: unknown) => {
      insertArgs = args;
      return handler;
    });
    let callCount = 0;
    const originalFrom = mock.from.bind(mock);
    mock.from = vi.fn((_table: string) => {
      callCount++;
      if (callCount === 1) return originalFrom('bookings');
      return handler;
    });

    await createRating('b-1', { score: 5, comment: undefined });

    expect(insertArgs).toMatchObject({
      booking_id: 'b-1',
      rated_by_user_id: 'user-1',
      rated_user_id: 'provider-user-1',
      score: 5,
      is_provider_rating: true,
    });
  });

  it('throws when not authenticated', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(createRating('b-1', { score: 4, comment: undefined })).rejects.toThrow(
      'Not authenticated',
    );
  });

  it('throws when booking is not found', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('bookings', null, { message: 'Booking not found' });

    await expect(createRating('b-999', { score: 4, comment: undefined })).rejects.toThrow(
      'Booking not found',
    );
  });

  it('throws when booking has no provider', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('bookings', { customer_id: 'user-1', provider_id: null });

    await expect(createRating('b-1', { score: 4, comment: undefined })).rejects.toThrow(
      'No provider on booking',
    );
  });

  it('throws when rating insert fails', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('bookings', { customer_id: 'user-1', provider_id: 'provider-user-1' });
    mock._setTable('ratings', null, { message: 'Insert failed' });

    await expect(createRating('b-1', { score: 5, comment: undefined })).rejects.toThrow(
      'Insert failed',
    );
  });
});
