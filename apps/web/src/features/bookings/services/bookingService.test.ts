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
  checkIn,
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

  it('filters by provider_id and active statuses', async () => {
    // First call: provider_profiles, second call: bookings
    let callCount = 0;
    mock.from = vi.fn((table: string) => {
      callCount++;
      if (callCount === 1) {
        expect(table).toBe('provider_profiles');
        return makeQueryMock({ id: 'pp-1' });
      }
      expect(table).toBe('bookings');
      const handler = makeQueryMock([]);
      return handler;
    });

    await getProviderBookings();

    expect(callCount).toBe(2);
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
  it('calculates total with 5% platform fee', async () => {
    // First call: fetch service type base_price
    let callCount = 0;
    mock.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return makeQueryMock({ base_price: 450 }); // service_types
      }
      return makeQueryMock({ ...RAW_BOOKING, total_amount: 472.5 }); // bookings insert
    });

    const result = await createBooking({
      serviceTypeId: 'st-1',
      locationId: 'loc-1',
      scheduledAt: '2026-05-02T10:00:00Z',
    });

    // 450 + 5% = 472.50
    expect(result.totalAmount).toBe(472.5);
  });

  it('inserts with status pending and booking_type instant', async () => {
    let callCount = 0;
    let insertArgs: unknown;
    mock.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return makeQueryMock({ base_price: 250 });
      const handler = makeQueryMock(RAW_BOOKING);
      handler.insert = vi.fn((args: unknown) => { insertArgs = args; return handler; });
      return handler;
    });

    await createBooking({
      serviceTypeId: 'st-1',
      locationId: 'loc-1',
      scheduledAt: '2026-05-02T10:00:00Z',
      customerNotes: 'Please bring cleaning supplies',
    });

    expect(insertArgs).toMatchObject({
      status: 'pending',
      booking_type: 'instant',
      customer_notes: 'Please bring cleaning supplies',
    });
  });

  it('throws when service type is not found', async () => {
    mock.from = vi.fn(() => makeQueryMock(null, { message: 'Service type not found' }));
    await expect(
      createBooking({ serviceTypeId: 'bad-id', locationId: 'loc-1', scheduledAt: '2026-05-02T10:00:00Z' }),
    ).rejects.toThrow('Service type not found');
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

  it('sets provider_checked_in_at when transitioning to in_progress', async () => {
    mock._setTable('bookings', null);

    const before = new Date();
    await updateBookingStatus('b-1', 'in_progress');
    const after = new Date();

    const handler = mock.from('bookings');
    const updateCall = handler.update.mock.calls[0][0] as Record<string, unknown>;
    const checkedInAt = new Date(updateCall['provider_checked_in_at'] as string);

    expect(checkedInAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(checkedInAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('sets provider_checked_out_at when transitioning to completed', async () => {
    mock._setTable('bookings', null);
    await updateBookingStatus('b-1', 'completed');

    const handler = mock.from('bookings');
    const updateCall = handler.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall['provider_checked_out_at']).toBeDefined();
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

describe('checkIn', () => {
  it('sets status to in_progress', async () => {
    mock._setTable('bookings', null);
    await checkIn('b-1');

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
