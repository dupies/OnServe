# OnServe Superpowers Documentation Summary

**Generated:** 2026-06-17  
**Directory:** `/Users/medupiramaboea/Projects/OnServe/docs/superpowers`

---

## 📋 Overview

Three major implementation specifications/plans for OnServe, organized by feature set and phase:

1. **Phase 3 — Ozow Payment Integration** (Complete spec, ready to implement)
2. **Flow Improvements + Admin User Management** (Plan + design, ready to implement)

All are web-app focused. Combined scope spans 50+ implementation tasks across database, backend, and frontend layers.

---

## 🔹 1. Phase 3 — Ozow Payment Integration

**File:** `specs/onserve-phase3-ozow-spec.md`  
**Status:** Complete specification, implementation in progress (agents deployed)  
**Scope:** Payment gateway integration + escrow + provider payouts  

### Key Deliverables

#### Architecture
- **Escrow Model:** Application-level (funds in Ozow float), not gateway-level
- **Money Flow:** Customer pays R502.43 → Ozow float → provider gets R450 + OnServe keeps R45 commission + R7.43 transaction fee
- **Fee Structure:** 10% platform commission (up from earlier 5%), 1.5% Ozow EFT fee (min R1)

#### Database (Migration 009)
- **Payments table:** Add platform_fee, transaction_fee, provider_payout, ozow_transaction_id, ozow_payout_id, payout_failed_reason, payout_at
- **Provider profiles:** Add bank_name, bank_account_number (encrypted), bank_branch_code, bank_account_type (enum: cheque|savings), bank_verified
- **Indexes:** booking_id lookup, escrowed-pending-release for cron

#### Shared Packages
- **`packages/types/src/payment.ts`:** PaymentGateway, PaymentStatus (pending, escrowed, released, refunded, disputed, cancelled), FeeBreakdown, PaymentRecord, OzowNotification, OzowTransactionStatus
- **`packages/shared/src/fees.ts`:** calculateFees(servicePrice) with R450→R502.43 verification, PLATFORM_FEE_RATE (10%), OZOW_EFT_FEE_RATE (1.5%), OZOW_MIN_FEE (R1)
- **`packages/shared/src/ozow.ts`:** SHA-512 hash generation/verification using Web Crypto API (Deno + browser compatible)

#### Edge Functions (5 total, 519 lines)
1. **create-payment** — Calculate fees, create payment record, call Ozow PostPaymentRequest API, return payment URL
2. **ozow-webhook** — Verify webhook hash, update payment/booking status (Complete→escrowed, Error/Cancelled/Abandoned→cancelled), create notifications
3. **release-payment** — Trigger Ozow Payout to provider bank account (⚠️ pending 10 Ozow sales questions)
4. **auto-release-cron** — Auto-release escrowed payments 48h+ old (excluding disputes)
5. **_shared/config.ts** — Environment variables (OZOW_SITE_CODE, OZOW_PRIVATE_KEY, OZOW_API_KEY, etc.)

#### Frontend
- **Service:** `features/payments/services/paymentService.ts` — createPayment, getPaymentByBooking, releasePayment, bank details CRUD
- **Hooks (5):** useCreatePayment, useGetPayment, useReleasePayment, useGetBankDetails, useSaveBankDetails (all React Query wrapped)
- **Pages (5):** PaymentCheckoutPage (fee breakdown), PaymentSuccessPage (status polling), PaymentCancelPage, PaymentErrorPage, BankDetailsPage (bank account form with 8 SA banks + universal branch codes)
- **Routes:** /payment/checkout/:bookingId, /payment/success, /payment/cancel, /payment/error, /provider/bank-details

#### Testing
- **Unit tests:** Fee calculation (R450 example verified), Ozow hashing (SHA-512 + tamper detection)
- **Integration tests:** Edge functions (create-payment, ozow-webhook, release-payment, auto-release-cron), frontend services, payment flows
- **Total:** 169 tests across 7 test files, all passing

### Critical Blockers

**10 Ozow Sales Questions** (must answer before finalizing release-payment):
1. Exact Payout API endpoint URL + auth header format (ApiKey vs AccessToken)
2. Float vs pre-funded wallet model for payouts
3. Exact payout JSON payload fields
4. Payout webhook availability for completion confirmation
5. Real-time clearance (RTC) availability + time windows
6. Account verification service (AVS) API availability
7. Marketplace classification under TPPP license
8. Programmatic refund API
9. Per-payout fees + volume pricing
10. Sandbox payout testing support

**Implementation Status:**
- ✅ Database migration created (not yet applied)
- ✅ Shared types exported
- ✅ Fee calculation (verified with R450 example)
- ✅ All 5 Edge Functions implemented
- ✅ Frontend pages + hooks complete
- ✅ Comprehensive test suite (169 tests)
- ⚠️ release-payment function marked pending Ozow answers

### Next Steps
1. Apply database migration 009
2. Contact Ozow sales with 10 blocker questions
3. Once answered: update release-payment function
4. Set Supabase secrets (OZOW_*) 
5. End-to-end test in Ozow sandbox
6. Legal review: TPPP classification

---

## 🔹 2. Flow Improvements + Admin User Management

**Files:** 
- `plans/2026-06-15-flows-and-admin-user-management.md` (12-task implementation plan)
- `specs/2026-06-15-flows-and-admin-user-management-design.md` (design spec)

**Status:** Plan complete, ready for implementation  
**Scope:** Web app UX polish + admin tooling  

### Two Work Streams

#### A. Flow Improvements
**Goal:** Reduce friction, connect broken handoffs, cross-cutting UX polish

**Tasks:**
1. **Replace payment dead-end** — Current: fake setTimeout mock. New: call real booking-create mutation, toast success, navigate to booking detail
2. **Booking + quote + onboarding flows** — Add LoadingState/EmptyState/ErrorState, success toasts, form validation, back buttons
3. **List-page polish** — LoadingState/EmptyState/ErrorState on all list pages; optimistic notification read-marking with rollback

**Files Modified:**
- `apps/web/src/pages/customer/PaymentPage.tsx`
- `apps/web/src/pages/customer/BookingPage.tsx`
- `apps/web/src/pages/customer/QuoteReviewPage.tsx`
- `apps/web/src/pages/provider/ProviderOnboardingPage.tsx`
- `apps/web/src/pages/customer/BookingsListPage.tsx`
- `apps/web/src/pages/customer/QuoteRequestsListPage.tsx`
- `apps/web/src/pages/customer/NotificationsPage.tsx`
- `apps/web/src/pages/provider/JobBoardPage.tsx`

#### B. Admin User Management
**Goal:** Upgrade from basic users list to full admin toolset

**Substreams:**

1. **User Detail Page + Account Actions**
   - Route `/admin/users/:id` → new `AdminUserDetailPage`
   - Show: profile, bookings, disputes, ratings, activity
   - Actions: Suspend (with reason), Reactivate, Ban (with reason)
   - Account status badge (green/amber/red) on list + detail
   
2. **Provider KYC Review Queue**
   - Route `/admin/verifications`
   - Pending provider profiles card list (name, bio, ID doc thumbnail, submitted date)
   - Approve / Reject buttons with confirmation dialog
   
3. **Admin Dashboard Metrics**
   - Stats cards: total users, customers, providers, new signups (7d), pending verifications, open disputes
   - Link pending verifications card to `/admin/verifications`

### Foundation (Serial, Phase 0)

All parallel work depends on these:

**Task 1: Common UI Primitives** (`apps/web/src/components/common/`)
- `LoadingState.tsx` — Spinner + optional label
- `EmptyState.tsx` — Icon + title + description + optional CTA
- `ErrorState.tsx` — Alert icon + message + retry callback
- `ConfirmDialog.tsx` — Wraps existing dialog.tsx, used for destructive actions
- Barrel export `index.ts`

**Task 2: Toast Helper** (`apps/web/src/lib/notify.ts`)
- `notify.success(msg)`, `notify.error(err)`, `notify.info(msg)`
- Wraps Sonner toast library
- Normalizes Error/string inputs

**Task 3: Global Query Error Handler** (modify `apps/web/src/lib/queryClient.ts`)
- QueryCache + MutationCache with `onError` handlers
- Surfaces unhandled errors via `notify.error` toast
- Default retry: 1, staleTime: 5 minutes

**Task 4: Account Status Migration** (`supabase/migrations/20260615000013_account_status.sql`)
- `create type account_status enum ('active', 'suspended', 'banned')`
- Add to `public.users`: account_status, suspension_reason, suspended_at
- Index on account_status
- Update `packages/types/src/user.ts` with AccountStatus type

### Admin Services (Task 8, Tested)

**Functions to implement:**
```typescript
updateUserStatus(userId, status, reason?) → void
  // Sets account_status + suspension_reason + suspended_at (or clears on active)

updateProviderVerification(providerId, status) → void
  // Sets verification_status to 'verified'|'rejected'

getAdminOverview() → AdminOverview
  // Calls admin_overview() RPC, returns totals: users, customers, providers, admins, new signups (7d), pending verifications, open disputes

getAdminUserDetail(userId) → { user, bookings, disputes, ratings }
  // Parallel fetches: users, bookings, disputes, ratings for the user
  // Includes mappers for User, Dispute
```

**Test Coverage:**
- updateUserStatus updates/clears fields correctly, throws on error
- updateProviderVerification sets status + verified_at, throws on error
- getAdminOverview calls RPC and transforms response
- getAdminUserDetail fetches all related tables and maps correctly

**RPC to create:** `public.admin_overview()` — returns jsonb with all metrics

### Implementation Phases

**Phase 0 (Serial):** Tasks 1–4 (foundation)
**Phase 1 (Parallel):**
- Stream A: Task 5–7 (flow improvements)
- Stream B: Task 8 (admin services + unit tests)
- Stream C: Tasks 9–11 (admin UI pages)
**Phase 2 (Serial):** Task 12 (typecheck, full test suite, browser smoke test)

### Current Codebase State (Verified 2026-06-15)

- Web app: 49 routes, 10 feature areas with service → hook → component layering
- `components/common/` exists but is **empty** — every page rolls its own spinner
- Sonner installed but applied inconsistently
- No central QueryClient defaults
- `public.users` has `is_verified` but **no** account_status
- `provider_profiles.verification_status` enum already exists + indexed
- Existing admin: AdminUsersPage, AdminDashboardPage, AdminDisputeDetailPage, adminService.ts
- Latest migration: 20260515000012
- Tech stack: React 18 + TypeScript (strict) + Vite + Tailwind + TanStack Query + Zustand + Supabase + Sonner + Vitest

---

## 📊 Combined Scope Summary

| Aspect | Count | Notes |
|--------|-------|-------|
| **Database Migrations** | 2 | Ozow 009 (payments+providers) + account_status 013 |
| **New Edge Functions** | 5 | Ozow pay-in, webhook, payout (pending Qs), auto-release, config |
| **New Frontend Pages** | 8 | 5 payment pages + 3 admin pages |
| **New React Hooks** | 10+ | Payment (5) + Admin queries (3+) |
| **New Services Functions** | 7+ | Payment service + Admin services (4) |
| **Tests** | 169+ | Payment unit + integration + admin unit tests |
| **UI Components** | 4 | LoadingState, EmptyState, ErrorState, ConfirmDialog |
| **Total Commits** | 15–20 | Foundation → parallel slices → integration |

---

## 🎯 Parallelization Roadmap

### Phase 1: Ozow Payment (Agents deployed)
1. ✅ Database migration + types
2. ✅ Shared utilities (fees, hashing)
3. ✅ All 5 Edge Functions
4. ✅ Frontend pages + hooks
5. ✅ Test suite (169 tests)
6. ⏳ **Blocker:** 10 Ozow sales questions

### Phase 2: Flow Improvements + Admin (Ready to start)
1. 📋 Foundation (Phase 0) — serial
   - Common UI primitives
   - Toast helper
   - Global error handler
   - account_status migration + types
2. 🚀 Parallel slices (Phase 1)
   - Stream A: Flow improvements (3 tasks)
   - Stream B: Admin services + tests (1 task)
   - Stream C: Admin UI (3 tasks)
3. ✅ Integration & verification (Phase 2) — serial

---

## 🔑 Key Decisions

### Ozow Integration
- **10% commission** (vs 5%) aligns with marketplace benchmarks (Uber 25%, SweepSouth 40%, Thumbtack 20%, Helpling 25%)
- **Application-level escrow** (funds in Ozow float, not OnServe bank account) reduces regulatory complexity
- **Web Crypto API** for hashing (works in Deno + browser, no Node.js crypto needed)
- **Async hashing** throughout (SHA-512 via crypto.subtle.digest)

### Admin UX
- **Foundation-first:** Shared UI primitives + error handler ship before admin features
- **Parallel slices:** Flow improvements, admin services, and admin UI can be built in parallel once foundation lands
- **Services pattern:** All admin functions testable with Vitest + mockSupabase

---

## 📝 Implementation Instructions

### To Start Ozow Integration
```bash
# 1. Apply database migration
supabase db push

# 2. Run tests
npm run test

# 3. Contact Ozow sales with Section 10 questions
# 4. Update release-payment once answers received
# 5. Set secrets
supabase secrets set OZOW_SITE_CODE=xxx OZOW_PRIVATE_KEY=xxx OZOW_API_KEY=xxx
```

### To Start Flow Improvements + Admin
```bash
# 1. Implement Phase 0 foundation (serial, 1 agent)
# 2. Dispatch Phase 1 parallel agents (3 streams)
# 3. Phase 2 integration & verification (serial)
# 4. Use superpowers:subagent-driven-development or superpowers:executing-plans
```

---

## 📚 Related Documentation

- **Memory:** `/Users/medupiramaboea/Projects/OnServe/.remember/remember.md` (session progress)
- **Monorepo:** Apps (web, api, mobile), Packages (types, shared, ui)
- **Database:** Supabase (PostgreSQL + RLS), migrations in `supabase/migrations/`
- **Testing:** Vitest + happy-dom + mockSupabase

---

**Last Updated:** 2026-06-17 at 22:55  
**Status:** Ready for implementation (Ozow blocked on sales Qs; Flows+Admin ready to start immediately)
