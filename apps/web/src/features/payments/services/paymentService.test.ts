import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Import after mocks are registered
const { createPayment, getPaymentByBooking, releasePayment, updateProviderBankDetails, getProviderBankDetails } =
  await import('./paymentService');

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('createPayment', () => {
  it('calls Edge Function with correct booking_id', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        paymentUrl: 'https://pay.ozow.com/payment/123',
        paymentId: 'payment-456',
        fees: {
          servicePrice: 450,
          platformFee: 45,
          subtotal: 495,
          transactionFee: 7.43,
          totalCharged: 502.43,
          providerPayout: 450,
          onserveRevenue: 45,
        },
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await createPayment('booking-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/create-payment'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: 'booking-123' }),
      }),
    );
  });

  it('returns payment response with paymentUrl and fees', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const expectedResponse = {
      paymentUrl: 'https://pay.ozow.com/payment/xyz',
      paymentId: 'payment-xyz',
      fees: {
        servicePrice: 100,
        platformFee: 10,
        subtotal: 110,
        transactionFee: 1.65,
        totalCharged: 111.65,
        providerPayout: 100,
        onserveRevenue: 10,
      },
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(expectedResponse),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const result = await createPayment('booking-456');

    expect(result).toEqual(expectedResponse);
    expect(result.paymentUrl).toContain('ozow');
    expect(result.fees.totalCharged).toBe(111.65);
  });

  it('throws on 401 Unauthorized response', async () => {
    const mockSession = {
      access_token: 'invalid-token',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(createPayment('booking-123')).rejects.toThrow('Unauthorized');
  });

  it('throws on 404 Booking not found', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: 'Booking not found' }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(createPayment('nonexistent-booking')).rejects.toThrow('Booking not found');
  });

  it('throws on 403 Forbidden (booking belongs to different customer)', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ error: 'Not your booking' }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(createPayment('other-customer-booking')).rejects.toThrow('Not your booking');
  });

  it('throws on 400 Bad Request (booking already paid)', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Booking already paid or cancelled' }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(createPayment('already-paid-booking')).rejects.toThrow('Booking already paid or cancelled');
  });

  it('throws when Ozow API rejects the payment request', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 502,
      json: vi.fn().mockResolvedValue({
        detail: 'Ozow rejected the payment request',
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(createPayment('booking-123')).rejects.toThrow('Ozow rejected the payment request');
  });

  it('uses detail field from error response when available', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 502,
      json: vi.fn().mockResolvedValue({
        detail: 'Specific error message from detail field',
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(createPayment('booking-123')).rejects.toThrow('Specific error message from detail field');
  });

  it('includes authorization header with session token', async () => {
    const mockSession = {
      access_token: 'secret-token-abc123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        paymentUrl: 'https://pay.ozow.com/payment/123',
        paymentId: 'payment-456',
        fees: {
          servicePrice: 450,
          platformFee: 45,
          subtotal: 495,
          transactionFee: 7.43,
          totalCharged: 502.43,
          providerPayout: 450,
          onserveRevenue: 45,
        },
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await createPayment('booking-123');

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe('Bearer secret-token-abc123');
  });
});

describe('getPaymentByBooking', () => {
  it('returns latest payment for a booking', async () => {
    const expectedPayment = {
      id: 'payment-123',
      booking_id: 'booking-456',
      amount: 502.43,
      status: 'escrowed',
      created_at: '2024-01-15T10:00:00Z',
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: expectedPayment,
        error: null,
      }),
      then: vi.fn().mockImplementation(function(resolve) {
        return Promise.resolve(resolve({ data: expectedPayment, error: null }));
      }),
      catch: vi.fn().mockReturnThis(),
      finally: vi.fn().mockReturnThis(),
    };

    mock.from = vi.fn().mockReturnValue(mockQuery);

    const result = await getPaymentByBooking('booking-456');

    expect(result).toEqual(expectedPayment);
  });

  it('queries payments table with correct filters', async () => {
    const mockQueryMethods = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => Promise.resolve(resolve({ data: {}, error: null }))),
      catch: vi.fn().mockReturnThis(),
      finally: vi.fn().mockReturnThis(),
    };

    mock.from = vi.fn().mockReturnValue(mockQueryMethods);

    await getPaymentByBooking('booking-123');

    expect(mock.from).toHaveBeenCalledWith('payments');
    expect(mockQueryMethods.select).toHaveBeenCalledWith('*');
    expect(mockQueryMethods.eq).toHaveBeenCalledWith('booking_id', 'booking-123');
    expect(mockQueryMethods.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockQueryMethods.limit).toHaveBeenCalledWith(1);
    expect(mockQueryMethods.single).toHaveBeenCalled();
  });

  it('throws when payment not found', async () => {
    mock._setTable('payments', null, { message: 'No rows found' });

    await expect(getPaymentByBooking('nonexistent-booking')).rejects.toThrow();
  });

  it('returns payment with all status values', async () => {
    const statuses = ['pending', 'escrowed', 'released', 'cancelled', 'disputed'];

    for (const status of statuses) {
      const payment = {
        id: `payment-${status}`,
        booking_id: 'booking-123',
        amount: 500,
        status,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: payment,
          error: null,
        }),
        then: vi.fn().mockImplementation(function(resolve) {
          return Promise.resolve(resolve({ data: payment, error: null }));
        }),
        catch: vi.fn().mockReturnThis(),
        finally: vi.fn().mockReturnThis(),
      };

      mock.from = vi.fn().mockReturnValue(mockQuery);

      const result = await getPaymentByBooking('booking-123');

      expect(result.status).toBe(status);
    }
  });
});

describe('releasePayment', () => {
  it('calls release-payment Edge Function with payment_id', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        message: 'Payment released',
      }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await releasePayment('payment-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/release-payment'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          payment_id: 'payment-123',
          triggered_by: 'customer',
        }),
      }),
    );
  });

  it('throws on 400 Bad Request (payment not escrowed)', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Payment not escrowed' }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(releasePayment('payment-123')).rejects.toThrow('Payment not escrowed');
  });

  it('throws on 400 when provider bank not verified', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const mockResponse = {
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Provider bank not verified' }),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    await expect(releasePayment('payment-123')).rejects.toThrow('Provider bank not verified');
  });

  it('returns success response with message', async () => {
    const mockSession = {
      access_token: 'test-token-123',
      user: { id: 'user-123' },
    };
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const expectedResponse = {
      success: true,
      message: 'Payment released to provider',
      payout_amount: 450,
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(expectedResponse),
    };

    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    const result = await releasePayment('payment-123');

    expect(result).toEqual(expectedResponse);
  });
});

describe('updateProviderBankDetails', () => {
  it('updates provider bank details in database', async () => {
    const bankDetails = {
      bankName: 'Capitec',
      accountNumber: '1234567890',
      accountHolder: 'John Doe',
      accountType: 'savings' as const,
      branchCode: '470010',
    };

    const mockUpdatedProfile = {
      id: 'provider-123',
      ...bankDetails,
      bank_verified: false,
    };

    mock._setTable('provider_profiles', mockUpdatedProfile);

    const result = await updateProviderBankDetails('provider-123', bankDetails);

    expect(result).toMatchObject(bankDetails);
  });

  it('sets bank_verified to false when updating', async () => {
    const bankDetails = {
      bankName: 'FNB',
      accountNumber: '9876543210',
      accountHolder: 'Jane Doe',
      accountType: 'cheque' as const,
    };

    const mockUpdatedProfile = {
      id: 'provider-123',
      bank_name: bankDetails.bankName,
      account_number: bankDetails.accountNumber,
      account_holder: bankDetails.accountHolder,
      account_type: bankDetails.accountType,
      branch_code: undefined,
      bank_verified: false,
    };

    mock._setTable('provider_profiles', mockUpdatedProfile);

    const result = await updateProviderBankDetails('provider-123', bankDetails);

    expect(result.bank_verified).toBe(false);
  });

  it('handles optional branch code', async () => {
    const bankDetails = {
      bankName: 'Standard Bank',
      accountNumber: '1111111111',
      accountHolder: 'Bob Smith',
      accountType: 'savings' as const,
      branchCode: '051001',
    };

    const mockUpdatedProfile = {
      id: 'provider-456',
      bank_name: bankDetails.bankName,
      account_number: bankDetails.accountNumber,
      account_holder: bankDetails.accountHolder,
      account_type: bankDetails.accountType,
      branch_code: bankDetails.branchCode,
      bank_verified: false,
    };

    mock._setTable('provider_profiles', mockUpdatedProfile);

    const result = await updateProviderBankDetails('provider-456', bankDetails);

    expect(result.branch_code).toBe('051001');
  });
});

describe('getProviderBankDetails', () => {
  it('returns provider bank details', async () => {
    const expectedDetails = {
      bank_name: 'Capitec',
      account_number: '1234567890',
      account_holder: 'John Doe',
      account_type: 'savings',
      branch_code: '470010',
      bank_verified: true,
    };

    mock._setTable('provider_profiles', expectedDetails);

    const result = await getProviderBankDetails('provider-123');

    expect(result).toEqual(expectedDetails);
  });

  it('returns bank_verified status', async () => {
    const verifiedDetails = {
      bank_name: 'FNB',
      account_number: '9876543210',
      account_holder: 'Jane Doe',
      account_type: 'cheque',
      branch_code: '250655',
      bank_verified: true,
    };

    mock._setTable('provider_profiles', verifiedDetails);

    const result = await getProviderBankDetails('provider-456');

    expect(result.bank_verified).toBe(true);
  });

  it('throws when provider not found', async () => {
    mock._setTable('provider_profiles', null, { message: 'No rows found' });

    await expect(getProviderBankDetails('nonexistent-provider')).rejects.toThrow();
  });
});
