# Ozow Payments Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock "Confirm booking" step with a real Ozow (instant EFT) payment: the customer pays into escrow before the booking is handed to a provider, and payment state is driven by Ozow's server-to-server webhook — never by the browser redirect.

**Architecture:** The web app is a Vite React SPA with no server of its own, so all secret-handling code lives in **Supabase Edge Functions** (Deno). Function 1 (`ozow-create-payment`, JWT-verified) validates the booking, creates/updates a `payments` row, computes the SHA-512 hash server-side and calls Ozow's `PostPaymentRequest` API to get a redirect URL. Function 2 (`ozow-webhook`, public) receives Ozow's notification, verifies the hash, cross-checks the transaction with Ozow's `GetTransaction` API, and updates the `payments` row with the service-role key (bypassing RLS, which intentionally blocks client-side payment updates). The SPA redirects to Ozow, then lands on a result page that **polls the `payments` row** until the webhook has settled it.

**Tech Stack:** React 19 + Vite SPA (`apps/web`), TanStack Query, Supabase (Postgres + Edge Functions/Deno), Ozow API (`https://api.ozow.com`), vitest (web), `deno test` (edge functions).

## Global Constraints

- Monorepo: npm workspaces + turbo; web app at `apps/web`, shared types at `packages/types`.
- Feature-module pattern: `apps/web/src/features/<name>/{services,hooks}`; pages in `apps/web/src/pages/customer`; path alias `@/` → `apps/web/src`.
- All service functions throw `new Error(error.message)` on Supabase errors (match `bookingService.ts`).
- Currency is ZAR only; `CountryCode` is `ZA`. Amounts stored as `numeric(10,2)`, sent to Ozow as strings with exactly 2 decimals.
- Client-side code NEVER sees `OZOW_PRIVATE_KEY` or `OZOW_API_KEY`; hash generation happens only in edge functions.
- Payment state transitions happen ONLY in the webhook (service role). The browser redirect (`success`/`cancel`/`error` URL) is untrusted UX signal only.
- Ozow test credentials (public, from Ozow docs): SiteCode `TSTSTE0001`, Private Key `215114531AFF7134A94C88CEEA48E`, API Key `EB5758F2C3B4DF3FF4F2669D5FF5B`. Real credentials come from the Ozow merchant dashboard (`dash.ozow.com`) and live only in Supabase secrets.
- Web tests: `cd apps/web && npx vitest run <file>`. Edge function tests: `deno test supabase/functions/_shared/`.

## ⚠️ Verify against `OneAPI.yaml` before starting

The attached `~/Downloads/OneAPI.yaml` spec could not be read while writing this plan (macOS denied access to the Downloads folder). This plan is built on Ozow's publicly documented integration (`https://api.ozow.com/PostPaymentRequest` + hash check + NotifyUrl webhook), which is the standard redirect checkout flow. **Task 0 reconciles this plan against the yaml.** If the yaml describes Ozow's newer token-based OneAPI (`Get Token` → bearer-authenticated requests) instead, only the request/response shapes in `supabase/functions/_shared/ozow.ts` (Task 2) and the endpoint constants change — the architecture (two edge functions, DB-driven status, polling result page) stays identical.

---

### Task 0: Reconcile plan with the attached OneAPI.yaml

**Files:**
- Read: `docs/OneAPI.yaml` (copy it into the repo first)
- Modify (possibly): this plan document

**Interfaces:**
- Produces: confirmed endpoint URLs, field names, and hash rules used by Tasks 2–4.

- [ ] **Step 1: Copy the spec into the repo**

From a regular terminal (Claude cannot read `~/Downloads`):

```bash
cp ~/Downloads/OneAPI.yaml ~/Projects/OnServe/docs/OneAPI.yaml
```

- [ ] **Step 2: Compare the spec against this plan's assumptions**

Check each of these against the yaml and note discrepancies:

| Plan assumption | Where used |
|---|---|
| `POST https://api.ozow.com/PostPaymentRequest` with `ApiKey` header returns `{ paymentRequestId, url, errorMessage }` | Task 2 `requestPaymentUrl`, Task 3 |
| Request hash = concat(SiteCode, CountryCode, CurrencyCode, Amount, TransactionReference, BankReference, CancelUrl, ErrorUrl, SuccessUrl, NotifyUrl, IsTest) + PrivateKey → lowercase → SHA-512 | Task 2 `generateRequestHash` |
| Webhook POSTs `application/x-www-form-urlencoded` with fields SiteCode, TransactionId, TransactionReference, Amount, Status, Optional1–5, CurrencyCode, IsTest, StatusMessage, Hash | Task 2 `verifyNotificationHash`, Task 4 |
| Statuses: `Complete`, `Cancelled`, `Error`, `Abandoned`, `Pending`, `PendingInvestigation` | Task 4 status mapping |
| `GET https://api.ozow.com/GetTransaction?siteCode=&transactionId=` with `ApiKey` header | Task 2 `getTransaction`, Task 4 |

- [ ] **Step 3: Update this plan if the yaml differs**

If the yaml uses a token-based flow (e.g. a `Get Token` endpoint and `Authorization: Bearer`), rewrite `requestPaymentUrl` in Task 2 to (a) fetch the token, (b) call the yaml's create-transaction endpoint, and update the endpoint constants. Field-name-only differences: fix inline in the task code blocks.

- [ ] **Step 4: Commit**

```bash
git add docs/OneAPI.yaml docs/superpowers/plans/2026-07-06-ozow-payments.md
git commit -m "docs: add Ozow OneAPI spec and reconcile payments plan"
```

---

### Task 1: Database migration — `ozow` gateway, `failed` status, shared types

**Files:**
- Create: `supabase/migrations/20260706000015_ozow_payments.sql`
- Modify: `packages/types/src/payment.ts`

**Interfaces:**
- Produces: `payment_gateway` enum value `'ozow'`, `payment_status` enum value `'failed'`, `Payment.paymentGateway: 'yoco' | 'peach' | 'ozow'`, `PaymentStatus` including `'failed'`. All later tasks rely on these.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260706000015_ozow_payments.sql`:

```sql
-- Ozow payments support
alter type payment_gateway add value if not exists 'ozow';
alter type payment_status add value if not exists 'failed';
```

Note: `ALTER TYPE ... ADD VALUE` is allowed inside a transaction on Postgres 12+ as long as the new value isn't used in the same transaction — this migration only adds values, so it's safe as a standalone migration file.

- [ ] **Step 2: Apply locally and verify**

```bash
supabase db reset
```

Expected: all 15 migrations apply without error. Then verify:

```bash
supabase db diff --schema public   # expected: no diff
psql "$(supabase status --output json | jq -r '.DB_URL // empty')" -c "select unnest(enum_range(null::payment_status));" 2>/dev/null || echo "verify via supabase studio: payment_status contains 'failed'"
```

(If not running the local stack, apply to the remote project instead with `supabase db push` after review.)

- [ ] **Step 3: Update the shared Payment types**

In `packages/types/src/payment.ts` replace lines 1–6 and line 23:

```ts
export type PaymentStatus =
  | 'pending'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'disputed'
  | 'failed';
```

```ts
  paymentGateway: 'yoco' | 'peach' | 'ozow';
```

- [ ] **Step 4: Typecheck the workspace**

```bash
npm run build --workspace=packages/types 2>/dev/null || npx tsc -p packages/types --noEmit
```

Expected: PASS (no type errors).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260706000015_ozow_payments.sql packages/types/src/payment.ts
git commit -m "feat(payments): add ozow gateway and failed status to schema and types"
```

---

### Task 2: Shared Ozow module (hash + API client) with Deno tests

**Files:**
- Create: `supabase/functions/_shared/ozow.ts`
- Create: `supabase/functions/_shared/ozow.test.ts`
- Create: `supabase/functions/_shared/cors.ts`

**Interfaces:**
- Produces (consumed by Tasks 3 & 4):
  - `interface OzowPaymentRequest { siteCode; countryCode; currencyCode; amount; transactionReference; bankReference; cancelUrl; errorUrl; successUrl; notifyUrl; isTest }` (all `string` except `isTest: boolean`)
  - `generateRequestHash(req: OzowPaymentRequest, privateKey: string): Promise<string>`
  - `verifyNotificationHash(fields: Record<string, string>, privateKey: string): Promise<boolean>`
  - `requestPaymentUrl(req: OzowPaymentRequest, privateKey: string, apiKey: string): Promise<string>` — returns the Ozow redirect URL or throws
  - `getTransaction(siteCode: string, transactionId: string, apiKey: string): Promise<{ status: string; amount: number }>`
  - `corsHeaders` from `cors.ts`

- [ ] **Step 1: Write the failing hash tests**

Create `supabase/functions/_shared/ozow.test.ts`:

```ts
import { assertEquals } from 'jsr:@std/assert';
import { generateRequestHash, verifyNotificationHash } from './ozow.ts';

// Ozow public test credentials
const PRIVATE_KEY = '215114531AFF7134A94C88CEEA48E';

Deno.test('generateRequestHash concatenates fields in order, lowercases, sha512s', async () => {
  const hash = await generateRequestHash(
    {
      siteCode: 'TSTSTE0001',
      countryCode: 'ZA',
      currencyCode: 'ZAR',
      amount: '25.01',
      transactionReference: 'ONS-TESTREF',
      bankReference: 'OnServe',
      cancelUrl: 'https://example.com/cancel',
      errorUrl: 'https://example.com/error',
      successUrl: 'https://example.com/success',
      notifyUrl: 'https://example.com/notify',
      isTest: true,
    },
    PRIVATE_KEY,
  );
  // Precomputed: sha512(lowercase("TSTSTE0001ZAZAR25.01ONS-TESTREFOnServe
  // https://example.com/cancel…https://example.com/notifytrue" + PRIVATE_KEY))
  assertEquals(
    hash,
    'aab3dedeb1d6e14b0c3343913972490c37056ec607d1343e11748b87e7ecd63d7bdb609c3cd05a2bc5f8dc138d9911205dc4986f7e446e2db0492c36870217f4',
  );
});

Deno.test('verifyNotificationHash accepts a valid notification', async () => {
  const fields = {
    SiteCode: 'TSTSTE0001',
    TransactionId: '1cd47b26-9d24-4b1d-a1b0-6b7c9e1a2f3b',
    TransactionReference: 'ONS-TESTREF',
    Amount: '25.01',
    Status: 'Complete',
    CurrencyCode: 'ZAR',
    IsTest: 'true',
    StatusMessage: 'Test transaction completed',
    Hash: 'beea3fcf3790e12e9889e3bf5b6988c38609f6214dffd20ea16143e870256e1d8283445f21a1d5ab92677bcb5e0cde52ff48836f2c76b49833241d98e9f5074a',
  };
  assertEquals(await verifyNotificationHash(fields, PRIVATE_KEY), true);
});

Deno.test('verifyNotificationHash rejects a tampered amount', async () => {
  const fields = {
    SiteCode: 'TSTSTE0001',
    TransactionId: '1cd47b26-9d24-4b1d-a1b0-6b7c9e1a2f3b',
    TransactionReference: 'ONS-TESTREF',
    Amount: '9999.99',
    Status: 'Complete',
    CurrencyCode: 'ZAR',
    IsTest: 'true',
    StatusMessage: 'Test transaction completed',
    Hash: 'beea3fcf3790e12e9889e3bf5b6988c38609f6214dffd20ea16143e870256e1d8283445f21a1d5ab92677bcb5e0cde52ff48836f2c76b49833241d98e9f5074a',
  };
  assertEquals(await verifyNotificationHash(fields, PRIVATE_KEY), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
deno test supabase/functions/_shared/ozow.test.ts
```

Expected: FAIL — `Module not found ... ozow.ts`. (If `deno` isn't installed: `brew install deno`.)

- [ ] **Step 3: Implement the module**

Create `supabase/functions/_shared/ozow.ts`:

```ts
// Ozow API integration: hash generation/verification and REST calls.
// Field order in hashes is mandated by Ozow — do not reorder.
// Verify request/response shapes against docs/OneAPI.yaml (see plan Task 0).

const OZOW_API_BASE = 'https://api.ozow.com';

export interface OzowPaymentRequest {
  siteCode: string;
  countryCode: string;
  currencyCode: string;
  amount: string; // "150.00" — exactly 2 decimals
  transactionReference: string;
  bankReference: string; // max 20 chars, shows on bank statement
  cancelUrl: string;
  errorUrl: string;
  successUrl: string;
  notifyUrl: string;
  isTest: boolean;
}

async function sha512LowercaseHex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-512',
    new TextEncoder().encode(input.toLowerCase()),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateRequestHash(
  req: OzowPaymentRequest,
  privateKey: string,
): Promise<string> {
  const concatenated =
    req.siteCode +
    req.countryCode +
    req.currencyCode +
    req.amount +
    req.transactionReference +
    req.bankReference +
    req.cancelUrl +
    req.errorUrl +
    req.successUrl +
    req.notifyUrl +
    String(req.isTest) +
    privateKey;
  return sha512LowercaseHex(concatenated);
}

// Ozow-mandated field order for notification/response hash verification.
const NOTIFICATION_HASH_ORDER = [
  'SiteCode',
  'TransactionId',
  'TransactionReference',
  'Amount',
  'Status',
  'Optional1',
  'Optional2',
  'Optional3',
  'Optional4',
  'Optional5',
  'CurrencyCode',
  'IsTest',
  'StatusMessage',
] as const;

export async function verifyNotificationHash(
  fields: Record<string, string>,
  privateKey: string,
): Promise<boolean> {
  const concatenated =
    NOTIFICATION_HASH_ORDER.map((k) => fields[k] ?? '').join('') + privateKey;
  const expected = await sha512LowercaseHex(concatenated);
  const received = (fields['Hash'] ?? '').toLowerCase();
  return expected === received;
}

export async function requestPaymentUrl(
  req: OzowPaymentRequest,
  privateKey: string,
  apiKey: string,
): Promise<string> {
  const hashCheck = await generateRequestHash(req, privateKey);
  const res = await fetch(`${OZOW_API_BASE}/PostPaymentRequest`, {
    method: 'POST',
    headers: {
      ApiKey: apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...req, hashCheck }),
  });
  if (!res.ok) {
    throw new Error(`Ozow PostPaymentRequest failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    paymentRequestId?: string;
    url?: string;
    errorMessage?: string | null;
  };
  if (body.errorMessage || !body.url) {
    throw new Error(`Ozow rejected payment request: ${body.errorMessage ?? 'no url returned'}`);
  }
  return body.url;
}

export async function getTransaction(
  siteCode: string,
  transactionId: string,
  apiKey: string,
): Promise<{ status: string; amount: number }> {
  const params = new URLSearchParams({ siteCode, transactionId });
  const res = await fetch(`${OZOW_API_BASE}/GetTransaction?${params}`, {
    headers: { ApiKey: apiKey, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Ozow GetTransaction failed: HTTP ${res.status}`);
  }
  const tx = (await res.json()) as { status: string; amount: number };
  return { status: tx.status, amount: tx.amount };
}
```

Create `supabase/functions/_shared/cors.ts`:

```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
deno test supabase/functions/_shared/ozow.test.ts
```

Expected: `ok | 3 passed | 0 failed`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/
git commit -m "feat(payments): add shared Ozow hash and API client module"
```

---

### Task 3: `ozow-create-payment` edge function

**Files:**
- Create: `supabase/functions/ozow-create-payment/index.ts`

**Interfaces:**
- Consumes: `requestPaymentUrl`, `OzowPaymentRequest`, `corsHeaders` from Task 2.
- Produces: `POST /functions/v1/ozow-create-payment` with body `{ bookingId: string }` (JWT required) → `200 { url: string }` | `4xx { error: string }`. Creates/updates a `payments` row with `status='pending'`, `payment_gateway='ozow'`, `gateway_reference=<unique tx ref>`.

- [ ] **Step 1: Write the function**

Create `supabase/functions/ozow-create-payment/index.ts`:

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requestPaymentUrl, type OzowPaymentRequest } from '../_shared/ozow.ts';
import { corsHeaders } from '../_shared/cors.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !user) return json(401, { error: 'Not authenticated' });

  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) return json(400, { error: 'bookingId is required' });

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id, customer_id, status, total_amount')
    .eq('id', bookingId)
    .single();
  if (bookingError || !booking) return json(404, { error: 'Booking not found' });
  if (booking.customer_id !== user.id) return json(403, { error: 'Not your booking' });
  if (booking.status === 'cancelled') return json(409, { error: 'Booking is cancelled' });

  const { data: existing } = await admin
    .from('payments')
    .select('id, status')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (existing && !['pending', 'failed'].includes(existing.status)) {
    return json(409, { error: `Booking already has a ${existing.status} payment` });
  }

  // Amount is computed server-side from the booking — never trusted from the client.
  const amount = Number(booking.total_amount).toFixed(2);
  const transactionReference = `ONS-${bookingId.slice(0, 8)}-${Date.now()}`;

  const paymentRow = {
    booking_id: bookingId,
    customer_id: user.id,
    amount: booking.total_amount,
    status: 'pending',
    payment_gateway: 'ozow',
    gateway_reference: transactionReference,
  };
  const { error: upsertError } = existing
    ? await admin.from('payments').update(paymentRow).eq('id', existing.id)
    : await admin.from('payments').insert(paymentRow);
  if (upsertError) return json(500, { error: upsertError.message });

  const webAppUrl = Deno.env.get('WEB_APP_URL')!; // e.g. https://onserve.vercel.app
  const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ozow-webhook`;
  const resultUrl = (outcome: string) =>
    `${webAppUrl}/payment/result?bookingId=${bookingId}&outcome=${outcome}`;

  const ozowRequest: OzowPaymentRequest = {
    siteCode: Deno.env.get('OZOW_SITE_CODE')!,
    countryCode: 'ZA',
    currencyCode: 'ZAR',
    amount,
    transactionReference,
    bankReference: 'ONSERVE',
    cancelUrl: resultUrl('cancel'),
    errorUrl: resultUrl('error'),
    successUrl: resultUrl('success'),
    notifyUrl,
    isTest: Deno.env.get('OZOW_IS_TEST') === 'true',
  };

  try {
    const url = await requestPaymentUrl(
      ozowRequest,
      Deno.env.get('OZOW_PRIVATE_KEY')!,
      Deno.env.get('OZOW_API_KEY')!,
    );
    return json(200, { url });
  } catch (e) {
    return json(502, { error: e instanceof Error ? e.message : 'Ozow request failed' });
  }
});
```

- [ ] **Step 2: Create local env file for serving functions**

Create `supabase/functions/.env` (git-ignored — check `.gitignore` covers it, add `supabase/functions/.env` if not):

```
OZOW_SITE_CODE=TSTSTE0001
OZOW_PRIVATE_KEY=215114531AFF7134A94C88CEEA48E
OZOW_API_KEY=EB5758F2C3B4DF3FF4F2669D5FF5B
OZOW_IS_TEST=true
WEB_APP_URL=http://localhost:5173
```

- [ ] **Step 3: Serve and smoke-test locally**

```bash
supabase start
supabase functions serve --env-file supabase/functions/.env
```

In a second terminal, sign in via the running web app (or Supabase Studio) to grab a user JWT and a real booking id, then:

```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/ozow-create-payment \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"<BOOKING_ID>"}'
```

Expected: `{"url":"https://pay.ozow.com/..."}` and a `payments` row with `status='pending'`, `payment_gateway='ozow'` visible in Studio. Also verify a bad booking id returns `404` and a missing JWT returns `401`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ozow-create-payment/ .gitignore
git commit -m "feat(payments): add ozow-create-payment edge function"
```

---

### Task 4: `ozow-webhook` edge function

**Files:**
- Create: `supabase/functions/ozow-webhook/index.ts`
- Modify: `supabase/config.toml` (add function config block at the end)

**Interfaces:**
- Consumes: `verifyNotificationHash`, `getTransaction` from Task 2.
- Produces: `POST /functions/v1/ozow-webhook` (public, form-encoded body from Ozow). Settles the `payments` row matched by `gateway_reference == TransactionReference`: `Complete` → `status='escrowed'`, `escrowed_at=now()`, `gateway_transaction_id=TransactionId`; `Cancelled`/`Error`/`Abandoned` → `status='failed'`. Inserts a `notifications` row for the customer. Always returns `200 "OK"` on handled requests so Ozow stops retrying.

- [ ] **Step 1: Write the function**

Create `supabase/functions/ozow-webhook/index.ts`:

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyNotificationHash, getTransaction } from '../_shared/ozow.ts';

const FINAL_FAILURE_STATUSES = ['Cancelled', 'Error', 'Abandoned'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const form = await req.formData();
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) fields[key] = String(value);

  const privateKey = Deno.env.get('OZOW_PRIVATE_KEY')!;
  if (!(await verifyNotificationHash(fields, privateKey))) {
    console.error('ozow-webhook: hash verification failed', fields['TransactionReference']);
    return new Response('Invalid hash', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const txRef = fields['TransactionReference'];
  const { data: payment } = await admin
    .from('payments')
    .select('id, customer_id, amount, status')
    .eq('gateway_reference', txRef)
    .maybeSingle();
  if (!payment) {
    console.error('ozow-webhook: no payment for reference', txRef);
    return new Response('Unknown reference', { status: 404 });
  }
  // Idempotency: webhook may be delivered more than once.
  if (payment.status !== 'pending') return new Response('OK', { status: 200 });

  const status = fields['Status'];

  if (status === 'Complete') {
    // Defense in depth: confirm status and amount with Ozow directly.
    const tx = await getTransaction(
      Deno.env.get('OZOW_SITE_CODE')!,
      fields['TransactionId'],
      Deno.env.get('OZOW_API_KEY')!,
    );
    if (tx.status !== 'Complete' || Number(tx.amount).toFixed(2) !== Number(payment.amount).toFixed(2)) {
      console.error('ozow-webhook: GetTransaction mismatch', { txRef, tx });
      return new Response('Verification mismatch', { status: 409 });
    }

    const { error } = await admin
      .from('payments')
      .update({
        status: 'escrowed',
        escrowed_at: new Date().toISOString(),
        gateway_transaction_id: fields['TransactionId'],
      })
      .eq('id', payment.id);
    if (error) return new Response(error.message, { status: 500 });

    await admin.from('notifications').insert({
      user_id: payment.customer_id,
      title: 'Payment received',
      body: `Your payment of R ${Number(payment.amount).toFixed(2)} is held in escrow until the job is complete.`,
      type: 'payment',
      metadata: { paymentId: payment.id },
    });
  } else if (FINAL_FAILURE_STATUSES.includes(status)) {
    const { error } = await admin
      .from('payments')
      .update({
        status: 'failed',
        gateway_transaction_id: fields['TransactionId'],
      })
      .eq('id', payment.id);
    if (error) return new Response(error.message, { status: 500 });
  }
  // 'Pending' / 'PendingInvestigation': leave as pending; Ozow notifies again.

  return new Response('OK', { status: 200 });
});
```

- [ ] **Step 2: Disable JWT verification for the webhook**

Append to `supabase/config.toml`:

```toml
[functions.ozow-webhook]
verify_jwt = false
```

(Ozow authenticates via the SHA-512 hash, not a Supabase JWT.)

- [ ] **Step 3: Smoke-test locally with a hand-signed notification**

With `supabase functions serve --env-file supabase/functions/.env` running and a `payments` row from Task 3's smoke test (note its `gateway_reference`), compute the hash and post. The failure path avoids the `GetTransaction` network call, so test that first:

```bash
REF="<gateway_reference from the payments row>"
TXID="11111111-2222-3333-4444-555555555555"
AMOUNT="<payments.amount with 2 decimals>"
PK="215114531AFF7134A94C88CEEA48E"
HASH=$(printf '%s' "TSTSTE0001${TXID}${REF}${AMOUNT}CancelledZARtrueUser cancelled${PK}" | tr '[:upper:]' '[:lower:]' | shasum -a 512 | cut -d' ' -f1)
curl -s -X POST http://127.0.0.1:54321/functions/v1/ozow-webhook \
  -d "SiteCode=TSTSTE0001&TransactionId=${TXID}&TransactionReference=${REF}&Amount=${AMOUNT}&Status=Cancelled&CurrencyCode=ZAR&IsTest=true&StatusMessage=User cancelled&Hash=${HASH}"
```

Expected: `OK`, and the payments row now has `status='failed'`. Also verify: posting the same body again returns `OK` without changes (idempotent), and posting with a wrong hash returns `Invalid hash` (400). The `Complete` path is exercised end-to-end in Task 8 against Ozow's staging.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ozow-webhook/ supabase/config.toml
git commit -m "feat(payments): add ozow-webhook edge function for payment notifications"
```

---

### Task 5: Web payments feature module (service + hooks)

**Files:**
- Create: `apps/web/src/features/payments/services/paymentService.ts`
- Create: `apps/web/src/features/payments/services/paymentService.test.ts`
- Create: `apps/web/src/features/payments/hooks/usePayments.ts`
- Modify: `apps/web/src/test/mockSupabase.ts` (add `functions.invoke` to the mock)

**Interfaces:**
- Consumes: `POST ozow-create-payment` → `{ url }` (Task 3); `payments` table readable by the customer via existing RLS (`payments_select_participant`).
- Produces (consumed by Tasks 6 & 7):
  - `createOzowPayment(bookingId: string): Promise<{ url: string }>`
  - `getPaymentByBookingId(bookingId: string): Promise<Payment | null>`
  - `useCreateOzowPayment(): UseMutationResult<{ url: string }, Error, string>`
  - `usePaymentForBooking(bookingId: string | undefined, opts?: { poll?: boolean })`

- [ ] **Step 1: Extend the supabase mock with `functions.invoke`**

In `apps/web/src/test/mockSupabase.ts`, inside the `mock` object in `makeSupabaseMock()` (after the `auth` block):

```ts
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
```

- [ ] **Step 2: Write the failing service tests**

Create `apps/web/src/features/payments/services/paymentService.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/features/payments/services/paymentService.test.ts
```

Expected: FAIL — cannot resolve `./paymentService`.

- [ ] **Step 4: Implement the service**

Create `apps/web/src/features/payments/services/paymentService.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { Payment } from '@onserve/types';

function mapRow(r: Record<string, unknown>): Payment {
  return {
    id: r['id'] as string,
    bookingId: r['booking_id'] as string,
    customerId: r['customer_id'] as string,
    amount: r['amount'] as number,
    depositAmount: r['deposit_amount'] as number,
    balanceAmount: r['balance_amount'] as number,
    status: r['status'] as Payment['status'],
    paymentGateway: r['payment_gateway'] as Payment['paymentGateway'],
    gatewayTransactionId: r['gateway_transaction_id'] as string | null,
    gatewayReference: r['gateway_reference'] as string | null,
    escrowedAt: r['escrowed_at'] as string | null,
    releasedAt: r['released_at'] as string | null,
    createdAt: r['created_at'] as string,
  };
}

export async function createOzowPayment(bookingId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('ozow-create-payment', {
    body: { bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { url: string };
}

export async function getPaymentByBookingId(bookingId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/features/payments/services/paymentService.test.ts
```

Expected: 4 passed.

- [ ] **Step 6: Add the hooks**

Create `apps/web/src/features/payments/hooks/usePayments.ts`:

```ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { createOzowPayment, getPaymentByBookingId } from '../services/paymentService';

export function useCreateOzowPayment() {
  return useMutation({
    mutationFn: (bookingId: string) => createOzowPayment(bookingId),
  });
}

// poll: refetch every 3s while the webhook settles the payment (result page).
export function usePaymentForBooking(
  bookingId: string | undefined,
  opts: { poll?: boolean } = {},
) {
  return useQuery({
    queryKey: ['payment', bookingId],
    queryFn: () => getPaymentByBookingId(bookingId!),
    enabled: !!bookingId,
    refetchInterval: opts.poll
      ? (query) => (query.state.data?.status === 'pending' || !query.state.data ? 3000 : false)
      : false,
  });
}
```

- [ ] **Step 7: Run the full web test suite and typecheck**

```bash
cd apps/web && npx vitest run && npx tsc -p tsconfig.app.json --noEmit
```

Expected: all tests pass, no type errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/payments/ apps/web/src/test/mockSupabase.ts
git commit -m "feat(web): add payments feature module with Ozow service and hooks"
```

---

### Task 6: PaymentPage — real Ozow redirect

**Files:**
- Modify: `apps/web/src/pages/customer/PaymentPage.tsx`

**Interfaces:**
- Consumes: `useCreateOzowPayment` from Task 5.

- [ ] **Step 1: Replace the mock confirm with the Ozow redirect**

In `apps/web/src/pages/customer/PaymentPage.tsx`:

Replace the imports of `useBookings`/`notify` block (lines 7–9) with:

```tsx
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { useCreateOzowPayment } from '@/features/payments/hooks/usePayments';
import { LoadingState } from '@/components/common';
import { notify } from '@/lib/notify';
```

Replace `handleConfirm` (lines 24–35) with:

```tsx
  const createPayment = useCreateOzowPayment();

  // The booking is created earlier in the wizard (BookingPage). Payment happens
  // via Ozow redirect; the webhook settles the payments row and the result page
  // (/payment/result) polls for it.
  function handlePay() {
    if (!bookingId) {
      notify.error('No booking to pay for');
      navigate('/bookings', { replace: true });
      return;
    }
    createPayment.mutate(bookingId, {
      onSuccess: ({ url }) => {
        window.location.assign(url);
      },
      onError: (error) => {
        notify.error(error.message || 'Could not start payment');
      },
    });
  }
```

Replace the confirm button (lines 130–132) with:

```tsx
              <Button
                className="w-full"
                size="lg"
                onClick={handlePay}
                disabled={createPayment.isPending}
              >
                {createPayment.isPending ? 'Redirecting to Ozow…' : `Pay R ${total} with Ozow`}
              </Button>
```

Replace the footer copy (lines 134–136) with:

```tsx
              <p className="text-xs text-muted-foreground text-center">
                Secured by Ozow instant EFT · Payment held in escrow until job completion
              </p>
```

- [ ] **Step 2: Verify build and tests**

```bash
cd apps/web && npx tsc -p tsconfig.app.json --noEmit && npx vitest run
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/customer/PaymentPage.tsx
git commit -m "feat(web): PaymentPage initiates real Ozow payment redirect"
```

---

### Task 7: PaymentResultPage + route

**Files:**
- Create: `apps/web/src/pages/customer/PaymentResultPage.tsx`
- Modify: `apps/web/src/router/index.tsx` (import + one route next to line 115)

**Interfaces:**
- Consumes: `usePaymentForBooking(bookingId, { poll: true })` from Task 5. URL contract from Task 3: `/payment/result?bookingId=<id>&outcome=success|cancel|error`.

- [ ] **Step 1: Write the result page**

Create `apps/web/src/pages/customer/PaymentResultPage.tsx`:

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingState } from '@/components/common';
import { usePaymentForBooking } from '@/features/payments/hooks/usePayments';

// Landing page for Ozow's Success/Cancel/Error redirects. The redirect itself
// is untrusted — the payments row (settled by the ozow-webhook edge function)
// is the source of truth, so we poll it until it leaves 'pending'.
export function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId') ?? undefined;

  const { data: payment } = usePaymentForBooking(bookingId, { poll: true });

  if (!bookingId) {
    navigate('/bookings', { replace: true });
    return null;
  }

  if (!payment || payment.status === 'pending') {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto py-16">
          <LoadingState label="Confirming your payment with Ozow…" />
          <p className="text-xs text-muted-foreground text-center mt-4">
            This usually takes a few seconds. Don't close this page.
          </p>
        </div>
      </PageLayout>
    );
  }

  const succeeded = payment.status !== 'failed';

  return (
    <PageLayout>
      <div className="max-w-md mx-auto py-16 flex flex-col items-center gap-4 text-center">
        {succeeded ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Payment received</h1>
            <p className="text-sm text-muted-foreground">
              R {payment.amount} is held in escrow and will be released to the provider once
              you approve the completed job.
            </p>
            <Button className="w-full" size="lg" onClick={() => navigate(`/bookings/${bookingId}`, { replace: true })}>
              View booking
            </Button>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-destructive" />
            <h1 className="text-2xl font-semibold text-foreground">Payment not completed</h1>
            <p className="text-sm text-muted-foreground">
              Your payment was cancelled or failed. No money has been taken — you can try again.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate('/payment', { state: { bookingId }, replace: true })}
            >
              Try again
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/bookings', { replace: true })}>
              Back to bookings
            </Button>
          </>
        )}
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 2: Register the route**

In `apps/web/src/router/index.tsx`, next to the `PaymentPage` import (line 23):

```tsx
import { PaymentResultPage } from '@/pages/customer/PaymentResultPage';
```

Next to the `/payment` route (line 115):

```tsx
  { path: '/payment/result', element: auth(<PaymentResultPage />) },
```

- [ ] **Step 3: Verify build and manual flow**

```bash
cd apps/web && npx tsc -p tsconfig.app.json --noEmit && npx vitest run && npm run build
```

Expected: PASS. Then run the dev app + `supabase functions serve` and walk the flow: create a booking → PaymentPage → "Pay with Ozow" → complete/cancel on Ozow's test page → land on `/payment/result` → status resolves via polling.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/customer/PaymentResultPage.tsx apps/web/src/router/index.tsx
git commit -m "feat(web): add payment result page polling webhook-settled status"
```

---

### Task 8: Secrets, deployment, and end-to-end verification

**Files:**
- Modify: `apps/web/README.md` or `docs/` (document required secrets)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Set Supabase secrets (staging first)**

```bash
supabase secrets set \
  OZOW_SITE_CODE=TSTSTE0001 \
  OZOW_PRIVATE_KEY=215114531AFF7134A94C88CEEA48E \
  OZOW_API_KEY=EB5758F2C3B4DF3FF4F2669D5FF5B \
  OZOW_IS_TEST=true \
  WEB_APP_URL=https://<your-vercel-domain>
```

- [ ] **Step 2: Deploy migration and functions**

```bash
supabase db push
supabase functions deploy ozow-create-payment
supabase functions deploy ozow-webhook --no-verify-jwt
```

Expected: both functions listed by `supabase functions list`.

- [ ] **Step 3: End-to-end test on the deployed app**

Walk the full flow on the deployed web app with `OZOW_IS_TEST=true`: book → pay → Ozow test bank screen → complete. Verify in Supabase Studio: `payments.status='escrowed'`, `gateway_transaction_id` set, a `notifications` row of type `payment` exists. Repeat with a cancelled payment → `status='failed'` and the result page offers retry. Check webhook logs: `supabase functions logs ozow-webhook`.

- [ ] **Step 4: Document the secrets and go-live checklist**

Add to `apps/web/README.md` (or `docs/payments.md`):

```markdown
## Payments (Ozow)

Edge function secrets (set via `supabase secrets set`):
- `OZOW_SITE_CODE`, `OZOW_PRIVATE_KEY`, `OZOW_API_KEY` — from dash.ozow.com → Merchant Details
- `OZOW_IS_TEST` — `true` everywhere except production
- `WEB_APP_URL` — the deployed SPA origin (used to build redirect URLs)

Go-live checklist:
1. Replace test credentials with live merchant credentials; set `OZOW_IS_TEST=false`.
2. Confirm the site's SuccessUrl/NotifyUrl domains are registered with Ozow if required by the merchant profile.
3. Run one real R 1.00 transaction and verify escrow + webhook logs.
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/README.md
git commit -m "docs(payments): document Ozow secrets and go-live checklist"
```

---

## Out of scope (deliberately)

- **Provider payouts / escrow release money movement.** Ozow's standard product is pay-in only. `JobCompletePage` "release" and admin dispute resolution keep updating the ledger (`payments.status` → `released`/`refunded` via admin RLS), but actual disbursement to providers (Ozow Payouts or manual EFT) is a separate project.
- **Refunds via API.** Failed disputes resolved for the customer are marked `refunded` in the ledger; the actual refund is manual until Ozow refunds API access is arranged.
- **Mobile app (Expo).** The same edge functions will serve it later (open Ozow URL in an in-app browser); nothing here blocks that.
- **Yoco/Peach.** The `payment_gateway` enum keeps them; nothing is removed.
- **Quote-based booking payment entry.** Today `QuoteReviewPage` navigates straight to `/bookings` after accepting a quote — it never passes through `/payment`. Once this plan lands, routing quote-accepted bookings to `/payment` with `{ state: { bookingId } }` is a one-line follow-up in `QuoteReviewPage.tsx`; the payment stack built here already supports it.
