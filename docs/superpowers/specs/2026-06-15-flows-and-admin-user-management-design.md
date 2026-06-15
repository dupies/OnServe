# Flow Improvements + Admin User Management — Design

**Date:** 2026-06-15
**Scope:** Web app only (`apps/web`). Payments explicitly deferred.
**Strategy:** Foundation-first, then parallel slices (approach #2).

## Goal

Two work streams on the OnServe web app:

1. **Flow improvements** across existing user journeys (A: reduce friction, B: connect
   broken handoffs, C: cross-cutting UX polish).
2. **Admin user management** — upgrade the existing basic users list into a real
   admin toolset (detail page, account actions, provider KYC review, dashboard metrics).

Payments stay out of scope. Where the payment step is a dead-end today, we wire the
flow to a real confirmation/booking-detail destination without integrating a processor.

## Current state (verified 2026-06-15)

- Web app: 49 routes, 10 feature areas with service → hook → component layering. Real, not stubs.
- `components/common/` exists but is **empty** — every page rolls its own spinner; no shared
  empty/error/confirm primitives.
- Sonner toast is installed (`components/ui/sonner.tsx`, mounted in `App.tsx`) but applied
  inconsistently across pages.
- No central `QueryClient` defaults — hooks define queries/mutations without shared retry,
  staleTime, or error handling.
- `public.users` has `is_verified boolean` but **no account suspension status**.
- `provider_profiles.verification_status` enum (`pending`|`verified`|`rejected`) already
  exists and is indexed (`idx_provider_profiles_verification`).
- Latest migration is `20260515000012`; new migration will be `20260...000013`.
- Existing admin: `AdminUsersPage` (list + search + role filter + inline role change),
  `AdminDashboardPage`, `AdminDisputeDetailPage`, and `adminService.ts`
  (`getAdminUsers`, `updateUserRole`, dispute helpers).

## Architecture rules (must follow)

- Services pattern: Component → Hook (React Query) → Service → Supabase. No direct
  Supabase calls in components.
- TypeScript strict — no `any` without justification.
- New shared types go in `@onserve/types`; regenerate after the migration.
- Vitest unit tests for new service functions, matching existing test patterns.
- Conventional commits.

---

## Section 1 — Shared foundation (serial, lands first)

All parallel work depends on these, so they ship before fan-out.

### 1.1 Common UI primitives (`apps/web/src/components/common/`)
- `LoadingState.tsx` — spinner + optional label; replaces ad-hoc per-page spinners.
- `EmptyState.tsx` — icon + title + description + optional CTA.
- `ErrorState.tsx` — message + retry callback.
- `ConfirmDialog.tsx` — wraps existing `components/ui/dialog.tsx`; title, body, confirm/cancel,
  destructive variant. Used for suspend/ban and other destructive confirms.

### 1.2 Toast helper
- `apps/web/src/lib/notify.ts` — thin wrapper over Sonner: `notify.success(msg)`,
  `notify.error(err)` (normalizes Error/string). Standardize mutation `onError` to call it.

### 1.3 React Query defaults
- Central `QueryClient` config in `App.tsx` (or `lib/queryClient.ts`): sensible `retry`,
  `staleTime`, and a global mutation/query error handler that surfaces via `notify.error`.

### 1.4 DB migration — account status
- `supabase/migrations/20260...000013_account_status.sql`:
  - `create type account_status as enum ('active', 'suspended', 'banned');`
  - `alter table public.users add column account_status account_status not null default 'active';`
  - `add column suspension_reason text;`
  - `add column suspended_at timestamptz;`
  - index on `account_status`.
  - RLS: writes remain admin-only (consistent with existing users RLS).
- Apply to the Supabase project, then regenerate `@onserve/types` and add `accountStatus`,
  `suspensionReason`, `suspendedAt` to the `User` type + mappers.

---

## Section 2 — Flow improvements (parallel, after foundation)

### A — Reduce friction in existing journeys
- Booking wizard (`BookingPage`), provider onboarding (`ProviderOnboardingPage`),
  quote → accept → book handoff (`QuoteReviewPage` → booking).
- Apply `LoadingState`/`EmptyState`/`ErrorState`, form validation feedback, working
  back-navigation, explicit success confirmations.

### B — Connect broken handoffs
- Audit each flow for fake-data dead-ends. The payment page is the main one: instead of a
  fake 1s timeout, create the booking and route the user to a real confirmation /
  `BookingDetailPage`. **No payment processor integration.**
- Sweep for other dead-ends where a flow ends without navigating or persisting.

### C — Cross-cutting UX polish
- Consistent success/error toasts on every mutation (via `notify`).
- Loading skeletons on list/detail pages.
- Optimistic updates where safe (mark-notification-read, role change, status change).
- Redirect-after-action everywhere a mutation completes a step.

---

## Section 3 — Admin user management (parallel, after foundation)

### A — User detail page
- Route `/admin/users/:id` + `AdminUserDetailPage`.
- `getAdminUserDetail(id)` service: profile + their bookings, disputes, ratings + activity timeline.
- Link rows in `AdminUsersPage` to the detail page.

### B — Account actions
- `updateUserStatus(userId, status, reason?)` service (uses the migration columns).
- Suspend / reactivate / ban via `ConfirmDialog`; record reason + timestamp.
- Show `account_status` badge in both the list and the detail page.

### C — Provider KYC review
- Admin verification queue (pending provider profiles) — new page or section.
- `updateProviderVerification(providerId, status, notes?)` service to set
  `verification_status` to `verified` / `rejected`; view submitted docs.

### D — Admin dashboard metrics
- Extend `AdminDashboardPage` with: counts by role, new signups, pending verifications,
  open disputes.
- `getAdminOverview()` service returning the aggregate counts.

---

## Section 4 — Testing & verification

- Vitest unit tests for every new admin service function (`getAdminUserDetail`,
  `updateUserStatus`, `updateProviderVerification`, `getAdminOverview`), following the
  existing `*.test.ts` + `mockSupabase` pattern.
- Manual browser verification of each improved flow and each admin page before completion.
- Run the existing test suite + typecheck/lint; keep them green.
- No payment code touched.

## Out of scope

- Payment / Yoco / escrow integration.
- Mobile (`apps/mobile`) changes.
- Audit log of admin actions (deferred).

## Parallelization map (for multi-agent implementation)

- **Phase 0 (serial):** Section 1 foundation (one agent or main thread).
- **Phase 1 (parallel) after Phase 0:**
  - Agent 1: Section 2 flow improvements.
  - Agent 2: Section 3A+3B (user detail + account actions).
  - Agent 3: Section 3C+3D (KYC review + dashboard metrics).
- **Phase 2 (serial):** integration check, tests, browser verification, commit.
