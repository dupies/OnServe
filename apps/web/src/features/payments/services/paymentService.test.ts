import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const { createOzowPayment, getPaymentByBookingId } = await import('./paymentService');

const RAW_PAYMENT = {
  id: 'pay-1',
  booking_id: 'b-1',
  customer_id: 'user-1',
  amount: 472.5,
  deposit_amount: 0,
  balance_amount: 0,
  status: 'escrowed',
  payment_gateway: 'ozow',
  gateway_transaction_id: 'tx-1',
  gateway_reference: 'ONS-b1-123',
  escrowed_at: '2026-07-06T10:00:00Z',
  released_at: null,
  created_at: '2026-07-06T09:58:00Z',
};

beforeEach(() => {
  mock = makeSupabaseMock();
});

describe('createOzowPayment', () => {
  it('invokes the edge function and returns the redirect url', async () => {
    mock.functions.invoke.mockResolvedValue({
      data: { url: 'https://pay.ozow.com/abc/Secure' },
      error: null,
    });
    const result = await createOzowPayment('b-1');
    expect(mock.functions.invoke).toHaveBeenCalledWith('ozow-create-payment', {
      body: { bookingId: 'b-1' },
    });
    expect(result).toEqual({ url: 'https://pay.ozow.com/abc/Secure' });
  });

  it('throws on edge function error', async () => {
    mock.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Booking not found' },
    });
    await expect(createOzowPayment('b-x')).rejects.toThrow('Booking not found');
  });
});

describe('getPaymentByBookingId', () => {
  it('maps a payments row to the Payment type', async () => {
    mock._setTable('payments', RAW_PAYMENT);
    const payment = await getPaymentByBookingId('b-1');
    expect(payment).toEqual({
      id: 'pay-1',
      bookingId: 'b-1',
      customerId: 'user-1',
      amount: 472.5,
      depositAmount: 0,
      balanceAmount: 0,
      status: 'escrowed',
      paymentGateway: 'ozow',
      gatewayTransactionId: 'tx-1',
      gatewayReference: 'ONS-b1-123',
      escrowedAt: '2026-07-06T10:00:00Z',
      releasedAt: null,
      createdAt: '2026-07-06T09:58:00Z',
    });
  });

  it('returns null when no payment exists', async () => {
    mock._setTable('payments', null);
    expect(await getPaymentByBookingId('b-none')).toBeNull();
  });
});
