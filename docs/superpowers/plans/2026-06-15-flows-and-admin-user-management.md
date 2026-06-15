# Flow Improvements + Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve existing web user flows (friction, broken handoffs, UX polish) and upgrade admin user management (user detail, account actions, provider KYC review, dashboard metrics) — web only, payments deferred.

**Architecture:** Foundation-first. Ship shared UI primitives + a toast helper + a global query error handler + an `account_status` DB migration, then fan out parallel slices for flows and admin. Strict services pattern: Component → Hook (React Query) → Service → Supabase.

**Tech Stack:** React 18 + TypeScript (strict) + Vite + Tailwind, TanStack Query, Zustand, Supabase (PostgreSQL + RLS), Sonner (toasts), Vitest + happy-dom + a chainable Supabase mock.

---

## Key facts (verified 2026-06-15)

- `apps/web/src/components/common/` is empty.
- `apps/web/src/lib/queryClient.ts` already exists (staleTime 5m, retry 1) but has **no** global error handler.
- Sonner is mounted in `App.tsx` (`<Toaster position="top-center" richColors />`).
- `apps/web/src/test/mockSupabase.ts` exposes `makeSupabaseMock()` with `_setTable(table, data, error?)`, `_setDefault(data, error?)`, `rpc` (mockResolvedValue), and `auth.getUser` returning `{ id: 'user-1' }`.
- Service test pattern: `vi.mock('@/lib/supabase', () => ({ get supabase() { return mock; } }))`, then `const { fn } = await import('./service')`.
- `User` type (`packages/types/src/user.ts`) has no account status. `ProviderProfile` has `verificationStatus`, `idDocumentUrl`, `verifiedAt`.
- Latest migration: `20260515000012`. New one: `20260615000013`.
- Existing admin: `apps/web/src/pages/admin/{AdminDashboardPage,AdminUsersPage,AdminDisputeDetailPage}.tsx`, `apps/web/src/features/admin/services/adminService.ts`.
- Router: `apps/web/src/router/index.tsx` with `auth()` / `admin()` wrappers.

## File Structure

**Foundation (Phase 0):**
- Create `apps/web/src/components/common/LoadingState.tsx`
- Create `apps/web/src/components/common/EmptyState.tsx`
- Create `apps/web/src/components/common/ErrorState.tsx`
- Create `apps/web/src/components/common/ConfirmDialog.tsx`
- Create `apps/web/src/components/common/index.ts` (barrel)
- Create `apps/web/src/lib/notify.ts`
- Modify `apps/web/src/lib/queryClient.ts` (add global error handler)
- Create `supabase/migrations/20260615000013_account_status.sql`
- Modify `packages/types/src/user.ts` (add account status fields)

**Admin (Phase 1, parallel):**
- Modify `apps/web/src/features/admin/services/adminService.ts` (add `getAdminUserDetail`, `updateUserStatus`, `updateProviderVerification`, `getAdminOverview`)
- Create `apps/web/src/features/admin/services/adminService.test.ts`
- Create `apps/web/src/pages/admin/AdminUserDetailPage.tsx`
- Modify `apps/web/src/pages/admin/AdminUsersPage.tsx` (row link + status badge)
- Modify `apps/web/src/pages/admin/AdminDashboardPage.tsx` (metrics + KYC queue entry)
- Create `apps/web/src/pages/admin/AdminVerificationsPage.tsx` (KYC queue)
- Modify `apps/web/src/router/index.tsx` (new admin routes)

**Flows (Phase 1, parallel):** modifications to existing customer/provider pages listed in their tasks.

---

# PHASE 0 — Foundation (serial; complete before Phase 1)

### Task 1: Common UI primitives

**Files:**
- Create: `apps/web/src/components/common/LoadingState.tsx`
- Create: `apps/web/src/components/common/EmptyState.tsx`
- Create: `apps/web/src/components/common/ErrorState.tsx`
- Create: `apps/web/src/components/common/ConfirmDialog.tsx`
- Create: `apps/web/src/components/common/index.ts`

- [ ] **Step 1: Create LoadingState**

```tsx
// apps/web/src/components/common/LoadingState.tsx
export function LoadingState({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create EmptyState**

```tsx
// apps/web/src/components/common/EmptyState.tsx
import type { ComponentType } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 3: Create ErrorState**

```tsx
// apps/web/src/components/common/ErrorState.tsx
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create ConfirmDialog** (wraps existing `components/ui/dialog.tsx`)

```tsx
// apps/web/src/components/common/ConfirmDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Create barrel**

```ts
// apps/web/src/components/common/index.ts
export { LoadingState } from './LoadingState';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { ConfirmDialog } from './ConfirmDialog';
```

- [ ] **Step 6: Verify it builds and commit**

Run: `npm run build --workspace apps/web` (or `npx tsc --noEmit -p apps/web`)
Expected: no type errors. (If `Button` lacks a `destructive` variant, use `variant="default"` with `className="bg-destructive text-white hover:bg-destructive/90"` instead — check `components/ui/button.tsx` first.)

```bash
git add apps/web/src/components/common
git commit -m "feat(web): add shared common UI primitives (loading/empty/error/confirm)"
```

---

### Task 2: Toast helper

**Files:**
- Create: `apps/web/src/lib/notify.ts`

- [ ] **Step 1: Create notify helper**

```ts
// apps/web/src/lib/notify.ts
import { toast } from 'sonner';

function messageFrom(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong. Please try again.';
}

export const notify = {
  success: (message: string) => toast.success(message),
  error: (err: unknown) => toast.error(messageFrom(err)),
  info: (message: string) => toast(message),
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/notify.ts
git commit -m "feat(web): add notify toast helper over sonner"
```

---

### Task 3: Global query/mutation error handler

**Files:**
- Modify: `apps/web/src/lib/queryClient.ts`

- [ ] **Step 1: Add cache-level error handlers**

```ts
// apps/web/src/lib/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { notify } from './notify';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => notify.error(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => notify.error(error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});
```

Note: per-mutation `onError` still works; this is a safety net so unhandled errors always toast. Per-mutation `onSuccess` toasts (added in flow tasks) are additive.

- [ ] **Step 2: Verify build & commit**

Run: `npx tsc --noEmit -p apps/web`
Expected: PASS.

```bash
git add apps/web/src/lib/queryClient.ts
git commit -m "feat(web): surface query/mutation errors via global toast handler"
```

---

### Task 4: account_status migration + types

**Files:**
- Create: `supabase/migrations/20260615000013_account_status.sql`
- Modify: `packages/types/src/user.ts`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260615000013_account_status.sql
create type account_status as enum ('active', 'suspended', 'banned');

alter table public.users
  add column account_status account_status not null default 'active',
  add column suspension_reason text,
  add column suspended_at timestamptz;

create index idx_users_account_status on public.users(account_status);
```

Note: existing users RLS already restricts writes to own-row + admin; no new policy needed for admin updates. Do NOT add a self-update path for `account_status`.

- [ ] **Step 2: Apply migration to Supabase**

Use the Supabase MCP `apply_migration` tool (project `pehkmwbvwfohckakumnh`) with name `account_status` and the SQL above. Confirm success via `list_migrations`.

- [ ] **Step 3: Update User type**

```ts
// packages/types/src/user.ts — add to interface User, after isVerified:
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  accountStatus: AccountStatus;
  suspensionReason: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Update the existing user mapper**

In `apps/web/src/features/admin/services/adminService.ts`, extend `mapUser` to include:

```ts
    accountStatus: (r['account_status'] as User['accountStatus']) ?? 'active',
    suspensionReason: (r['suspension_reason'] as string | null) ?? null,
    suspendedAt: (r['suspended_at'] as string | null) ?? null,
```

Also check `apps/web/src/features/auth` for any other `User` mapper and add the same three fields (search: `grep -rn "fullName:" apps/web/src --include=*.ts`).

- [ ] **Step 5: Verify build & commit**

Run: `npx tsc --noEmit -p apps/web` and `npm run build --workspace packages/types`
Expected: PASS.

```bash
git add supabase/migrations/20260615000013_account_status.sql packages/types/src/user.ts apps/web/src/features/admin/services/adminService.ts
git commit -m "feat(db): add account_status to users + types"
```

---

# PHASE 1 — Parallel slices (after Phase 0 is committed)

## Stream A — Flow improvements

### Task 5: Replace payment dead-end with real confirmation

**Files:**
- Modify: `apps/web/src/pages/customer/PaymentPage.tsx`
- Reference: `apps/web/src/features/bookings/hooks/useBookings.ts`, `apps/web/src/pages/customer/BookingDetailPage.tsx`

- [ ] **Step 1: Read current PaymentPage** to find the fake `setTimeout`/mock submit.

Run: `sed -n '1,140p' apps/web/src/pages/customer/PaymentPage.tsx`

- [ ] **Step 2: Replace the fake submit** so it calls the real booking-create mutation (already in `useBookings`), shows `notify.success('Booking confirmed')`, and navigates to `/bookings/:id` (or `/complete/:id` if that's the existing confirmation screen — confirm by reading the router). Keep the Yoco/escrow copy as informational text. Use the button's loading state from the mutation's `isPending`. Do NOT add any payment processor call.

- [ ] **Step 3: Manual verify** — start dev server (`npm run dev --workspace apps/web`), walk booking → payment → confirm, ensure it lands on a real booking detail and a toast fires.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/customer/PaymentPage.tsx
git commit -m "fix(web): replace fake payment timeout with real booking confirmation handoff"
```

### Task 6: Booking + quote + onboarding flow states

**Files:**
- Modify: `apps/web/src/pages/customer/BookingPage.tsx`
- Modify: `apps/web/src/pages/customer/QuoteReviewPage.tsx`
- Modify: `apps/web/src/pages/provider/ProviderOnboardingPage.tsx`

- [ ] **Step 1:** In each page, replace ad-hoc spinners/empty branches with `LoadingState` / `EmptyState` / `ErrorState` from `@/components/common`. Add `onRetry={() => refetch()}` to error states.
- [ ] **Step 2:** Add `notify.success(...)` on each mutation `onSuccess` and `navigate(...)` redirect-after-action where the step completes. Ensure a back button exists on multi-step wizards.
- [ ] **Step 3:** Add form validation feedback (disable submit when required fields empty; inline message). Keep it minimal — no new form lib.
- [ ] **Step 4: Manual verify** each page in the browser (loading, empty, error, success paths).
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/customer/BookingPage.tsx apps/web/src/pages/customer/QuoteReviewPage.tsx apps/web/src/pages/provider/ProviderOnboardingPage.tsx
git commit -m "feat(web): consistent loading/empty/error states + redirects in core flows"
```

### Task 7: Cross-cutting list-page polish

**Files:**
- Modify: `apps/web/src/pages/customer/BookingsListPage.tsx`
- Modify: `apps/web/src/pages/customer/QuoteRequestsListPage.tsx`
- Modify: `apps/web/src/pages/customer/NotificationsPage.tsx`
- Modify: `apps/web/src/pages/provider/JobBoardPage.tsx`

- [ ] **Step 1:** Apply `LoadingState`/`EmptyState`/`ErrorState` to each list page.
- [ ] **Step 2:** For notifications mark-as-read, add an optimistic update in `apps/web/src/features/notifications/hooks` (`onMutate` cancels queries, snapshots, optimistically sets `isRead`, rolls back `onError`). Toast on bulk "mark all read".
- [ ] **Step 3: Manual verify** + **Commit**

```bash
git add apps/web/src/pages/customer/BookingsListPage.tsx apps/web/src/pages/customer/QuoteRequestsListPage.tsx apps/web/src/pages/customer/NotificationsPage.tsx apps/web/src/pages/provider/JobBoardPage.tsx apps/web/src/features/notifications
git commit -m "feat(web): list-page empty/loading/error states + optimistic notification read"
```

## Stream B — Admin services + tests (foundation for admin UI)

### Task 8: Admin service functions + unit tests

**Files:**
- Modify: `apps/web/src/features/admin/services/adminService.ts`
- Create: `apps/web/src/features/admin/services/adminService.test.ts`

- [ ] **Step 1: Write failing tests** for the four new functions.

```ts
// apps/web/src/features/admin/services/adminService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;
vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const {
  updateUserStatus,
  updateProviderVerification,
  getAdminOverview,
  getAdminUserDetail,
} = await import('./adminService');

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('updateUserStatus', () => {
  it('updates account_status with reason and timestamp', async () => {
    mock._setTable('users', [{ id: 'u-1' }]);
    await updateUserStatus('u-1', 'suspended', 'spam');
    const chain = mock.from('users');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ account_status: 'suspended', suspension_reason: 'spam' }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'u-1');
  });

  it('clears reason/timestamp when reactivating', async () => {
    mock._setTable('users', [{ id: 'u-1' }]);
    await updateUserStatus('u-1', 'active');
    const chain = mock.from('users');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ account_status: 'active', suspension_reason: null, suspended_at: null }),
    );
  });

  it('throws on supabase error', async () => {
    mock._setTable('users', null, { message: 'denied' });
    await expect(updateUserStatus('u-1', 'banned', 'fraud')).rejects.toThrow('denied');
  });
});

describe('updateProviderVerification', () => {
  it('sets verification_status and verified_at when verified', async () => {
    mock._setTable('provider_profiles', [{ id: 'p-1' }]);
    await updateProviderVerification('p-1', 'verified');
    const chain = mock.from('provider_profiles');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ verification_status: 'verified' }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'p-1');
  });

  it('throws on error', async () => {
    mock._setTable('provider_profiles', null, { message: 'nope' });
    await expect(updateProviderVerification('p-1', 'rejected')).rejects.toThrow('nope');
  });
});

describe('getAdminOverview', () => {
  it('returns aggregate counts', async () => {
    mock.rpc = vi.fn().mockResolvedValue({
      data: {
        total_users: 10,
        customers: 6,
        providers: 3,
        admins: 1,
        new_signups_7d: 4,
        pending_verifications: 2,
        open_disputes: 1,
      },
      error: null,
    });
    const overview = await getAdminOverview();
    expect(overview.totalUsers).toBe(10);
    expect(overview.pendingVerifications).toBe(2);
    expect(overview.openDisputes).toBe(1);
  });
});

describe('getAdminUserDetail', () => {
  it('returns the user with related history', async () => {
    mock._setTable('users', { id: 'u-1', full_name: 'Sam', role: 'customer', account_status: 'active' });
    mock._setTable('bookings', []);
    mock._setTable('disputes', []);
    mock._setTable('ratings', []);
    const detail = await getAdminUserDetail('u-1');
    expect(detail.user.id).toBe('u-1');
    expect(Array.isArray(detail.bookings)).toBe(true);
    expect(Array.isArray(detail.disputes)).toBe(true);
    expect(Array.isArray(detail.ratings)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify they FAIL**

Run: `npx vitest run apps/web/src/features/admin/services/adminService.test.ts`
Expected: FAIL (functions not exported).

- [ ] **Step 3: Implement the functions** in `adminService.ts`.

```ts
// add to apps/web/src/features/admin/services/adminService.ts
import type { AccountStatus } from '@onserve/types';

export interface AdminOverview {
  totalUsers: number;
  customers: number;
  providers: number;
  admins: number;
  newSignups7d: number;
  pendingVerifications: number;
  openDisputes: number;
}

export async function updateUserStatus(
  userId: string,
  status: AccountStatus,
  reason?: string,
): Promise<void> {
  const patch =
    status === 'active'
      ? { account_status: status, suspension_reason: null, suspended_at: null }
      : { account_status: status, suspension_reason: reason ?? null, suspended_at: new Date().toISOString() };
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function updateProviderVerification(
  providerId: string,
  status: 'verified' | 'rejected',
): Promise<void> {
  const patch =
    status === 'verified'
      ? { verification_status: status, verified_at: new Date().toISOString() }
      : { verification_status: status };
  const { error } = await supabase.from('provider_profiles').update(patch).eq('id', providerId);
  if (error) throw new Error(error.message);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_overview');
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Record<string, number>;
  return {
    totalUsers: d['total_users'] ?? 0,
    customers: d['customers'] ?? 0,
    providers: d['providers'] ?? 0,
    admins: d['admins'] ?? 0,
    newSignups7d: d['new_signups_7d'] ?? 0,
    pendingVerifications: d['pending_verifications'] ?? 0,
    openDisputes: d['open_disputes'] ?? 0,
  };
}

export async function getAdminUserDetail(userId: string): Promise<{
  user: User;
  bookings: Record<string, unknown>[];
  disputes: Dispute[];
  ratings: Record<string, unknown>[];
}> {
  const [userRes, bookingsRes, disputesRes, ratingsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('bookings').select('*').eq('customer_id', userId).order('created_at', { ascending: false }),
    supabase.from('disputes').select('*').eq('raised_by_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('ratings').select('*').eq('rated_user_id', userId).order('created_at', { ascending: false }),
  ]);
  if (userRes.error) throw new Error(userRes.error.message);
  return {
    user: mapUser(userRes.data as Record<string, unknown>),
    bookings: (bookingsRes.data ?? []) as Record<string, unknown>[],
    disputes: ((disputesRes.data ?? []) as Record<string, unknown>[]).map(mapDispute),
    ratings: (ratingsRes.data ?? []) as Record<string, unknown>[],
  };
}
```

- [ ] **Step 4: Create the `admin_overview` RPC migration** so `getAdminOverview` works against the real DB.

```sql
-- supabase/migrations/20260615000014_admin_overview.sql
create or replace function public.admin_overview()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'total_users', (select count(*) from public.users),
    'customers', (select count(*) from public.users where role = 'customer'),
    'providers', (select count(*) from public.users where role = 'provider'),
    'admins', (select count(*) from public.users where role = 'admin'),
    'new_signups_7d', (select count(*) from public.users where created_at > now() - interval '7 days'),
    'pending_verifications', (select count(*) from public.provider_profiles where verification_status = 'pending'),
    'open_disputes', (select count(*) from public.disputes where status in ('open', 'in_review', 'escalated'))
  );
$$;
revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to authenticated;
```

Apply via Supabase MCP `apply_migration` (name `admin_overview`). Note: verify the dispute "open" status values against the `dispute_status` enum in `20260427000001_enable_extensions.sql` and adjust the `in (...)` list to match.

- [ ] **Step 5: Run tests, verify PASS**

Run: `npx vitest run apps/web/src/features/admin/services/adminService.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin/services supabase/migrations/20260615000014_admin_overview.sql
git commit -m "feat(admin): user-status, KYC, overview, and user-detail services + tests"
```

## Stream C — Admin UI

### Task 9: Admin user detail page + account actions

**Files:**
- Create: `apps/web/src/pages/admin/AdminUserDetailPage.tsx`
- Modify: `apps/web/src/pages/admin/AdminUsersPage.tsx`
- Modify: `apps/web/src/router/index.tsx`

- [ ] **Step 1: Add route** in `router/index.tsx` (import + entry under the admin block):

```tsx
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage';
// ...
{ path: '/admin/users/:id', element: admin(<AdminUserDetailPage />) },
```

- [ ] **Step 2: Build AdminUserDetailPage** using `useQuery(['admin-user', id], () => getAdminUserDetail(id))`. Render: profile header (name, contact, role badge, account-status badge), tabs/sections for bookings, disputes, ratings (use `EmptyState` when empty, `LoadingState` while loading, `ErrorState` with retry on error). Add account-action buttons (Suspend/Reactivate/Ban) that open `ConfirmDialog`; on confirm call a `useMutation` wrapping `updateUserStatus`, `notify.success` on success, invalidate `['admin-user', id]` and `['admin-users']`. Suspend/Ban require a reason textarea inside the dialog.

- [ ] **Step 3: Link rows + status badge** in `AdminUsersPage.tsx`: wrap each row (or add a "View" link) to `navigate('/admin/users/' + u.id)`, and add an account-status badge column (green active / amber suspended / red banned).

- [ ] **Step 4: Manual verify** in browser as an admin: open a user, suspend with reason, see badge update, reactivate.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/admin/AdminUserDetailPage.tsx apps/web/src/pages/admin/AdminUsersPage.tsx apps/web/src/router/index.tsx
git commit -m "feat(admin): user detail page with bookings/disputes/ratings + account actions"
```

### Task 10: Provider KYC review queue

**Files:**
- Create: `apps/web/src/pages/admin/AdminVerificationsPage.tsx`
- Modify: `apps/web/src/router/index.tsx`
- Modify: `apps/web/src/features/admin/services/adminService.ts` (add `getPendingVerifications`)

- [ ] **Step 1: Add `getPendingVerifications`** to `adminService.ts`:

```ts
export async function getPendingVerifications(): Promise<Array<{
  id: string;
  userId: string;
  fullName: string;
  idDocumentUrl: string | null;
  bio: string | null;
  createdAt: string;
}>> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('id, user_id, bio, id_document_url, verification_status, users:users!provider_profiles_user_id_fkey(full_name, created_at)')
    .eq('verification_status', 'pending');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => {
    const u = (r['users'] as Record<string, unknown>) ?? {};
    return {
      id: r['id'] as string,
      userId: r['user_id'] as string,
      fullName: (u['full_name'] as string) ?? '—',
      idDocumentUrl: (r['id_document_url'] as string | null) ?? null,
      bio: (r['bio'] as string | null) ?? null,
      createdAt: (u['created_at'] as string) ?? '',
    };
  });
}
```

Note: verify the FK constraint name (`provider_profiles_user_id_fkey`) and `id_document_url` column name against `20260427000002_create_users.sql`; adjust the embedded-select syntax if Supabase rejects it (fallback: two queries joined in JS).

- [ ] **Step 2: Add route**:

```tsx
import { AdminVerificationsPage } from '@/pages/admin/AdminVerificationsPage';
{ path: '/admin/verifications', element: admin(<AdminVerificationsPage />) },
```

- [ ] **Step 3: Build AdminVerificationsPage** — list pending providers (card per provider: name, bio, ID-doc link/thumbnail, submitted date). Approve / Reject buttons → `ConfirmDialog` → `useMutation(updateProviderVerification)`, `notify.success`, invalidate `['admin-verifications']`. Use `EmptyState` ("No pending verifications") / `LoadingState` / `ErrorState`.

- [ ] **Step 4: Manual verify** + **Commit**

```bash
git add apps/web/src/pages/admin/AdminVerificationsPage.tsx apps/web/src/router/index.tsx apps/web/src/features/admin/services/adminService.ts
git commit -m "feat(admin): provider KYC verification review queue"
```

### Task 11: Admin dashboard metrics

**Files:**
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.tsx`

- [ ] **Step 1: Read current dashboard** to match its layout/styling.

Run: `sed -n '1,160p' apps/web/src/pages/admin/AdminDashboardPage.tsx`

- [ ] **Step 2: Add metrics** via `useQuery(['admin-overview'], getAdminOverview)`. Render stat cards: total users, customers, providers, new signups (7d), pending verifications (links to `/admin/verifications`), open disputes. Use `LoadingState`/`ErrorState`. Keep existing dashboard content.

- [ ] **Step 3: Manual verify** + **Commit**

```bash
git add apps/web/src/pages/admin/AdminDashboardPage.tsx
git commit -m "feat(admin): overview metrics on admin dashboard"
```

---

# PHASE 2 — Integration & verification (serial)

### Task 12: Full verification pass

- [ ] **Step 1: Typecheck + lint**

Run: `npx tsc --noEmit -p apps/web` and `npm run lint --workspace apps/web` (if lint script exists)
Expected: clean.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run` (from `apps/web` or root as configured)
Expected: all green (existing 8 + new admin tests).

- [ ] **Step 3: Browser smoke test** (`npm run dev --workspace apps/web`):
  - Customer: booking → confirmation handoff (no fake timeout), a list page empty/loaded, notification mark-read optimistic.
  - Admin: dashboard metrics load, users list shows status badges, open a user detail, suspend+reactivate, KYC queue approve/reject.

- [ ] **Step 4: Final commit** (if any cleanup) and report.

```bash
git add -A
git commit -m "chore(web): verification pass for flows + admin user management"
```

---

## Self-review notes (author)

- **Spec coverage:** Foundation (Task 1–4) ✓; flows A/B/C (Task 5–7) ✓; admin user detail (9) ✓, account actions (9) ✓, KYC review (10) ✓, dashboard metrics (11) ✓; testing (8, 12) ✓. Payments untouched ✓.
- **Type consistency:** `AccountStatus` defined in Task 4, used in Task 8. `AdminOverview`/`getAdminOverview` names consistent across Task 8 and 11. `updateProviderVerification` signature matches Task 8 test and Task 10 usage.
- **Risk flags called out inline:** Button `destructive` variant (Task 1), other `User` mappers (Task 4), dispute-status enum values (Task 8 step 4), provider FK / `id_document_url` embedded select (Task 10).
```
