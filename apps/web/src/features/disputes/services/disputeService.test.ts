import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, makeQueryMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const { createDispute, getDisputeByBooking, getDisputeById } = await import('./disputeService');

const RAW_DISPUTE = {
  id: 'd-1',
  booking_id: 'b-1',
  payment_id: 'pay-1',
  raised_by_user_id: 'user-1',
  reason: 'work_not_completed',
  description: 'The cleaner left early',
  evidence_urls: [],
  status: 'open',
  resolved_by_admin_id: null,
  resolution_notes: null,
  created_at: '2026-05-01T10:00:00Z',
  resolved_at: null,
};

const MAPPED_DISPUTE = {
  id: 'd-1',
  bookingId: 'b-1',
  paymentId: 'pay-1',
  raisedByUserId: 'user-1',
  reason: 'work_not_completed',
  description: 'The cleaner left early',
  evidenceUrls: [],
  status: 'open',
  resolvedByAdminId: null,
  resolutionNotes: null,
  createdAt: '2026-05-01T10:00:00Z',
  resolvedAt: null,
};

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('createDispute', () => {
  it('creates a dispute and returns the mapped result', async () => {
    mock._setTable('payments', { id: 'pay-1' });
    mock._setTable('disputes', RAW_DISPUTE);
    mock._setTable('bookings', null);

    const result = await createDispute('b-1', {
      reason: 'work_not_completed',
      description: 'The cleaner left early',
    });

    expect(result).toMatchObject(MAPPED_DISPUTE);
  });

  it('inserts dispute with status open and correct booking_id', async () => {
    let insertArgs: unknown;
    let callCount = 0;
    mock.from = vi.fn((_table: string) => {
      callCount++;
      if (callCount === 1) return makeQueryMock({ id: 'pay-1' }); // payments
      if (callCount === 2) {
        const handler = makeQueryMock(RAW_DISPUTE);
        handler.insert = vi.fn((args: unknown) => {
          insertArgs = args;
          return handler;
        });
        return handler;
      }
      return makeQueryMock(null); // bookings update
    });

    await createDispute('b-1', { reason: 'work_not_completed', description: 'Items broken' });

    expect(insertArgs).toMatchObject({ status: 'open', booking_id: 'b-1' });
  });

  it('updates booking status to disputed', async () => {
    let updateArgs: unknown;
    let callCount = 0;
    mock.from = vi.fn((_table: string) => {
      callCount++;
      if (callCount === 1) return makeQueryMock({ id: 'pay-1' });
      if (callCount === 2) return makeQueryMock(RAW_DISPUTE);
      const handler = makeQueryMock(null);
      handler.update = vi.fn((args: unknown) => {
        updateArgs = args;
        return handler;
      });
      return handler;
    });

    await createDispute('b-1', { reason: 'work_not_completed', description: 'test' });

    expect(updateArgs).toMatchObject({ status: 'disputed' });
  });

  it('throws when payment is not found', async () => {
    mock._setTable('payments', null, { message: 'No payment found' });

    await expect(
      createDispute('b-1', { reason: 'work_not_completed', description: 'test' }),
    ).rejects.toThrow('No payment found');
  });

  it('throws when dispute insert fails', async () => {
    let callCount = 0;
    mock.from = vi.fn(() => {
      callCount++;
      if (callCount === 1) return makeQueryMock({ id: 'pay-1' });
      return makeQueryMock(null, { message: 'Insert failed' });
    });

    await expect(
      createDispute('b-1', { reason: 'work_not_completed', description: 'test' }),
    ).rejects.toThrow('Insert failed');
  });

  it('throws when booking status update fails', async () => {
    mock._setTable('payments', { id: 'pay-1' });
    mock._setTable('disputes', RAW_DISPUTE);
    mock._setTable('bookings', null, { message: 'Booking update failed' });

    await expect(
      createDispute('b-1', { reason: 'work_not_completed', description: 'test' }),
    ).rejects.toThrow('Booking update failed');
  });
});

describe('getDisputeByBooking', () => {
  it('returns null when no dispute exists for the booking', async () => {
    mock._setTable('disputes', null);

    const result = await getDisputeByBooking('b-1');

    expect(result).toBeNull();
  });

  it('returns the mapped dispute when one exists', async () => {
    mock._setTable('disputes', RAW_DISPUTE);

    const result = await getDisputeByBooking('b-1');

    expect(result).toMatchObject(MAPPED_DISPUTE);
  });

  it('filters by booking_id', async () => {
    mock._setTable('disputes', RAW_DISPUTE);

    await getDisputeByBooking('b-42');

    const handler = mock.from('disputes');
    expect(handler.eq).toHaveBeenCalledWith('booking_id', 'b-42');
  });

  it('throws on database error', async () => {
    mock._setTable('disputes', null, { message: 'Query failed' });

    await expect(getDisputeByBooking('b-1')).rejects.toThrow('Query failed');
  });
});

describe('getDisputeById', () => {
  it('returns the mapped dispute by id', async () => {
    mock._setTable('disputes', RAW_DISPUTE);

    const result = await getDisputeById('d-1');

    expect(result).toMatchObject(MAPPED_DISPUTE);
  });

  it('queries by the correct id and uses single()', async () => {
    mock._setTable('disputes', RAW_DISPUTE);

    await getDisputeById('d-1');

    const handler = mock.from('disputes');
    expect(handler.eq).toHaveBeenCalledWith('id', 'd-1');
    expect(handler.single).toHaveBeenCalled();
  });

  it('throws on database error', async () => {
    mock._setTable('disputes', null, { message: 'Not found' });

    await expect(getDisputeById('d-999')).rejects.toThrow('Not found');
  });
});
