import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, makeQueryMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const {
  createQuoteRequest,
  getCustomerQuoteRequests,
  getQuoteRequestById,
  getProviderQuoteRequests,
  submitQuote,
  acceptQuote,
} = await import('./quoteService');

const RAW_QUOTE_REQUEST = {
  id: 'qr-1',
  booking_id: null,
  customer_id: 'user-1',
  service_type_id: 'st-1',
  location_id: 'loc-1',
  problem_description: 'Need a plumber urgently',
  uploaded_image_urls: [],
  status: 'open',
  expires_at: '2026-05-10T10:00:00Z',
  created_at: '2026-05-01T10:00:00Z',
};

const MAPPED_QUOTE_REQUEST = {
  id: 'qr-1',
  bookingId: null,
  customerId: 'user-1',
  serviceTypeId: 'st-1',
  locationId: 'loc-1',
  problemDescription: 'Need a plumber urgently',
  uploadedImageUrls: [],
  status: 'open',
  expiresAt: '2026-05-10T10:00:00Z',
  createdAt: '2026-05-01T10:00:00Z',
};

const RAW_QUOTE = {
  id: 'q-1',
  quote_request_id: 'qr-1',
  provider_id: 'pp-1',
  quoted_price: 850,
  estimated_duration_mins: 60,
  notes: 'Includes parts',
  status: 'submitted',
  submitted_at: '2026-05-01T12:00:00Z',
  accepted_at: null,
};

const MAPPED_QUOTE = {
  id: 'q-1',
  quoteRequestId: 'qr-1',
  providerId: 'pp-1',
  quotedPrice: 850,
  estimatedDurationMins: 60,
  notes: 'Includes parts',
  status: 'submitted',
  submittedAt: '2026-05-01T12:00:00Z',
  acceptedAt: null,
};

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('createQuoteRequest', () => {
  it('inserts with status open and calculates expiry from expiresInHours', async () => {
    let insertArgs: unknown;
    const handler = makeQueryMock(RAW_QUOTE_REQUEST);
    handler.insert = vi.fn((args: unknown) => {
      insertArgs = args;
      return handler;
    });
    mock.from = vi.fn(() => handler);

    const before = Date.now();
    await createQuoteRequest({
      serviceTypeId: 'st-1',
      locationId: 'loc-1',
      problemDescription: 'Need a plumber',
      expiresInHours: '24',
    });
    const after = Date.now();

    expect(insertArgs).toMatchObject({ status: 'open', service_type_id: 'st-1' });
    const expires = new Date((insertArgs as Record<string, string>)['expires_at']).getTime();
    expect(expires).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000 - 100);
    expect(expires).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 100);
  });

  it('throws on database error', async () => {
    mock._setTable('quote_requests', null, { message: 'Insert failed' });
    await expect(
      createQuoteRequest({
        serviceTypeId: 'st-1',
        locationId: 'loc-1',
        problemDescription: 'test',
        expiresInHours: '24',
      }),
    ).rejects.toThrow('Insert failed');
  });
});

describe('getCustomerQuoteRequests', () => {
  it('returns mapped quote requests ordered by created_at desc', async () => {
    mock._setTable('quote_requests', [RAW_QUOTE_REQUEST]);

    const result = await getCustomerQuoteRequests();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(MAPPED_QUOTE_REQUEST);
  });

  it('orders by created_at descending', async () => {
    mock._setTable('quote_requests', []);

    await getCustomerQuoteRequests();

    const handler = mock.from('quote_requests');
    expect(handler.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when no quote requests exist', async () => {
    mock._setTable('quote_requests', []);
    const result = await getCustomerQuoteRequests();
    expect(result).toEqual([]);
  });

  it('throws on database error', async () => {
    mock._setTable('quote_requests', null, { message: 'Query failed' });
    await expect(getCustomerQuoteRequests()).rejects.toThrow('Query failed');
  });
});

describe('getQuoteRequestById', () => {
  it('returns mapped quote request with embedded quotes', async () => {
    mock._setTable('quote_requests', { ...RAW_QUOTE_REQUEST, quotes: [RAW_QUOTE] });

    const result = await getQuoteRequestById('qr-1');

    expect(result).toMatchObject(MAPPED_QUOTE_REQUEST);
    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]).toMatchObject(MAPPED_QUOTE);
  });

  it('returns empty quotes array when no quotes submitted', async () => {
    mock._setTable('quote_requests', { ...RAW_QUOTE_REQUEST, quotes: [] });

    const result = await getQuoteRequestById('qr-1');

    expect(result.quotes).toEqual([]);
  });

  it('queries by the correct id', async () => {
    mock._setTable('quote_requests', { ...RAW_QUOTE_REQUEST, quotes: [] });

    await getQuoteRequestById('qr-99');

    const handler = mock.from('quote_requests');
    expect(handler.eq).toHaveBeenCalledWith('id', 'qr-99');
  });

  it('throws on database error', async () => {
    mock._setTable('quote_requests', null, { message: 'Not found' });
    await expect(getQuoteRequestById('qr-999')).rejects.toThrow('Not found');
  });
});

describe('getProviderQuoteRequests', () => {
  it('returns only open quote requests', async () => {
    mock._setTable('quote_requests', [RAW_QUOTE_REQUEST]);

    const result = await getProviderQuoteRequests();

    const handler = mock.from('quote_requests');
    expect(handler.eq).toHaveBeenCalledWith('status', 'open');
    expect(result).toHaveLength(1);
  });

  it('throws on database error', async () => {
    mock._setTable('quote_requests', null, { message: 'Query failed' });
    await expect(getProviderQuoteRequests()).rejects.toThrow('Query failed');
  });
});

describe('submitQuote', () => {
  it('returns the submitted quote', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('provider_profiles', { id: 'pp-1' });
    mock._setTable('quotes', RAW_QUOTE);

    const result = await submitQuote('qr-1', 850, 60, 'Includes parts');

    expect(result).toMatchObject(MAPPED_QUOTE);
  });

  it('inserts quote with provider_id from profile', async () => {
    let insertArgs: unknown;
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('provider_profiles', { id: 'pp-1' });
    const handler = makeQueryMock(RAW_QUOTE);
    handler.insert = vi.fn((args: unknown) => {
      insertArgs = args;
      return handler;
    });
    let callCount = 0;
    const originalFrom = mock.from.bind(mock);
    mock.from = vi.fn((_table: string) => {
      callCount++;
      if (callCount === 1) return originalFrom('provider_profiles');
      return handler;
    });

    await submitQuote('qr-1', 850, 60, null);

    expect(insertArgs).toMatchObject({
      quote_request_id: 'qr-1',
      provider_id: 'pp-1',
      quoted_price: 850,
      status: 'submitted',
    });
  });

  it('throws when not authenticated', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(submitQuote('qr-1', 850, 60, null)).rejects.toThrow('Not authenticated');
  });

  it('throws when no provider profile exists', async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mock._setTable('provider_profiles', null);
    await expect(submitQuote('qr-1', 850, 60, null)).rejects.toThrow('No provider profile');
  });
});

describe('acceptQuote', () => {
  it('updates quote to accepted status with accepted_at timestamp', async () => {
    mock._setTable('quotes', null);

    const before = new Date();
    await acceptQuote('q-1');
    const after = new Date();

    const handler = mock.from('quotes');
    const updateCall = handler.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall['status']).toBe('accepted');
    const acceptedAt = new Date(updateCall['accepted_at'] as string);
    expect(acceptedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(acceptedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('filters by the correct quote id', async () => {
    mock._setTable('quotes', null);
    await acceptQuote('q-42');
    const handler = mock.from('quotes');
    expect(handler.eq).toHaveBeenCalledWith('id', 'q-42');
  });

  it('throws on database error', async () => {
    mock._setTable('quotes', null, { message: 'Update failed' });
    await expect(acceptQuote('q-1')).rejects.toThrow('Update failed');
  });
});
