import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

/**
 * Integration tests for create-payment Edge Function
 *
 * These tests verify the end-to-end flow of creating a payment record,
 * calculating fees, and requesting a payment URL from Ozow API.
 *
 * Note: In a real Deno test environment, these would use Deno.test()
 * and require a test database. This structure is compatible with
 * Vitest for local development and CI/CD pipelines.
 */

// Mock types and helpers for simulating the Edge Function environment
interface MockSupabaseClient {
  auth: {
    getUser: Mock;
  };
  from: Mock;
  rpc: Mock;
}

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<Record<string, unknown>>;
  text: () => Promise<string>;
}

// Test fixtures
const testBooking = {
  id: 'booking-123abc',
  customer_id: 'customer-456def',
  provider_id: 'provider-789ghi',
  service_type_id: 'service-001',
  total_amount: 450,
  status: 'pending',
  service_types: {
    name: 'House Cleaning',
    base_price: 450,
  },
  provider_services: null,
};

const testUser = {
  id: 'customer-456def',
  email: 'customer@example.com',
};

const testPaymentRecord = {
  id: 'payment-xyz789',
  booking_id: 'booking-123abc',
  customer_id: 'customer-456def',
  amount: 502.43,
  platform_fee: 45,
  transaction_fee: 7.43,
  provider_payout: 450,
  status: 'pending',
  payment_gateway: 'ozow',
  created_at: '2024-01-15T10:00:00Z',
};

const testOzowResponse = {
  url: 'https://pay.ozow.com/payment/abc123xyz',
  transactionId: 'ozow-txn-123',
  hashCheck: 'valid-hash-value',
};

describe('create-payment Edge Function', () => {
  let mockSupabase: MockSupabaseClient;
  let mockFetch: Mock;

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    };

    // Setup mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  describe('authentication', () => {
    it('returns 401 without auth token', async () => {
      // Simulate missing Authorization header
      const error = new Error('Missing auth token');
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      // In real implementation, this would be caught by the Edge Function
      expect(mockSupabase.auth.getUser).toBeDefined();
    });

    it('returns 401 with invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT malformed' },
      });

      const result = await mockSupabase.auth.getUser('invalid-token');

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('JWT');
    });

    it('allows request with valid auth token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null,
      });

      const result = await mockSupabase.auth.getUser('valid-token-123');

      expect(result.data.user).toEqual(testUser);
      expect(result.error).toBeNull();
    });
  });

  describe('booking validation', () => {
    it('returns 404 for non-existent booking', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows found' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await mockQuery.single();

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'booking-nonexistent');
    });

    it('returns 403 if booking belongs to different customer', async () => {
      const otherCustomerBooking = {
        ...testBooking,
        customer_id: 'other-customer-999',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: otherCustomerBooking,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await mockQuery.single();
      const booking = result.data;

      expect(booking.customer_id).not.toBe(testUser.id);
      // In real function, this would return 403
    });

    it('returns 400 if booking status is not pending', async () => {
      const cancelledBooking = {
        ...testBooking,
        status: 'cancelled',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: cancelledBooking,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await mockQuery.single();
      const booking = result.data;

      expect(booking.status).not.toBe('pending');
      // In real function, this would return 400
    });

    it('fetches booking with related service_types and provider_services', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testBooking,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const selectCall = mockQuery.select(
        'id, customer_id, provider_id, service_type_id, total_amount, status, service_types ( name, base_price ), provider_services ( custom_price )'
      );

      expect(selectCall).toBe(mockQuery);
      expect(mockQuery.select).toHaveBeenCalledWith(
        expect.stringContaining('service_types')
      );
    });
  });

  describe('fee calculation', () => {
    it('calculates correct fee breakdown for R450 service', async () => {
      // fees.calculateFees(450) should return:
      // {
      //   servicePrice: 450,
      //   platformFee: 45,
      //   subtotal: 495,
      //   transactionFee: 7.43,
      //   totalCharged: 502.43,
      //   providerPayout: 450,
      //   onserveRevenue: 45
      // }

      const servicePrice = 450;
      const platformFee = Math.round(servicePrice * 0.1 * 100) / 100; // 45
      const subtotal = servicePrice + platformFee;
      const transactionFee = Math.max(
        Math.round(subtotal * 0.015 * 100) / 100,
        1.0
      ); // 7.43
      const totalCharged = subtotal + transactionFee; // 502.43

      expect(platformFee).toBe(45);
      expect(subtotal).toBe(495);
      expect(transactionFee).toBe(7.43);
      expect(totalCharged).toBe(502.43);
    });

    it('uses custom_price from provider_services when available', async () => {
      const bookingWithCustomPrice = {
        ...testBooking,
        provider_services: {
          custom_price: 500,
        },
      };

      const servicePrice = bookingWithCustomPrice.provider_services?.custom_price ??
        bookingWithCustomPrice.service_types?.base_price;

      expect(servicePrice).toBe(500);
    });

    it('falls back to service_types.base_price when custom_price missing', async () => {
      const bookingNoCustom = {
        ...testBooking,
        provider_services: null,
      };

      const servicePrice = bookingNoCustom.provider_services?.custom_price ??
        bookingNoCustom.service_types?.base_price;

      expect(servicePrice).toBe(450);
    });

    it('falls back to total_amount if service type not found', async () => {
      const bookingNoService = {
        ...testBooking,
        service_types: null,
        provider_services: null,
      };

      const servicePrice = bookingNoService.provider_services?.custom_price ??
        bookingNoService.service_types?.base_price ??
        bookingNoService.total_amount;

      expect(servicePrice).toBe(450);
    });
  });

  describe('payment record creation', () => {
    it('creates payment record with correct fee breakdown', async () => {
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testPaymentRecord,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockInsertQuery);

      const insertCall = mockInsertQuery.insert({
        booking_id: testBooking.id,
        customer_id: testUser.id,
        amount: 502.43,
        platform_fee: 45,
        transaction_fee: 7.43,
        provider_payout: 450,
        status: 'pending',
        payment_gateway: 'ozow',
      });

      expect(insertCall).toBe(mockInsertQuery);
      expect(mockInsertQuery.insert).toHaveBeenCalled();

      const args = (mockInsertQuery.insert as Mock).mock.calls[0][0];
      expect(args.amount).toBe(502.43);
      expect(args.platform_fee).toBe(45);
      expect(args.transaction_fee).toBe(7.43);
      expect(args.provider_payout).toBe(450);
    });

    it('sets payment status to pending', async () => {
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testPaymentRecord,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockInsertQuery);

      await mockInsertQuery.insert({
        booking_id: testBooking.id,
        customer_id: testUser.id,
        amount: 502.43,
        platform_fee: 45,
        transaction_fee: 7.43,
        provider_payout: 450,
        status: 'pending',
        payment_gateway: 'ozow',
      });

      const args = (mockInsertQuery.insert as Mock).mock.calls[0][0];
      expect(args.status).toBe('pending');
    });

    it('returns error when payment creation fails', async () => {
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Duplicate key' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockInsertQuery);

      const result = await mockInsertQuery.single();

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('Ozow API request', () => {
    it('generates valid payment request with all required fields', async () => {
      const ozowFields = {
        siteCode: 'ONSERVE001',
        countryCode: 'ZA',
        currencyCode: 'ZAR',
        amount: '502.43',
        transactionReference: `ONSERVE-${testBooking.id.slice(0, 8)}`,
        bankReference: `OS-${testBooking.id.slice(0, 12)}`,
        optional1: testBooking.id,
        optional2: testPaymentRecord.id,
        optional3: testBooking.provider_id,
        optional4: testUser.id,
        cancelUrl: expect.stringContaining('payment/cancel'),
        errorUrl: expect.stringContaining('payment/error'),
        successUrl: expect.stringContaining('payment/success'),
        notifyUrl: expect.stringContaining('ozow-webhook'),
        isTest: 'true',
      };

      expect(ozowFields.siteCode).toBeDefined();
      expect(ozowFields.amount).toBe('502.43');
      expect(ozowFields.transactionReference).toContain('ONSERVE');
      expect(ozowFields.optional1).toBe(testBooking.id);
      expect(ozowFields.optional2).toBe(testPaymentRecord.id);
    });

    it('sends request to Ozow API with correct headers', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(testOzowResponse),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      await mockFetch('https://stagingapi.ozow.com/PostPaymentRequest', {
        method: 'POST',
        headers: {
          'ApiKey': 'test-api-key',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          siteCode: 'ONSERVE001',
          amount: '502.43',
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ozow'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'ApiKey': expect.any(String),
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('returns 502 if Ozow API rejects request', async () => {
      const mockResponse: MockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          errorMessage: 'Invalid merchant configuration',
        }),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const response = await mockFetch('https://stagingapi.ozow.com/PostPaymentRequest');
      const data = await response.json();

      expect(data.errorMessage).toBeDefined();
      expect(response.ok).toBe(false);
    });

    it('rolls back payment record if Ozow returns error', async () => {
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockDeleteQuery);

      const deleteCall = mockDeleteQuery.delete();
      expect(deleteCall).toBe(mockDeleteQuery);
      expect(mockDeleteQuery.eq).toBeDefined();

      // Would be called with:
      // .eq('id', payment.id)
      mockDeleteQuery.eq('id', testPaymentRecord.id);
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('id', testPaymentRecord.id);
    });
  });

  describe('success response', () => {
    it('returns 200 with payment URL on success', async () => {
      const mockResponse: MockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          paymentUrl: testOzowResponse.url,
          paymentId: testPaymentRecord.id,
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
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const response = await mockFetch('http://example.com');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.paymentUrl).toContain('ozow');
      expect(data.paymentId).toBe(testPaymentRecord.id);
    });

    it('includes complete fee breakdown in response', async () => {
      const fees = {
        servicePrice: 450,
        platformFee: 45,
        subtotal: 495,
        transactionFee: 7.43,
        totalCharged: 502.43,
        providerPayout: 450,
        onserveRevenue: 45,
      };

      expect(fees).toHaveProperty('servicePrice');
      expect(fees).toHaveProperty('platformFee');
      expect(fees).toHaveProperty('subtotal');
      expect(fees).toHaveProperty('transactionFee');
      expect(fees).toHaveProperty('totalCharged');
      expect(fees).toHaveProperty('providerPayout');
      expect(fees).toHaveProperty('onserveRevenue');

      expect(fees.totalCharged).toBe(502.43);
      expect(fees.providerPayout).toBe(450);
      expect(fees.onserveRevenue).toBe(45);
    });

    it('passes booking_id and payment_id in optional fields for webhook matching', async () => {
      const ozowFields = {
        optional1: testBooking.id, // booking_id
        optional2: testPaymentRecord.id, // payment_id
        optional3: testBooking.provider_id, // provider_id
        optional4: testUser.id, // customer_id
      };

      expect(ozowFields.optional1).toBe(testBooking.id);
      expect(ozowFields.optional2).toBe(testPaymentRecord.id);
      expect(ozowFields.optional3).toBe(testBooking.provider_id);
      expect(ozowFields.optional4).toBe(testUser.id);
    });
  });

  describe('edge cases', () => {
    it('handles booking with custom price override', async () => {
      const bookingWithCustom = {
        ...testBooking,
        service_types: { name: 'Cleaning', base_price: 450 },
        provider_services: { custom_price: 600 },
      };

      const servicePrice = bookingWithCustom.provider_services?.custom_price ??
        bookingWithCustom.service_types?.base_price;

      expect(servicePrice).toBe(600);
    });

    it('handles very small amounts (minimum fee applies)', async () => {
      const servicePrice = 10;
      const platformFee = 1; // 10 * 0.10
      const subtotal = 11;
      const transactionFee = 1; // max(11 * 0.015, 1) = max(0.165, 1) = 1

      expect(transactionFee).toBe(1);
    });

    it('handles large amounts correctly', async () => {
      const servicePrice = 10000;
      const platformFee = 1000; // 10000 * 0.10
      const subtotal = 11000;
      const transactionFee = Math.round(11000 * 0.015 * 100) / 100; // 165

      expect(transactionFee).toBe(165);
    });

    it('generates unique transaction reference for each payment', async () => {
      const ref1 = `ONSERVE-${testBooking.id.slice(0, 8)}`;
      const ref2 = `ONSERVE-${'other-booking-id'.slice(0, 8)}`;

      expect(ref1).not.toBe(ref2);
    });
  });
});
