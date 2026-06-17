# OnServe Phase 3 — Ozow Payment Integration Spec

> **Refined based on Ozow API documentation findings (hub.ozow.com)**
> Maps directly to the OnServe monorepo structure, existing DB schema, and services-pattern codebase.

---

## Table of Contents

1. [Architecture Decision](#1-architecture-decision)
2. [Fee Model & Calculation](#2-fee-model--calculation)
3. [Database Migration](#3-database-migration)
4. [Shared Package Updates](#4-shared-package-updates)
5. [Edge Functions — Complete Spec](#5-edge-functions--complete-spec)
6. [Frontend Integration](#6-frontend-integration)
7. [Provider Bank Onboarding](#7-provider-bank-onboarding)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment Checklist](#9-deployment-checklist)
10. [Questions for Ozow Sales](#10-questions-for-ozow-sales)

---

## 1. Architecture Decision

### Why Ozow lacks native escrow — and what we do instead

Ozow is an instant-settlement EFT gateway. There is no "pre-authorise and capture later" capability. When a customer pays, funds land in your Ozow merchant float immediately. This means **OnServe's escrow is application-level, not gateway-level:**

```
Customer pays via Ozow Pay-in
  → Funds land instantly in OnServe's Ozow merchant float
  → DB records payment as "escrowed" (logical hold)
  → Job happens → customer approves (or 48h auto-release)
  → Edge Function triggers Ozow Payout API → provider's bank account
  → Commission stays in the float → OnServe withdraws periodically
```

**Regulatory position:** Ozow is a PASA-registered TPPP. Customer funds sit in Ozow's regulated float environment, not in an OnServe bank account. OnServe instructs payouts via API — it never directly holds or moves money. This is the same model Gumtree uses via TradeSafe. **However, confirm with a payments attorney before launch** that instructing delayed payouts from a PSP float does not itself constitute TPPP activity under SARB Directive 1 of 2007.

### Money flow diagram

```
┌─────────────┐     Ozow Pay-in (1.5%)      ┌─────────────────┐
│  Customer    │ ──────────────────────────→  │  Ozow Float     │
│  pays R502   │                              │  (OnServe acct) │
└─────────────┘                              └────────┬────────┘
                                                      │
                                          ┌───────────┴───────────┐
                                          │                       │
                                   Payout API call          Stays in float
                                   after approval           (OnServe revenue)
                                          │                       │
                                          ▼                       ▼
                                   ┌─────────────┐       ┌─────────────┐
                                   │  Provider    │       │  OnServe    │
                                   │  gets R450   │       │  keeps R45  │
                                   └─────────────┘       │  + withdraws│
                                                         │  periodically│
                                                         └─────────────┘
```

---

## 2. Fee Model & Calculation

### Structure: customer pays everything

| Line item | Formula | On R450 service |
|---|---|---|
| Service price | Set by provider | R450.00 |
| Platform commission (10%) | `servicePrice × 0.10` | R45.00 |
| Subtotal | `servicePrice + platformFee` | R495.00 |
| Ozow EFT fee (1.5%, min R1) | `max(subtotal × 0.015, 1.00)` | R7.43 |
| **Customer pays** | `subtotal + transactionFee` | **R502.43** |
| **Provider receives** | `servicePrice` | **R450.00** |
| **OnServe keeps** | `platformFee` | **R45.00** |

### Why 10% commission, not 5%

Your current doc says 5%. That's too thin for a marketplace carrying escrow risk, dispute resolution costs, and payment processing overhead. Benchmarks: Uber 25%, SweepSouth ~40%, Thumbtack ~20%, Helpling 25%. At 10% on a R450 booking you keep R45 — at 5% you'd keep R22.50, which barely covers a single failed payout retry. Start at 10%; you can always discount for high-volume providers later via loyalty tiers.

### Ozow fee reference (from ozow.com/pricing)

| Method | Fee |
|---|---|
| Pay By Bank (instant EFT) | 1.5% or min R1.00 |
| Nedbank Direct EFT | 1.5% or min R1.00 |
| Absa Pay | 1.5% or min R1.00 |
| PayShap Request | 1.5% or min R1.00 |
| Voucher (low risk) | 4.5% |
| BNPL | 4.99% + R4.00 |

For OnServe we'll use **Pay By Bank only** (1.5%) — it's the cheapest, most inclusive (no card needed), and aligns with the informal economy user base.

---

## 3. Database Migration

**Migration 009 — `add_ozow_payment_fields.sql`**

```sql
-- Migration: 009_add_ozow_payment_fields.sql
-- Purpose: Extend payments table for Ozow integration and add provider bank details

-- ============================================================
-- 1. Extend payments table
-- ============================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS platform_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_payout     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ozow_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS ozow_payout_id      TEXT,
  ADD COLUMN IF NOT EXISTS payout_failed_reason TEXT,
  ADD COLUMN IF NOT EXISTS payout_at           TIMESTAMPTZ;

-- Set default gateway for new records
ALTER TABLE payments
  ALTER COLUMN payment_gateway SET DEFAULT 'ozow';

-- Index for webhook lookups (Ozow sends transactionReference)
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON payments(booking_id);

-- Index for auto-release cron job
CREATE INDEX IF NOT EXISTS idx_payments_escrowed_pending_release
  ON payments(status, escrowed_at)
  WHERE status = 'escrowed';


-- ============================================================
-- 2. Provider bank details (on provider_profiles)
-- ============================================================

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,      -- encrypt via pgcrypto
  ADD COLUMN IF NOT EXISTS bank_branch_code    TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_type   TEXT       -- 'cheque' | 'savings'
    CHECK (bank_account_type IN ('cheque', 'savings')),
  ADD COLUMN IF NOT EXISTS bank_verified       BOOLEAN NOT NULL DEFAULT false;

-- RLS: providers can only read/update their own bank details
-- (existing provider_profiles RLS already enforces this)


-- ============================================================
-- 3. Encrypt bank account numbers using pgcrypto
-- ============================================================
-- pgcrypto is already enabled in the project.
-- In the Edge Function, encrypt before INSERT/UPDATE:
--   pgp_sym_encrypt(account_number, vault_key)
-- And decrypt on read:
--   pgp_sym_decrypt(bank_account_number::bytea, vault_key)
--
-- Alternative: store bank details in Supabase Vault directly
-- and reference by secret ID. Evaluate based on Ozow's payout
-- payload requirements.

COMMENT ON COLUMN provider_profiles.bank_account_number IS
  'Encrypted via pgcrypto pgp_sym_encrypt. Never expose in API responses.';
```

---

## 4. Shared Package Updates

### 4.1 `packages/types/src/payment.ts` — New types

```typescript
// packages/types/src/payment.ts

export type PaymentGateway = 'ozow';

export type PaymentStatus =
  | 'pending'      // Payment record created, Ozow redirect initiated
  | 'escrowed'     // Ozow confirmed payment, funds in float
  | 'released'     // Payout sent to provider
  | 'refunded'     // Refund issued to customer
  | 'disputed'     // Frozen — admin investigating
  | 'cancelled';   // Payment abandoned or failed at Ozow

export interface FeeBreakdown {
  servicePrice: number;
  platformFee: number;
  subtotal: number;
  transactionFee: number;
  totalCharged: number;
  providerPayout: number;
  onserveRevenue: number;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  customer_id: string;
  amount: number;                // totalCharged (what customer paid)
  platform_fee: number;
  transaction_fee: number;
  provider_payout: number;
  status: PaymentStatus;
  payment_gateway: PaymentGateway;
  ozow_transaction_id: string | null;
  ozow_payout_id: string | null;
  escrowed_at: string | null;
  released_at: string | null;
  payout_at: string | null;
  created_at: string;
}

// Ozow webhook notification fields (from hub.ozow.com)
export interface OzowNotification {
  SiteCode: string;
  TransactionId: string;
  TransactionReference: string;
  Amount: string;
  Status: OzowTransactionStatus;
  Optional1: string;            // booking_id
  Optional2: string;            // payment_id
  Optional3: string;            // provider_profile_id
  Optional4: string;            // customer_id
  Optional5: string;            // reserved
  CurrencyCode: string;
  IsTest: string;
  StatusMessage: string;
  Hash: string;
}

export type OzowTransactionStatus =
  | 'Complete'
  | 'Cancelled'
  | 'Error'
  | 'Abandoned'
  | 'PendingInvestigation'
  | 'Pending';
```

### 4.2 `packages/shared/src/fees.ts` — Fee calculation (single source of truth)

```typescript
// packages/shared/src/fees.ts

import type { FeeBreakdown } from '@onserve/types';

/** OnServe platform commission rate */
export const PLATFORM_FEE_RATE = 0.10;

/** Ozow instant EFT fee rate */
export const OZOW_EFT_FEE_RATE = 0.015;

/** Ozow minimum fee per transaction */
export const OZOW_MIN_FEE = 1.00;

/**
 * Calculate the full fee breakdown for a booking.
 *
 * Used by:
 * - Frontend: PaymentPage to show breakdown before redirect
 * - Edge Function: create-payment to set the actual charge amount
 *
 * @param servicePrice - The provider's price for the service (from
 *   service_types.base_price or provider_services.custom_price)
 */
export function calculateFees(servicePrice: number): FeeBreakdown {
  const platformFee = roundZAR(servicePrice * PLATFORM_FEE_RATE);
  const subtotal = servicePrice + platformFee;
  const transactionFee = Math.max(
    roundZAR(subtotal * OZOW_EFT_FEE_RATE),
    OZOW_MIN_FEE,
  );
  const totalCharged = subtotal + transactionFee;

  return {
    servicePrice,
    platformFee,
    subtotal,
    transactionFee,
    totalCharged,
    providerPayout: servicePrice,
    onserveRevenue: platformFee,
  };
}

/** Round to 2 decimal places (ZAR cents) using banker's rounding */
function roundZAR(value: number): number {
  return Math.round(value * 100) / 100;
}
```

### 4.3 `packages/shared/src/ozow.ts` — Hash utilities (shared between Edge Functions)

```typescript
// packages/shared/src/ozow.ts

/**
 * Generate Ozow SHA-512 hash.
 *
 * Algorithm (from hub.ozow.com):
 * 1. Concatenate fields in exact parameter-table order
 * 2. Append private key
 * 3. Lowercase the entire string
 * 4. SHA-512 hash (hex)
 */
export function generateOzowRequestHash(
  fields: string[],
  privateKey: string,
): string {
  // This function is called from Deno Edge Functions.
  // Uses Web Crypto API (available in Deno, not Node crypto).
  const raw = fields.join('') + privateKey;
  const lower = raw.toLowerCase();
  return sha512Hex(lower);
}

/**
 * Verify an incoming Ozow notification hash.
 *
 * Concatenation order (from hub.ozow.com):
 * SiteCode + TransactionId + TransactionReference + Amount +
 * Status + Optional1-5 + CurrencyCode + IsTest + StatusMessage
 * + PrivateKey → lowercase → SHA-512
 */
export function verifyOzowNotificationHash(
  notification: Record<string, string>,
  privateKey: string,
): boolean {
  const fields = [
    notification.SiteCode,
    notification.TransactionId,
    notification.TransactionReference,
    notification.Amount,
    notification.Status,
    notification.Optional1 ?? '',
    notification.Optional2 ?? '',
    notification.Optional3 ?? '',
    notification.Optional4 ?? '',
    notification.Optional5 ?? '',
    notification.CurrencyCode,
    notification.IsTest,
    notification.StatusMessage,
  ];

  const expectedHash = generateOzowRequestHash(fields, privateKey);
  const receivedHash = (notification.Hash ?? '').toLowerCase();

  // Trim leading zeros — some SHA-512 implementations drop them
  return expectedHash.replace(/^0+/, '') === receivedHash.replace(/^0+/, '');
}

/** SHA-512 hex digest using Web Crypto API (Deno-compatible) */
async function sha512Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

> **Note:** Since `crypto.subtle.digest` is async, the hash functions return `Promise<string>`. All Edge Functions calling these are already async.

---

## 5. Edge Functions — Complete Spec

### File structure

```
apps/api/supabase/functions/
├── create-payment/
│   └── index.ts              # Calculate fees → create payment record → call Ozow API → return URL
├── ozow-webhook/
│   └── index.ts              # Verify hash → update payment + booking status → notify
├── release-payment/
│   └── index.ts              # Trigger Ozow Payout to provider bank account
├── refund-payment/
│   └── index.ts              # Trigger Ozow Refund to customer
├── auto-release-cron/
│   └── index.ts              # Sweep escrowed payments older than 48h
└── _shared/
    ├── ozow-client.ts        # Ozow API wrapper (pay-in, payout, refund, status check)
    ├── supabase-admin.ts     # Supabase client with service role key
    └── config.ts             # Environment config (secrets from Supabase Vault)
```

### 5.1 `_shared/config.ts`

```typescript
// Edge Function secrets — set via:
// supabase secrets set OZOW_SITE_CODE=xxx OZOW_PRIVATE_KEY=xxx OZOW_API_KEY=xxx

export const config = {
  ozow: {
    siteCode:    Deno.env.get('OZOW_SITE_CODE')!,
    privateKey:  Deno.env.get('OZOW_PRIVATE_KEY')!,
    apiKey:      Deno.env.get('OZOW_API_KEY')!,
    isTest:      Deno.env.get('OZOW_IS_TEST') === 'true',
    apiBaseUrl:  Deno.env.get('OZOW_IS_TEST') === 'true'
      ? 'https://stagingapi.ozow.com'
      : 'https://api.ozow.com',
  },
  app: {
    baseUrl: Deno.env.get('APP_BASE_URL') ?? 'https://onserve.co.za',
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  },
};
```

### 5.2 `create-payment/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateFees } from '@onserve/shared';
import { generateOzowRequestHash } from '@onserve/shared/ozow';
import { config } from '../_shared/config.ts';

serve(async (req: Request) => {
  // 1. Auth — verify the calling user via JWT
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(config.app.supabaseUrl, config.app.supabaseServiceKey);
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // 2. Parse input
  const { booking_id } = await req.json();

  // 3. Fetch booking + service details (service role — bypasses RLS)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      provider_id,
      service_type_id,
      total_amount,
      status,
      service_types ( name, base_price ),
      provider_services ( custom_price )
    `)
    .eq('id', booking_id)
    .single();

  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
  }
  if (booking.customer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Not your booking' }), { status: 403 });
  }
  if (booking.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Booking already paid or cancelled' }), { status: 400 });
  }

  // 4. Calculate fees
  const servicePrice = booking.provider_services?.custom_price
    ?? booking.service_types?.base_price
    ?? booking.total_amount;
  const fees = calculateFees(servicePrice);

  // 5. Create payment record (status: pending)
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      customer_id: user.id,
      amount: fees.totalCharged,
      platform_fee: fees.platformFee,
      transaction_fee: fees.transactionFee,
      provider_payout: fees.providerPayout,
      status: 'pending',
      payment_gateway: 'ozow',
    })
    .select('id')
    .single();

  if (paymentError) {
    return new Response(JSON.stringify({ error: 'Failed to create payment' }), { status: 500 });
  }

  // 6. Build Ozow payment request
  const transactionRef = `ONSERVE-${booking.id.slice(0, 8)}`;
  const bankRef = `OS-${booking.id.slice(0, 12)}`.substring(0, 20); // max 20 chars

  const ozowFields = {
    siteCode: config.ozow.siteCode,
    countryCode: 'ZA',
    currencyCode: 'ZAR',
    amount: fees.totalCharged.toFixed(2),
    transactionReference: transactionRef,
    bankReference: bankRef,
    optional1: booking.id,           // booking_id — passed back in webhook
    optional2: payment.id,           // payment_id — passed back in webhook
    optional3: booking.provider_id,  // provider_profile_id
    optional4: user.id,              // customer_id
    cancelUrl: `${config.app.baseUrl}/payment/cancel?booking=${booking.id}`,
    errorUrl: `${config.app.baseUrl}/payment/error?booking=${booking.id}`,
    successUrl: `${config.app.baseUrl}/payment/success?booking=${booking.id}`,
    notifyUrl: `${config.app.supabaseUrl}/functions/v1/ozow-webhook`,
    isTest: String(config.ozow.isTest),
  };

  // 7. Generate hash (field order matters — matches Ozow parameter table)
  const hashFields = [
    ozowFields.siteCode,
    ozowFields.countryCode,
    ozowFields.currencyCode,
    ozowFields.amount,
    ozowFields.transactionReference,
    ozowFields.bankReference,
    ozowFields.optional1,
    ozowFields.optional2,
    ozowFields.optional3,
    ozowFields.optional4,
    '', // optional5 — empty but included
    ozowFields.cancelUrl,
    ozowFields.errorUrl,
    ozowFields.successUrl,
    ozowFields.notifyUrl,
    ozowFields.isTest,
  ];
  const hashCheck = await generateOzowRequestHash(hashFields, config.ozow.privateKey);

  // 8. Call Ozow API
  const ozowResponse = await fetch(
    `${config.ozow.apiBaseUrl}/PostPaymentRequest`,
    {
      method: 'POST',
      headers: {
        'ApiKey': config.ozow.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ ...ozowFields, hashCheck }),
    },
  );
  const ozowData = await ozowResponse.json();

  if (ozowData.errorMessage || !ozowData.url) {
    // Roll back payment record
    await supabase.from('payments').delete().eq('id', payment.id);
    return new Response(JSON.stringify({
      error: 'Ozow rejected the payment request',
      detail: ozowData.errorMessage,
    }), { status: 502 });
  }

  // 9. Return the Ozow payment URL to the frontend
  return new Response(JSON.stringify({
    paymentUrl: ozowData.url,
    paymentId: payment.id,
    fees,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 5.3 `ozow-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyOzowNotificationHash } from '@onserve/shared/ozow';
import { config } from '../_shared/config.ts';

serve(async (req: Request) => {
  // 1. Parse form-urlencoded body (Ozow sends application/x-www-form-urlencoded)
  const formData = await req.formData();
  const notification: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    notification[key] = String(value);
  }

  // 2. Verify hash — reject tampered webhooks
  const isValid = await verifyOzowNotificationHash(notification, config.ozow.privateKey);
  if (!isValid) {
    console.error('Ozow webhook hash verification failed', notification);
    return new Response('Invalid hash', { status: 400 });
  }

  // 3. Extract our IDs from optional fields
  const bookingId = notification.Optional1;
  const paymentId = notification.Optional2;
  const ozowStatus = notification.Status;
  const ozowTransactionId = notification.TransactionId;

  const supabase = createClient(config.app.supabaseUrl, config.app.supabaseServiceKey);

  // 4. Idempotency check — don't process twice
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('id', paymentId)
    .single();

  if (!existingPayment) {
    console.error('Payment not found for webhook', { paymentId });
    return new Response('Payment not found', { status: 404 });
  }
  if (existingPayment.status !== 'pending') {
    // Already processed — return 200 so Ozow doesn't retry
    return new Response('Already processed', { status: 200 });
  }

  // 5. Handle by Ozow status
  switch (ozowStatus) {
    case 'Complete': {
      // Payment succeeded — move to escrowed
      await supabase
        .from('payments')
        .update({
          status: 'escrowed',
          ozow_transaction_id: ozowTransactionId,
          escrowed_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Update booking status to confirmed (provider can now see it)
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      // Notify provider — "New job available, payment secured"
      await supabase.from('notifications').insert({
        user_id: notification.Optional3, // provider_profile.user_id
        title: 'New Job Available',
        body: `A customer has booked and paid. Accept the job to get started.`,
        type: 'booking',
        is_read: false,
      });

      break;
    }

    case 'Cancelled':
    case 'Error':
    case 'Abandoned': {
      // Payment failed — cancel
      await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          ozow_transaction_id: ozowTransactionId,
        })
        .eq('id', paymentId);

      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      // Notify customer
      await supabase.from('notifications').insert({
        user_id: notification.Optional4, // customer_id
        title: 'Payment Failed',
        body: `Your payment was not completed. Please try again.`,
        type: 'payment',
        is_read: false,
      });

      break;
    }

    case 'PendingInvestigation':
    case 'Pending': {
      // Ozow is still processing — do nothing, wait for final webhook
      console.log('Ozow pending status, awaiting final notification', { paymentId, ozowStatus });
      break;
    }
  }

  // Always return 200 to acknowledge receipt
  return new Response('OK', { status: 200 });
});
```

### 5.4 `release-payment/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';

/**
 * Called by:
 * - Customer tapping "Approve & Pay Provider" in the UI
 * - auto-release-cron after 48h
 * - Admin resolving a dispute in provider's favour
 */
serve(async (req: Request) => {
  const { payment_id, triggered_by } = await req.json();
  // triggered_by: 'customer' | 'auto_release' | 'admin'

  const supabase = createClient(config.app.supabaseUrl, config.app.supabaseServiceKey);

  // 1. Fetch payment + provider bank details
  const { data: payment } = await supabase
    .from('payments')
    .select(`
      id, booking_id, provider_payout, status,
      bookings!inner (
        provider_id,
        provider_profiles!inner (
          user_id,
          bank_name,
          bank_account_number,
          bank_branch_code,
          bank_account_type,
          bank_verified
        )
      )
    `)
    .eq('id', payment_id)
    .single();

  if (!payment || payment.status !== 'escrowed') {
    return new Response(JSON.stringify({ error: 'Payment not in escrowed state' }), { status: 400 });
  }

  const provider = payment.bookings.provider_profiles;
  if (!provider.bank_verified || !provider.bank_account_number) {
    // Can't pay out — notify provider to add bank details
    await supabase.from('notifications').insert({
      user_id: provider.user_id,
      title: 'Add Bank Details',
      body: 'Your job payment is ready but we need your bank details to pay you.',
      type: 'payment',
      is_read: false,
    });
    return new Response(JSON.stringify({ error: 'Provider bank details not verified' }), { status: 400 });
  }

  // 2. Call Ozow Payouts API
  // NOTE: Exact endpoint and auth method to be confirmed with Ozow sales.
  // Based on hub.ozow.com the header changed from ApiKey to AccessToken in v1.4.
  const payoutResponse = await fetch('https://api.ozow.com/payouts', {
    method: 'POST',
    headers: {
      'AccessToken': config.ozow.apiKey, // Confirm header name with Ozow
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: payment.provider_payout,
      bankAccountNumber: provider.bank_account_number, // decrypt first if using pgcrypto
      bankCode: provider.bank_branch_code,
      accountType: provider.bank_account_type,
      reference: `ONSERVE-${payment.booking_id.slice(0, 8)}`,
      // isRealTimeClearance: true — for instant payouts (confirm availability)
    }),
  });

  if (!payoutResponse.ok) {
    const error = await payoutResponse.text();
    await supabase
      .from('payments')
      .update({ payout_failed_reason: error })
      .eq('id', payment_id);

    console.error('Ozow payout failed', { payment_id, error });
    return new Response(JSON.stringify({ error: 'Payout failed' }), { status: 502 });
  }

  const payoutData = await payoutResponse.json();

  // 3. Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      payout_at: new Date().toISOString(),
      ozow_payout_id: payoutData.payoutId ?? payoutData.id ?? null,
    })
    .eq('id', payment_id);

  // 4. Update booking status
  await supabase
    .from('bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', payment.booking_id);

  // 5. Notify both parties
  await supabase.from('notifications').insert([
    {
      user_id: provider.user_id,
      title: 'Payment Received',
      body: `R${payment.provider_payout.toFixed(2)} has been sent to your bank account.`,
      type: 'payment',
      is_read: false,
    },
  ]);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

### 5.5 `auto-release-cron/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';

/**
 * Runs on a schedule (pg_cron or external cron trigger).
 * Finds all escrowed payments older than 48h with no dispute
 * and auto-releases them.
 *
 * Schedule: every 30 minutes
 * pg_cron: SELECT cron.schedule('auto-release', '*/30 * * * *',
 *   $$SELECT net.http_post(...)$$);
 */
serve(async (_req: Request) => {
  const supabase = createClient(config.app.supabaseUrl, config.app.supabaseServiceKey);

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Find escrowed payments past the 48h window with no active dispute
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, booking_id')
    .eq('status', 'escrowed')
    .lt('escrowed_at', cutoff);

  if (!pendingPayments?.length) {
    return new Response(JSON.stringify({ released: 0 }), { status: 200 });
  }

  // Check none have active disputes
  const bookingIds = pendingPayments.map(p => p.booking_id);
  const { data: disputes } = await supabase
    .from('disputes')
    .select('booking_id')
    .in('booking_id', bookingIds)
    .in('status', ['open', 'under_review']);

  const disputedBookingIds = new Set(disputes?.map(d => d.booking_id) ?? []);

  let releasedCount = 0;
  for (const payment of pendingPayments) {
    if (disputedBookingIds.has(payment.booking_id)) {
      continue; // Skip — has active dispute
    }

    // Call release-payment Edge Function internally
    const releaseUrl = `${config.app.supabaseUrl}/functions/v1/release-payment`;
    await fetch(releaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.app.supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_id: payment.id,
        triggered_by: 'auto_release',
      }),
    });
    releasedCount++;
  }

  return new Response(JSON.stringify({ released: releasedCount }), { status: 200 });
});
```

---

## 6. Frontend Integration

### 6.1 New service file: `features/payments/services/paymentService.ts`

Follows the existing services-pattern (component → hook → service → Supabase).

```typescript
// apps/web/src/features/payments/services/paymentService.ts

import { supabase } from '@/lib/supabase';
import type { FeeBreakdown } from '@onserve/types';

interface CreatePaymentResponse {
  paymentUrl: string;
  paymentId: string;
  fees: FeeBreakdown;
}

export async function createPayment(bookingId: string): Promise<CreatePaymentResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ booking_id: bookingId }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail ?? error.error ?? 'Payment creation failed');
  }

  return response.json();
}

export async function getPaymentByBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}
```

### 6.2 New hook: `features/payments/hooks/useCreatePayment.ts`

```typescript
// apps/web/src/features/payments/hooks/useCreatePayment.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPayment } from '../services/paymentService';

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => createPayment(bookingId),
    onSuccess: (data) => {
      // Redirect to Ozow payment page
      window.location.href = data.paymentUrl;
    },
    onError: (error) => {
      // Handled by the component via mutation.error
      console.error('Payment creation failed:', error);
    },
  });
}
```

### 6.3 Payment page flow

The booking wizard's final step calls `useCreatePayment`. The flow:

```
BookingWizard (select service + location + date + time)
  → PaymentPage (shows fee breakdown, "Pay with Ozow" button)
    → useCreatePayment.mutate(bookingId)
      → Edge Function creates payment record + calls Ozow API
      → Returns Ozow URL → browser redirects to Ozow
        → Customer completes EFT on their bank
        → Ozow redirects to /payment/success?booking=xxx
        → Ozow POSTs webhook to ozow-webhook Edge Function
          → payment.status → escrowed
          → booking.status → confirmed
```

### 6.4 New pages

| Route | Component | Purpose |
|---|---|---|
| `/payment/checkout/:bookingId` | `PaymentCheckoutPage` | Shows fee breakdown. "Pay with Ozow" button triggers `useCreatePayment`. |
| `/payment/success` | `PaymentSuccessPage` | Landing after Ozow redirect. Polls payment status via `getPaymentByBooking`. Shows "Payment secured — waiting for provider" once escrowed. |
| `/payment/cancel` | `PaymentCancelPage` | Ozow cancel redirect. "Try again" button. |
| `/payment/error` | `PaymentErrorPage` | Ozow error redirect. "Contact support" + retry option. |
| `/provider/bank-details` | `BankDetailsPage` | Provider enters/edits bank account for payouts. |

### 6.5 Fee breakdown component

```
┌──────────────────────────────────┐
│  Payment Summary                 │
│                                  │
│  Standard Clean          R450.00 │
│  Platform fee (10%)       R45.00 │
│  Transaction fee           R7.43 │
│  ──────────────────────────────  │
│  Total                   R502.43 │
│                                  │
│  ┌────────────────────────────┐  │
│  │    Pay with Ozow    →     │  │
│  └────────────────────────────┘  │
│                                  │
│  ₿ Secure instant EFT payment   │
│  Funds held until job complete   │
└──────────────────────────────────┘
```

---

## 7. Provider Bank Onboarding

Providers need bank details on file before their first payout. Collect this either during provider verification (Phase 1 KYC) or on first job acceptance.

### Required fields (from Ozow Payouts docs)

| Field | Validation | Example |
|---|---|---|
| Bank name | Dropdown — SA banks only | Capitec, FNB, Standard Bank, Absa, Nedbank, TymeBank |
| Account number | 7–13 digits | 1234567890 |
| Branch code | 6 digits (universal codes) | 470010 (Capitec), 250655 (FNB) |
| Account type | `cheque` or `savings` | savings |

### SA universal branch codes (for the dropdown)

| Bank | Universal Branch Code |
|---|---|
| ABSA | 632005 |
| Capitec | 470010 |
| FNB | 250655 |
| Nedbank | 198765 |
| Standard Bank | 051001 |
| TymeBank | 678910 |
| African Bank | 430000 |
| Investec | 580105 |

### Verification

Use Ozow's AVS (Account Verification Service) if available — or do a R0.01 test payout on provider onboarding to confirm the account is real and matches the provider's name. Flag `bank_verified = true` only after confirmation.

---

## 8. Testing Strategy

### 8.1 Ozow sandbox

| Item | Value |
|---|---|
| Staging API | `https://stagingapi.ozow.com/PostPaymentRequest` |
| Staging pay URL | `https://pay.ozow.com/` (same, but use `isTest: true`) |
| Test credentials | Request from Ozow merchant portal |

Always set `isTest: true` in development. Ozow staging simulates the full bank flow without moving real money.

### 8.2 Unit tests (Vitest)

Add to the existing 59-test suite:

```
features/payments/services/paymentService.test.ts
  ✓ createPayment calls Edge Function with correct booking_id
  ✓ createPayment throws on 401
  ✓ getPaymentByBooking returns latest payment for booking

packages/shared/src/fees.test.ts
  ✓ calculateFees returns correct breakdown for R450 service
  ✓ calculateFees applies minimum R1 Ozow fee on small amounts
  ✓ calculateFees handles zero and negative gracefully
  ✓ platformFee is exactly 10% of servicePrice
  ✓ providerPayout equals servicePrice (provider keeps full price)

packages/shared/src/ozow.test.ts
  ✓ generateOzowRequestHash produces valid SHA-512
  ✓ verifyOzowNotificationHash validates correct hash
  ✓ verifyOzowNotificationHash rejects tampered hash
  ✓ hash handles leading-zero edge case
```

### 8.3 Integration tests

```
Edge Function: create-payment
  ✓ Returns 401 without auth token
  ✓ Returns 404 for non-existent booking
  ✓ Returns 403 if booking belongs to different customer
  ✓ Returns 400 if booking already paid
  ✓ Returns Ozow payment URL on success
  ✓ Creates payment record with correct fee breakdown

Edge Function: ozow-webhook
  ✓ Returns 400 on invalid hash
  ✓ Returns 200 on duplicate (idempotent)
  ✓ Updates payment to escrowed on Complete
  ✓ Updates payment to cancelled on Error/Cancelled/Abandoned
  ✓ Ignores Pending status (no state change)
  ✓ Creates notification for provider on Complete
  ✓ Creates notification for customer on failure

Edge Function: release-payment
  ✓ Returns 400 if payment not escrowed
  ✓ Returns 400 if provider bank not verified
  ✓ Calls Ozow Payout API with correct amount
  ✓ Updates payment to released on success
  ✓ Updates booking to completed on success

Edge Function: auto-release-cron
  ✓ Releases escrowed payments older than 48h
  ✓ Skips payments with active disputes
  ✓ Returns count of released payments
```

---

## 9. Deployment Checklist

### Before first deploy

- [ ] Ozow merchant account approved
- [ ] Ozow Payouts product enabled (separate application)
- [ ] Sandbox tested end-to-end (pay-in → webhook → payout)
- [ ] `supabase secrets set` for all Ozow keys
- [ ] Migration 009 applied to production
- [ ] Webhook URL registered in Ozow merchant portal as `notifyUrl`
- [ ] Redirect URLs allowlisted in Ozow merchant portal
- [ ] pg_cron scheduled for `auto-release-cron` (every 30 min)
- [ ] Provider bank details collection UI deployed
- [ ] Fee breakdown component reviewed for correctness
- [ ] RLS policies verified — customer cannot see other customers' payments
- [ ] Payment attorney confirmed TPPP classification (see §10)

### After first deploy

- [ ] Monitor Ozow webhook delivery (check for retries or failures)
- [ ] Verify first real payout lands in provider's account
- [ ] Confirm auto-release cron fires correctly after 48h
- [ ] Test dispute flow: freeze → admin resolve → release or refund
- [ ] Monitor float balance in Ozow dashboard

---

## 10. Questions for Ozow Sales (Before Writing Payout Code)

These are blockers — do not write the `release-payment` Edge Function until answered:

1. **Payout API endpoint & auth:** The docs mention header changed from `ApiKey` to `AccessToken` in Payouts v1.4. What is the exact production endpoint URL and authentication header format?

2. **Float vs pre-fund:** Do payouts draw from our settled pay-in balance (the float), or must we separately fund a payout wallet? This determines whether we can immediately use customer payments to pay providers.

3. **Payout fields:** What exact JSON payload does the Payout API expect? (account number, branch code, bank name, account type, reference, amount — confirm field names and types)

4. **Payout webhook:** Is there a webhook for payout completion/failure? We need to know when funds actually land in the provider's account vs when the payout instruction is accepted.

5. **RTC availability:** Is real-time clearance (instant payout) available via API, or only standard next-business-day? What are the RTC time windows and limits?

6. **AVS for verification:** Can we verify a provider's bank account before their first payout via API? (Account Verification Service)

7. **Marketplace classification:** "We're a service marketplace — customers pay us via Ozow, we hold in float, then pay providers days later via Payout API after job completion. Does this usage fall within your TPPP licence, or do we need separate regulatory registration?"

8. **Refund API:** Is there a programmatic refund API, or must refunds be initiated through the merchant dashboard?

9. **Payout fees:** What is the per-payout fee? Does it differ for RTC vs standard? Is there volume pricing?

10. **Sandbox for payouts:** Can we test payouts in staging, or only pay-ins?
