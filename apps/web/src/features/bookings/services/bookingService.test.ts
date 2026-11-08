import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, makeQueryMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const {
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  acceptBooking,
  startService,
  checkOut,
} = await import('./bookingService');

const RAW_BOOKING = {
  id: 'b-1',
  customer_id: 'user-1',
  provider_id: 'pp-1',
  service_type_id: 'st-1',
  location_id: 'loc-1',
  booking_type: 'instant',
  status: 'pending',
  total_amount: 472.5,
  deposit_amount: null,
  customer_notes: null,
  scheduled_at: '2026-05-02T10:00:00Z',
  provider_checked_in_at: null,
  provider_checked_out_at: null,
  completed_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  created_at: '2026-04-30T08:00:00Z',
};

const MAPPED_BOOKING = {
  id: 'b-1',
  customerId: 'user-1',
  providerId: 'pp-1',
  serviceTypeId: 'st-1',
  locationId: 'loc-1',
  bookingType: 'instant',
  status: 'pending',
  totalAmount: 472.5,
  depositAmount: null,
  customerNotes: null,
  scheduledAt: '2026-05-02T10:00:00Z',
  providerCheckedInAt: null,
  providerCheckedOutAt: null,
  completedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-04-30T08:00:00Z',
};

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('getCustomerBookings', () => {
  it('returns bookings mapped from snake_case to camelCase', async () => {
    mock._setTable('bookings', [RAW_BOOKING]);

    const result = await getCustomerBookings();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(MAPPED_BOOKING);
  });

  it('includes joined relations in the select', async () => {
    mock._setTable('bookings', []);

    await getCustomerBookings();

    const handler = mock.from('bookings');
    expect(handler.select).toHaveBeenCalledWith(
      '*, service_types(*), saved_locations(*), provider:provider_profiles(*)',
    );
    expect(handler.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when no bookings exist', async () => {
    mock._setTable('bookings', []);
    const result = await getCustomerBookings();
    expect(result).toEqual([]);
  });

  it('throws on database error', async () => {
    mock._setTable('bookings', null, { message: 'Connection timeout' });
    await expect(getCustomerBookings()).rejects.toThrow('Connection timeout');
  });
});

describe('getProviderBookings', () => {
  it('returns empty array when provider profile does not exist', async () => {
    // profile query returns null (no profile yet)
    mock._setTable('provider_profiles', null);
    const result = await getProviderBookings();
    expect(result).toEqual([]);
  });

  it('filters by provider_id, active statuses and paid bookings only', async () => {
    // First call: provider_profiles, second call: bookings
    let callCount = 0;
    let bookingsHandler: ReturnType<typeof makeQueryMock> | undefined;
    mock.from = vi.fn((table: string) => {
      callCount++;
      if (callCount === 1) {
        expect(table).toBe('provider_profiles');
        return makeQueryMock({ id: 'pp-1' });
      }
      expect(table).toBe('bookings');
      bookingsHandler = makeQueryMock([]);
      return bookingsHandler;
    });

    await getProviderBookings();

    expect(callCount).toBe(2);
    // Only fully paid bookings reach the provider.
    expect(bookingsHandler!.eq).toHaveBeenCalledWith('payments.status', 'escrowed');
    expect(bookingsHandler!.eq).toHaveBeenCalledWith('provider_id', 'pp-1');
  });

  it('throws on database error for bookings query', async () => {
    let callCount = 0;
    mock.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return makeQueryMock({ id: 'pp-1' });
      return makeQueryMock(null, { message: 'Booking query failed' });
    });

    await expect(getProviderBookings()).rejects.toThrow('Booking query failed');
  });
});

describe('getBookingById', () => {
  it('returns a single booking by id', async () => {
    mock._setTable('bookings', RAW_BOOKING);

    const result = await getBookingById('b-1');
    expect(result).toMatchObject(MAPPED_BOOKING);
  });

  it('queries by the correct id', async () => {
    mock._setTable('bookings', RAW_BOOKING);

    await getBookingById('b-1');

    const handler = mock.from('bookings');
    expect(handler.eq).toHaveBeenCalledWith('id', 'b-1');
    expect(handler.single).toHaveBeenCalled();
  });

  it('throws when booking is not found', async () => {
    mock._setTable('bookings', null, { message: 'No rows returned' });
    await expect(getBookingById('b-999')).rejects.toThrow('No rows returned');
  });
});

describe('createBooking', () => {
  // Pricing, status and booking_type are set by the price_booking_insert
  // trigger in the database; the client only sends what the customer chose.
  it('returns the server-priced booking (price + 5% fee)', async () => {
    mock.from = vi.fn(() =>
      makeQueryMock({ ...RAW_BOOKING, total_amount: 472.5, service_price: 450, platform_fee: 22.5 }),
    );

    const result = await createBooking({
      providerId: '00000000-0000-0000-0000-0000000000aa',
      serviceTypeId: 'st-1',
      locationId: 'loc-1',
      scheduledAt: '2026-05-02T10:00:00Z',
    });

    expect(result.totalAmount).toBe(472.5);
    expect(result.servicePrice).toBe(450);
    expect(result.platformFee).toBe(22.5);
  });

  it('sends the chosen provider and never a client-side status or price', async () => {
    let insertArgs: Record<string, unknown> = {};
    mock.from = vi.fn(() => {
      const handler = makeQueryMock(RAW_BOOKING);
      handler.insert = vi.fn((args: Record<string, unknown>) => { insertArgs = args; return handler; });
      return handler;
    });

    await createBooking({
      providerId: '00000000-0000-0000-0000-0000000000aa',
      serviceTypeId: 'st-1',
      locationId: 'loc-1',
      scheduledAt: '2026-05-02T10:00:00Z',
      customerNotes: 'Please bring cleaning supplies',
    });

    expect(insertArgs).toMatchObject({
      provider_id: '00000000-0000-0000-0000-0000000000aa',
      customer_notes: 'Please bring cleaning supplies',
    });
    expect(insertArgs).not.toHaveProperty('status');
    expect(insertArgs).not.toHaveProperty('booking_type');
    expect(mock.from).toHaveBeenCalledTimes(1); // no service_types price lookup
  });

  it('surfaces database errors (e.g. unverified provider)', async () => {
    mock.from = vi.fn(() => makeQueryMock(null, { message: 'This provider is not available for booking' }));
    await expect(
      createBooking({ serviceTypeId: 'st-1', locationId: 'loc-1', scheduledAt: '2026-05-02T10:00:00Z' }),
    ).rejects.toThrow('This provider is not available for booking');
  });
});

describe('updateBookingStatus', () => {
  it('updates status to the given value', async () => {
    mock._setTable('bookings', null);
    await updateBookingStatus('b-1', 'confirmed');

    const handler = mock.from('bookings');
    expect(handler.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
    expect(handler.eq).toHaveBeenCalledWith('id', 'b-1');
  });

  it('sends only the status; the database stamps check-in/out times', async () => {
    mock._setTable('bookings', null);
    await updateBookingStatus('b-1', 'in_progress');

    const handler = mock.from('bookings');
    expect(handler.update).toHaveBeenCalledWith({ status: 'in_progress' });
  });

  it('does not set timestamps for other status transitions', async () => {
    mock._setTable('bookings', null);
    await updateBookingStatus('b-1', 'cancelled');

    const handler = mock.from('bookings');
    const updateCall = handler.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall['provider_checked_in_at']).toBeUndefined();
    expect(updateCall['provider_checked_out_at']).toBeUndefined();
  });

  it('throws on database error', async () => {
    mock._setTable('bookings', null, { message: 'Update failed' });
    await expect(updateBookingStatus('b-1', 'confirmed')).rejects.toThrow('Update failed');
  });
});

describe('acceptBooking', () => {
  it('sets status to confirmed', async () => {
    mock._setTable('bookings', null);
    await acceptBooking('b-1');

    const handler = mock.from('bookings');
    expect(handler.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
  });
});

describe('startService (customer)', () => {
  it('sets status to in_progress', async () => {
    mock._setTable('bookings', null);
    await startService('b-1');

    const handler = mock.from('bookings');
    expect(handler.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));
  });
});

describe('checkOut', () => {
  it('sets status to completed', async () => {
    mock._setTable('bookings', null);
    await checkOut('b-1');

    const handler = mock.from('bookings');
    expect(handler.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });
});
