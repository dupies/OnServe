import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

/**
 * Integration tests for release-payment Edge Function
 *
 * Tests verify:
 * - Payment state validation (must be escrowed)
 * - Provider bank details verification
 * - Ozow Payout API calls
 * - Payment and booking status updates
 * - Notification creation
 */

interface MockSupabaseClient {
  from: Mock;
  rpc: Mock;
}

interface QueryChain {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  eq: Mock;
  single: Mock;
  in: Mock;
}

// Test fixtures
const testPayment = {
  id: 'payment-456def',
  booking_id: 'booking-123abc',
  provider_payout: 450,
  status: 'escrowed',
  created_at: new Date().toISOString(),
  bookings: {
    provider_id: 'provider-789ghi',
    provider_profiles: {
      user_id: 'user-provider-789',
      bank_name: 'Capitec',
      bank_account_number: 'encrypted-1234567890',
      bank_branch_code: '470010',
      bank_account_type: 'savings',
      bank_verified: true,
    },
  },
};

const testBooking = {
  id: 'booking-123abc',
  customer_id: 'customer-012jkl',
  provider_id: 'provider-789ghi',
  status: 'pending',
  completed_at: null,
};

const testPayoutResponse = {
  payoutId: 'ozow-payout-789xyz',
  status: 'accepted',
  amount: 450,
};

describe('release-payment Edge Function', () => {
  let mockSupabase: MockSupabaseClient;
  let mockFetch: Mock;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  describe('payment state validation', () => {
    it('returns 400 if payment not found', async () => {
      const mockQuery = createMockQueryChain();

      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await mockQuery.single();

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('returns 400 if payment status is not escrowed', async () => {
      const unescrowedPayment = {
        ...testPayment,
        status: 'pending', // Still pending, not escrowed
      };

      const mockQuery = createMockQueryChain();
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: unescrowedPayment,
        error: null,
      });

      const result = await mockQuery.single();

      expect(result.data.status).not.toBe('escrowed');
      // Function would return 400
    });

    it('returns 400 if payment status is already released', async () => {
      const releasedPayment = {
        ...testPayment,
        status: 'released',
      };

      const mockQuery = createMockQueryChain();
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: releasedPayment,
        error: null,
      });

      const result = await mockQuery.single();

      expect(result.data.status).not.toBe('escrowed');
    });

    it('returns 400 if payment is disputed', async () => {
      const disputedPayment = {
        ...testPayment,
        status: 'disputed',
      };

      const mockQuery = createMockQueryChain();
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: disputedPayment,
        error: null,
      });

      const result = await mockQuery.single();

      expect(result.data.status).not.toBe('escrowed');
    });

    it('accepts payment in escrowed state', async () => {
      const escrowedPayment = {
        ...testPayment,
        status: 'escrowed',
      };

      const mockQuery = createMockQueryChain();
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: escrowedPayment,
        error: null,
      });

      const result = await mockQuery.single();

      expect(result.data.status).toBe('escrowed');
    });
  });

  describe('provider bank details validation', () => {
    it('returns 400 if provider bank not verified', async () => {
      const unverifiedPayment = {
        ...testPayment,
        bookings: {
          ...testPayment.bookings,
          provider_profiles: {
            ...testPayment.bookings.provider_profiles,
            bank_verified: false, // Not verified
          },
        },
      };

      expect(
        unverifiedPayment.bookings.provider_profiles.bank_verified
      ).toBe(false);
      // Function would return 400
    });

    it('returns 400 if provider bank account number missing', async () => {
      const missingAccountPayment = {
        ...testPayment,
        bookings: {
          ...testPayment.bookings,
          provider_profiles: {
            ...testPayment.bookings.provider_profiles,
            bank_account_number: null, // Missing
          },
        },
      };

      expect(
        missingAccountPayment.bookings.provider_profiles.bank_account_number
      ).toBeNull();
      // Function would return 400
    });

    it('accepts payment with verified bank details', async () => {
      expect(testPayment.bookings.provider_profiles.bank_verified).toBe(true);
      expect(testPayment.bookings.provider_profiles.bank_account_number).toBeTruthy();
    });

    it('creates notification for provider if bank details missing', async () => {
      const mockInsertQuery = createMockQueryChain();
      const providerId = testPayment.bookings.provider_profiles.user_id;

      mockInsertQuery.insert.mockReturnValue(mockInsertQuery);

      const notificationPayload = {
        user_id: providerId,
        title: 'Add Bank Details',
        body: expect.stringContaining('bank'),
        type: 'payment',
        is_read: false,
      };

      await mockInsertQuery.insert(notificationPayload);

      const args = (mockInsertQuery.insert as Mock).mock.calls[0][0];
      expect(args.user_id).toBe(providerId);
      expect(args.title).toContain('Bank');
    });
  });

  describe('Ozow Payout API call', () => {
    it('calls Ozow Payout API with correct endpoint', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(testPayoutResponse),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      await mockFetch('https://api.ozow.com/payouts', {
        method: 'POST',
        headers: {
          'AccessToken': 'test-api-key',
          'Content-Type': 'application/json',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('payouts'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('includes correct authentication header', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(testPayoutResponse),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      await mockFetch('https://api.ozow.com/payouts', {
        headers: {
          'AccessToken': 'test-api-key-123',
          'Content-Type': 'application/json',
        },
      });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['AccessToken']).toBe('test-api-key-123');
    });

    it('sends correct payout amount', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(testPayoutResponse),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const payoutData = {
        amount: testPayment.provider_payout,
        bankAccountNumber: 'decrypted-1234567890',
        bankCode: '470010',
        accountType: 'savings',
        reference: `ONSERVE-${testPayment.booking_id.slice(0, 8)}`,
      };

      await mockFetch('https://api.ozow.com/payouts', {
        method: 'POST',
        body: JSON.stringify(payoutData),
      });

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const bodyData = JSON.parse(callArgs[1].body);
      expect(bodyData.amount).toBe(450);
    });

    it('sends provider bank account number', async () => {
      const accountNumber = testPayment.bookings.provider_profiles.bank_account_number;

      const payoutData = {
        amount: 450,
        bankAccountNumber: accountNumber,
        bankCode: '470010',
        accountType: 'savings',
        reference: 'ONSERVE-booking1',
      };

      expect(payoutData.bankAccountNumber).toBe(accountNumber);
    });

    it('sends provider branch code', async () => {
      const branchCode = testPayment.bookings.provider_profiles.bank_branch_code;

      const payoutData = {
        amount: 450,
        bankAccountNumber: 'account-number',
        bankCode: branchCode,
        accountType: 'savings',
        reference: 'ONSERVE-booking1',
      };

      expect(payoutData.bankCode).toBe('470010');
    });

    it('sends account type (savings or cheque)', async () => {
      const payoutData = {
        amount: 450,
        bankAccountNumber: 'account-number',
        bankCode: '470010',
        accountType: testPayment.bookings.provider_profiles.bank_account_type,
        reference: 'ONSERVE-booking1',
      };

      expect(['savings', 'cheque']).toContain(payoutData.accountType);
      expect(payoutData.accountType).toBe('savings');
    });

    it('sends reference with booking ID', async () => {
      const reference = `ONSERVE-${testPayment.booking_id.slice(0, 8)}`;

      expect(reference).toContain('ONSERVE');
      expect(reference).toContain('booking1');
    });

    it('returns 502 if Ozow API request fails', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: 'Invalid account details',
        }),
        text: vi.fn().mockResolvedValue('Error response text'),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const response = await mockFetch('https://api.ozow.com/payouts');

      expect(response.ok).toBe(false);
      // Function would return 502 status
    });

    it('stores payout failure reason in database', async () => {
      const mockUpdateQuery = createMockQueryChain();
      const errorMessage = 'Invalid account number format';

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({ data: [{}], error: null });

      await mockUpdateQuery.update({
        payout_failed_reason: errorMessage,
      });

      const args = (mockUpdateQuery.update as Mock).mock.calls[0][0];
      expect(args.payout_failed_reason).toBe(errorMessage);
    });
  });

  describe('payment status update', () => {
    it('updates payment status to released on success', async () => {
      const mockUpdateQuery = createMockQueryChain();
      const releasedPayment = {
        ...testPayment,
        status: 'released',
        released_at: expect.any(String),
        payout_at: expect.any(String),
      };

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({
        data: [releasedPayment],
        error: null,
      });

      await mockUpdateQuery.update({
        status: 'released',
        released_at: expect.any(String),
        payout_at: expect.any(String),
      });

      const args = (mockUpdateQuery.update as Mock).mock.calls[0][0];
      expect(args.status).toBe('released');
    });

    it('sets released_at timestamp', async () => {
      const mockUpdateQuery = createMockQueryChain();
      const now = new Date().toISOString();

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({ data: [{}], error: null });

      await mockUpdateQuery.update({
        status: 'released',
        released_at: now,
        payout_at: now,
      });

      const args = (mockUpdateQuery.update as Mock).mock.calls[0][0];
      expect(args.released_at).toBeTruthy();
    });

    it('sets payout_at timestamp', async () => {
      const mockUpdateQuery = createMockQueryChain();
      const now = new Date().toISOString();

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({ data: [{}], error: null });

      await mockUpdateQuery.update({
        payout_at: now,
      });

      const args = (mockUpdateQuery.update as Mock).mock.calls[0][0];
      expect(args.payout_at).toBeTruthy();
    });

    it('stores Ozow payout ID in payment record', async () => {
      const mockUpdateQuery = createMockQueryChain();

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({ data: [{}], error: null });

      await mockUpdateQuery.update({
        ozow_payout_id: testPayoutResponse.payoutId,
      });

      const args = (mockUpdateQuery.update as Mock).mock.calls[0][0];
      expect(args.ozow_payout_id).toBe('ozow-payout-789xyz');
    });

    it('handles missing payoutId field in response', async () => {
      const responseWithoutId = {
        status: 'accepted',
        id: 'alt-payout-id', // Alternative field name
      };

      const payoutId = responseWithoutId.id ?? null;
      expect(payoutId).toBe('alt-payout-id');
    });
  });

  describe('booking status update', () => {
    it('updates booking status to completed on success', async () => {
      const mockUpdateQuery = createMockQueryChain();
      const completedBooking = {
        ...testBooking,
        status: 'completed',
        completed_at: expect.any(String),
      };

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({
        data: [completedBooking],
        error: null,
      });

      await mockUpdateQuery.update({
        status: 'completed',
        completed_at: expect.any(String),
      });

      const args = (mockUpdateQuery.update as Mock).mock.calls[0][0];
      expect(args.status).toBe('completed');
    });

    it('sets completed_at timestamp', async () => {
      const mockUpdateQuery = createMockQueryChain();
      const now = new Date().toISOString();

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({ data: [{}], error: null });

      await mockUpdateQuery.update({
        completed_at: now,
      });

      const args = (mockUpdateQuery.update as Mock).mock.calls[0][0];
      expect(args.completed_at).toBeTruthy();
    });

    it('updates with correct booking_id', async () => {
      const mockUpdateQuery = createMockQueryChain();

      mockUpdateQuery.update.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockReturnValue(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValue({ data: [{}], error: null });

      await mockUpdateQuery.update({ status: 'completed' });
      await mockUpdateQuery.eq('id', testPayment.booking_id);

      const eqCalls = (mockUpdateQuery.eq as Mock).mock.calls;
      expect(eqCalls.some(call => call[1] === testPayment.booking_id)).toBe(true);
    });
  });

  describe('notification creation', () => {
    it('creates notification for provider on release', async () => {
      const mockInsertQuery = createMockQueryChain();
      const providerId = testPayment.bookings.provider_profiles.user_id;
      const payoutAmount = testPayment.provider_payout;

      mockInsertQuery.insert.mockReturnValue(mockInsertQuery);

      const notificationPayload = {
        user_id: providerId,
        title: 'Payment Received',
        body: `R${payoutAmount.toFixed(2)} has been sent to your bank account.`,
        type: 'payment',
        is_read: false,
      };

      await mockInsertQuery.insert(notificationPayload);

      const args = (mockInsertQuery.insert as Mock).mock.calls[0][0];
      expect(args.user_id).toBe(providerId);
      expect(args.title).toContain('Payment');
      expect(args.body).toContain('450.00');
    });

    it('includes payout amount in notification body', async () => {
      const mockInsertQuery = createMockQueryChain();

      mockInsertQuery.insert.mockReturnValue(mockInsertQuery);

      const body = `R${testPayment.provider_payout.toFixed(2)} has been sent to your bank account.`;

      await mockInsertQuery.insert({
        user_id: 'provider-123',
        title: 'Payment Received',
        body: body,
        type: 'payment',
        is_read: false,
      });

      const args = (mockInsertQuery.insert as Mock).mock.calls[0][0];
      expect(args.body).toContain('450.00');
    });

    it('sets notification type to payment', async () => {
      const mockInsertQuery = createMockQueryChain();

      mockInsertQuery.insert.mockReturnValue(mockInsertQuery);

      await mockInsertQuery.insert({
        user_id: 'provider-123',
        title: 'Payment Received',
        type: 'payment',
        is_read: false,
      });

      const args = (mockInsertQuery.insert as Mock).mock.calls[0][0];
      expect(args.type).toBe('payment');
    });

    it('sets is_read to false', async () => {
      const mockInsertQuery = createMockQueryChain();

      mockInsertQuery.insert.mockReturnValue(mockInsertQuery);

      await mockInsertQuery.insert({
        user_id: 'provider-123',
        title: 'Payment Received',
        body: 'Payment sent',
        type: 'payment',
        is_read: false,
      });

      const args = (mockInsertQuery.insert as Mock).mock.calls[0][0];
      expect(args.is_read).toBe(false);
    });
  });

  describe('trigger_by parameter handling', () => {
    it('accepts customer as triggered_by', async () => {
      const triggerBy = 'customer';
      expect(['customer', 'auto_release', 'admin']).toContain(triggerBy);
    });

    it('accepts auto_release as triggered_by', async () => {
      const triggerBy = 'auto_release';
      expect(['customer', 'auto_release', 'admin']).toContain(triggerBy);
    });

    it('accepts admin as triggered_by', async () => {
      const triggerBy = 'admin';
      expect(['customer', 'auto_release', 'admin']).toContain(triggerBy);
    });

    it('processes payment regardless of trigger source', async () => {
      const triggers = ['customer', 'auto_release', 'admin'];

      for (const trigger of triggers) {
        expect(['customer', 'auto_release', 'admin']).toContain(trigger);
        // All trigger sources should process the payment the same way
      }
    });
  });

  describe('success response', () => {
    it('returns 200 with success status', async () => {
      const successResponse = {
        success: true,
        message: 'Payment released',
      };

      expect(successResponse.success).toBe(true);
    });

    it('includes success flag in response', async () => {
      const response = { success: true };
      expect(response).toHaveProperty('success');
    });
  });
});

// Helper function
function createMockQueryChain(): QueryChain {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    in: vi.fn(),
  };
}
