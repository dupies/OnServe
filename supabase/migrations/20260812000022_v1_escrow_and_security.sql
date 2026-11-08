-- ============================================================================
-- v1 escrow + security hardening
--
-- Ports the useful parts of feat/ozow-phase3 (fee columns, bank details,
-- release + 48h auto-release) into this branch, and closes the RLS holes that
-- let the browser change money, roles and verification status.
--
-- Money flow:
--   pay (Ozow webhook)      payments: pending  -> escrowed
--   provider checks out     bookings: in_progress -> completed  (48h hold starts)
--   customer approves       payments: escrowed -> released   (release_payment)
--   48h, no dispute         payments: escrowed -> released   (auto_release_payments, pg_cron)
--   dispute raised          payments: escrowed -> disputed   (frozen)
--   admin resolves          payments: disputed -> released | refund_pending
--   booking cancelled       payments: escrowed -> refund_pending
--   admin pays provider     payments.paid_out_at set         (mark_payouts_paid)
--   admin refunds customer  payments: refund_pending -> refunded (mark_refunded)
--
-- Rule of thumb: the browser never writes money or status columns directly.
-- Those changes happen only in SECURITY DEFINER functions, edge functions
-- (service role) or pg_cron.
-- ============================================================================

-- ── 0. Business constants ──────────────────────────────────────────────────

-- 5% OnServe fee added on top of the provider's price. Ozow's ~1.5% EFT fee
-- comes out of this (decision 2026-11-07). Keep in sync with
-- packages/shared/src/fees.ts.
create or replace function public.platform_fee_rate()
returns numeric language sql immutable as $$ select 0.05::numeric $$;

-- How long money is held after the provider checks out, so the customer can
-- raise a complaint before it auto-releases.
create or replace function public.escrow_hold_interval()
returns interval language sql immutable as $$ select interval '48 hours' $$;

-- True for trusted server-side callers: SECURITY DEFINER functions (run as
-- their owner), the service role (edge functions), pg_cron/migrations, and
-- admins. False for ordinary browser sessions (anon / authenticated).
-- NOTE: only meaningful inside NON-definer trigger functions.
create or replace function public.is_privileged()
returns boolean language sql stable set search_path = public as $$
  select current_user not in ('authenticated', 'anon') or public.is_admin();
$$;

-- ── 1. Users: no self-promotion to admin ───────────────────────────────────

-- Signup must never trust a client-supplied 'admin' role.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_role text := new.raw_user_meta_data->>'role';
begin
  insert into public.users (id, email, phone, role)
  values (
    new.id,
    new.email,
    new.phone,
    case when v_role in ('customer', 'provider') then v_role::user_role else 'customer' end
  );
  return new;
end;
$$;

create or replace function public.guard_users_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.is_verified is distinct from old.is_verified
     or new.account_status is distinct from old.account_status
     or new.suspension_reason is distinct from old.suspension_reason
     or new.suspended_at is distinct from old.suspended_at then
    raise exception 'You cannot change protected account fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_users_update on public.users;
create trigger guard_users_update
  before update on public.users
  for each row execute function public.guard_users_update();

-- Role selection (customer <-> provider) goes through this RPC so that
-- public.users.role (what RLS checks) stays in sync with the UI choice.
create or replace function public.set_my_role(p_role user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_role not in ('customer', 'provider') then
    raise exception 'That role cannot be self-assigned' using errcode = '42501';
  end if;
  update public.users set role = p_role where id = auth.uid() and role <> 'admin';
end;
$$;
revoke all on function public.set_my_role(user_role) from public, anon;
grant execute on function public.set_my_role(user_role) to authenticated;

-- Replace the metadata-based admin policies from 20260811000020 (user
-- metadata is editable by the user, so it must never grant admin rights).
drop policy if exists "admin_can_update_any_user" on public.users;
drop policy if exists "admin_can_update_any_provider_profile" on public.provider_profiles;
drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin" on public.users
  for update using (public.is_admin()) with check (public.is_admin());

-- ── 2. Provider profiles: no self-verification ─────────────────────────────

create or replace function public.guard_provider_profiles()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_privileged() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.verified_at := null;
    new.rating_average := 0;
    new.total_jobs_completed := 0;
    new.completion_rate := 0;
    new.no_show_rate := 0;
    new.dispute_rate := 0;
    new.reputation_score := 0;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.rating_average is distinct from old.rating_average
     or new.total_jobs_completed is distinct from old.total_jobs_completed
     or new.completion_rate is distinct from old.completion_rate
     or new.no_show_rate is distinct from old.no_show_rate
     or new.dispute_rate is distinct from old.dispute_rate
     or new.reputation_score is distinct from old.reputation_score then
    raise exception 'Verification and reputation fields are managed by OnServe' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_provider_profiles on public.provider_profiles;
create trigger guard_provider_profiles
  before insert or update on public.provider_profiles
  for each row execute function public.guard_provider_profiles();

-- ── 3. Provider bank accounts (private, own table) ─────────────────────────
-- Not on provider_profiles: verified profiles are publicly readable.

create table if not exists public.provider_bank_accounts (
  provider_id    uuid primary key references public.provider_profiles(id) on delete cascade,
  account_holder text not null,
  bank_name      text not null,
  account_number text not null check (account_number ~ '^[0-9]{6,16}$'),
  branch_code    text not null check (branch_code ~ '^[0-9]{6}$'),
  account_type   text not null check (account_type in ('cheque', 'savings', 'transmission')),
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.provider_bank_accounts enable row level security;

drop trigger if exists provider_bank_accounts_updated_at on public.provider_bank_accounts;
create trigger provider_bank_accounts_updated_at
  before update on public.provider_bank_accounts
  for each row execute function public.update_updated_at();

drop policy if exists "bank_accounts_select_own" on public.provider_bank_accounts;
create policy "bank_accounts_select_own" on public.provider_bank_accounts
  for select using (
    exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "bank_accounts_insert_own" on public.provider_bank_accounts;
create policy "bank_accounts_insert_own" on public.provider_bank_accounts
  for insert with check (
    exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
  );

drop policy if exists "bank_accounts_update_own" on public.provider_bank_accounts;
create policy "bank_accounts_update_own" on public.provider_bank_accounts
  for update using (
    exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
    or public.is_admin()
  );

-- Only admins verify. Any change to the account itself drops verification,
-- so a hijacked login can't silently redirect payouts.
create or replace function public.guard_bank_accounts()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified_at := null;
    return new;
  end if;
  if new.provider_id is distinct from old.provider_id then
    raise exception 'Cannot move a bank account to another provider' using errcode = '42501';
  end if;
  if new.account_number is distinct from old.account_number
     or new.branch_code is distinct from old.branch_code
     or new.account_holder is distinct from old.account_holder
     or new.bank_name is distinct from old.bank_name
     or new.account_type is distinct from old.account_type then
    new.verified_at := null;
  elsif new.verified_at is distinct from old.verified_at then
    raise exception 'Bank accounts are verified by OnServe' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_bank_accounts on public.provider_bank_accounts;
create trigger guard_bank_accounts
  before insert or update on public.provider_bank_accounts
  for each row execute function public.guard_bank_accounts();

-- ── 4. Bookings: server-side pricing + status rules ────────────────────────

alter table public.bookings
  add column if not exists service_price numeric(10,2),
  add column if not exists platform_fee numeric(10,2);

-- Cancellation window (decision 2026-11-08): a customer can't cancel a
-- confirmed booking within this many minutes of the start time. Default and
-- minimum 1 hour; providers set it per service when they register it. Copied
-- onto each booking at creation so later changes don't affect existing ones.
alter table public.provider_services
  add column if not exists cancellation_cutoff_minutes integer not null default 60
    check (cancellation_cutoff_minutes between 60 and 2880);

alter table public.bookings
  add column if not exists cancellation_cutoff_minutes integer not null default 60
    check (cancellation_cutoff_minutes between 60 and 2880);

-- Backfill existing rows (old rows were price + 5%).
update public.bookings
set service_price = round(total_amount / (1 + public.platform_fee_rate()), 2),
    platform_fee  = total_amount - round(total_amount / (1 + public.platform_fee_rate()), 2)
where service_price is null;

create or replace function public.price_booking_insert()
returns trigger language plpgsql set search_path = public as $$
declare
  v_price numeric;
  v_cutoff integer;
begin
  if not public.is_privileged() then
    if new.customer_id is distinct from auth.uid() then
      raise exception 'You can only book for yourself' using errcode = '42501';
    end if;

    -- Clients cannot choose status, type, timestamps or price.
    new.status := 'pending';
    new.booking_type := 'instant';
    new.deposit_amount := null;
    new.provider_checked_in_at := null;
    new.provider_checked_out_at := null;
    new.completed_at := null;
    new.cancelled_at := null;
    new.cancellation_reason := null;

    if new.provider_id is not null then
      if not exists (
        select 1 from public.provider_profiles
        where id = new.provider_id and verification_status = 'verified'
      ) then
        raise exception 'This provider is not available for booking' using errcode = 'P0001';
      end if;
      select ps.custom_price, ps.cancellation_cutoff_minutes into v_price, v_cutoff
      from public.provider_services ps
      where ps.provider_id = new.provider_id
        and ps.service_type_id = new.service_type_id
        and ps.is_available;
    end if;
    new.cancellation_cutoff_minutes := coalesce(v_cutoff, 60);

    if v_price is null then
      select st.base_price into v_price from public.service_types st where st.id = new.service_type_id;
    end if;
    if v_price is null or v_price <= 0 then
      raise exception 'This service has no fixed price - request a quote instead' using errcode = 'P0001';
    end if;
    new.service_price := v_price;
  end if;

  if new.service_price is not null then
    new.platform_fee := round(new.service_price * public.platform_fee_rate(), 2);
    new.total_amount := new.service_price + new.platform_fee;
  end if;
  return new;
end;
$$;

drop trigger if exists price_booking_insert on public.bookings;
create trigger price_booking_insert
  before insert on public.bookings
  for each row execute function public.price_booking_insert();

-- Which status changes each party may make (decision 2026-11-08):
--
--   customer books              -> pending     (unpaid draft until Ozow settles)
--   provider accepts            -> confirmed   (only once fully paid, see guard)
--   customer starts the service -> in_progress (only on/after the booking day)
--   provider completes          -> completed   (starts the 48h hold)
--   either side, before start   -> cancelled   (payment is fully refundable)
--
-- Once started, problems go through a dispute, not a cancellation.
-- 'disputed' is set by the dispute trigger only. Admins and server code
-- bypass this function.
-- Future: provider sends a "ready to start" request the customer accepts;
-- the customer->in_progress move stays the same.
create or replace function public.booking_transition_allowed(
  p_from booking_status,
  p_to booking_status,
  p_actor text
) returns boolean language sql immutable as $$
  select case p_actor
    when 'customer' then (p_from, p_to) in (
      ('pending',   'cancelled'),
      ('confirmed', 'cancelled'),
      ('confirmed', 'in_progress')
    )
    when 'provider' then (p_from, p_to) in (
      ('pending',     'confirmed'),
      ('pending',     'cancelled'),   -- decline
      ('confirmed',   'cancelled'),
      ('in_progress', 'completed')
    )
    else false
  end;
$$;

create or replace function public.guard_bookings_update()
returns trigger language plpgsql set search_path = public as $$
declare
  v_actor text;
begin
  if public.is_privileged() then
    return new;
  end if;

  if new.customer_id is distinct from old.customer_id
     or new.provider_id is distinct from old.provider_id
     or new.service_type_id is distinct from old.service_type_id
     or new.location_id is distinct from old.location_id
     or new.booking_type is distinct from old.booking_type
     or new.total_amount is distinct from old.total_amount
     or new.service_price is distinct from old.service_price
     or new.platform_fee is distinct from old.platform_fee
     or new.deposit_amount is distinct from old.deposit_amount
     or new.scheduled_at is distinct from old.scheduled_at
     or new.cancellation_cutoff_minutes is distinct from old.cancellation_cutoff_minutes
     or new.created_at is distinct from old.created_at then
    raise exception 'Booking details can only be changed by OnServe' using errcode = '42501';
  end if;

  -- Timestamps are set here, never trusted from the client.
  new.provider_checked_in_at := old.provider_checked_in_at;
  new.provider_checked_out_at := old.provider_checked_out_at;
  new.completed_at := old.completed_at;
  new.cancelled_at := old.cancelled_at;

  if new.status is not distinct from old.status then
    new.cancellation_reason := old.cancellation_reason;
    return new;
  end if;

  v_actor := case
    when auth.uid() = old.customer_id then 'customer'
    when exists (
      select 1 from public.provider_profiles where id = old.provider_id and user_id = auth.uid()
    ) then 'provider'
  end;

  if v_actor is null or not public.booking_transition_allowed(old.status, new.status, v_actor) then
    raise exception 'A % cannot move a booking from % to %',
      coalesce(v_actor, 'non-participant'), old.status, new.status
      using errcode = '42501';
  end if;

  if new.status = 'confirmed' and not exists (
    select 1 from public.payments where booking_id = old.id and status = 'escrowed'
  ) then
    raise exception 'This booking must be paid before it can be confirmed' using errcode = 'P0001';
  end if;

  -- Inside the provider's cancellation window (default 1h before the start),
  -- a customer can't cancel a confirmed booking: the provider is committed
  -- and may already be on the way. Once the booking time has passed, problems
  -- (no-show, poor work) go through a dispute and an admin decides.
  if v_actor = 'customer' and old.status = 'confirmed' and new.status = 'cancelled'
     and now() >= old.scheduled_at - make_interval(mins => old.cancellation_cutoff_minutes) then
    if now() >= old.scheduled_at then
      raise exception 'The booking time has passed, so it can no longer be cancelled. Raise a dispute if the provider did not arrive or something went wrong.'
        using errcode = 'P0001';
    end if;
    raise exception 'Bookings can''t be cancelled within % of the start time.',
      case when old.cancellation_cutoff_minutes % 60 = 0
           then (old.cancellation_cutoff_minutes / 60)::text
                || case when old.cancellation_cutoff_minutes = 60 then ' hour' else ' hours' end
           else old.cancellation_cutoff_minutes::text || ' minutes' end
      using errcode = 'P0001';
  end if;

  if new.status = 'in_progress'
     and (now() at time zone 'Africa/Johannesburg')::date
         < (old.scheduled_at at time zone 'Africa/Johannesburg')::date then
    raise exception 'The service can only be started on the day of the booking' using errcode = 'P0001';
  end if;

  if new.status = 'in_progress' then
    new.provider_checked_in_at := now();
  elsif new.status = 'completed' then
    new.provider_checked_out_at := now();
    new.completed_at := now();
  elsif new.status = 'cancelled' then
    new.cancelled_at := now();
  end if;
  if new.status <> 'cancelled' then
    new.cancellation_reason := old.cancellation_reason;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_bookings_update on public.bookings;
create trigger guard_bookings_update
  before update on public.bookings
  for each row execute function public.guard_bookings_update();

-- ── 5. Payments: no client inserts, fee + payout columns ───────────────────

drop policy if exists "payments_insert_customer" on public.payments;

alter table public.payments
  alter column payment_gateway set default 'ozow',
  add column if not exists platform_fee     numeric(10,2) not null default 0,
  add column if not exists provider_payout  numeric(10,2) not null default 0,
  add column if not exists released_by      text check (released_by in ('customer', 'auto', 'admin')),
  add column if not exists paid_out_at      timestamptz,
  add column if not exists payout_reference text,
  add column if not exists refund_reason    text,
  add column if not exists refunded_at      timestamptz;

update public.payments p
set platform_fee = coalesce(b.platform_fee, 0),
    provider_payout = coalesce(b.service_price, p.amount)
from public.bookings b
where b.id = p.booking_id and p.provider_payout = 0;

create index if not exists idx_payments_escrowed on public.payments(status) where status = 'escrowed';
create index if not exists idx_payments_unpaid_payouts on public.payments(released_at)
  where status = 'released' and paid_out_at is null;

-- Notify helper (definer: notifications has no client insert policy).
create or replace function public._notify(
  p_user uuid, p_title text, p_body text, p_meta jsonb,
  p_type notification_type default 'payment'
)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, type, metadata)
  select p_user, p_title, p_body, p_type, p_meta
  where p_user is not null;
$$;
revoke all on function public._notify(uuid, text, text, jsonb, notification_type) from public, anon, authenticated;

-- Tell the other party when it's their turn.
create or replace function public.on_booking_status_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_provider_user uuid;
  v_meta jsonb := jsonb_build_object('bookingId', new.id);
begin
  select user_id into v_provider_user from public.provider_profiles where id = new.provider_id;

  if new.status = 'confirmed' then
    perform public._notify(new.customer_id, 'Booking accepted',
      'Your provider accepted the booking. Tap "Start service" when they arrive.', v_meta, 'booking');
  elsif new.status = 'in_progress' then
    perform public._notify(v_provider_user, 'Service started',
      'The customer has started the service. Mark the job complete when you are done.', v_meta, 'booking');
  elsif new.status = 'completed' and old.status = 'in_progress' then
    perform public._notify(new.customer_id, 'Job marked complete',
      format('Approve the job to release payment. If something is wrong, raise a dispute within %s - after that payment is released automatically.',
             public.escrow_hold_interval()), v_meta, 'booking');
  elsif new.status = 'cancelled' and old.status in ('pending', 'confirmed') then
    -- Unpaid drafts were never shown to the provider: nothing to tell anyone.
    if not exists (
      select 1 from public.payments
      where booking_id = new.id and status in ('escrowed', 'refund_pending')
    ) then
      return new;
    end if;
    if auth.uid() = new.customer_id then
      perform public._notify(v_provider_user, 'Booking cancelled', 'The customer cancelled this booking.', v_meta, 'booking');
    else
      perform public._notify(new.customer_id, 'Booking cancelled',
        'Your provider cancelled this booking. Any payment will be refunded in full.', v_meta, 'booking');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_status_notify on public.bookings;
create trigger on_booking_status_notify
  after update of status on public.bookings
  for each row when (new.status is distinct from old.status)
  execute function public.on_booking_status_notify();

-- Settle a verified Ozow 'Complete' notification. Called only by the
-- ozow-webhook edge function (service role). Locks the booking first (same
-- order as the cancel path: booking -> payment) so a customer cancelling
-- while on the Ozow page can't leave money escrowed on a cancelled booking.
create or replace function public.settle_ozow_payment(p_payment_id uuid, p_transaction_id text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_booking_id uuid;
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_provider_user uuid;
begin
  select booking_id into v_booking_id from public.payments where id = p_payment_id;
  if v_booking_id is null then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  select * into v_booking from public.bookings where id = v_booking_id for update;
  select * into v_payment from public.payments where id = p_payment_id for update;

  if v_payment.status <> 'pending' then
    return 'noop'; -- duplicate notification: idempotent
  end if;

  if v_booking.status = 'pending' then
    update public.payments
    set status = 'escrowed', escrowed_at = now(), gateway_transaction_id = p_transaction_id
    where id = p_payment_id;

    perform public._notify(v_payment.customer_id, 'Payment received',
      format('Your payment of R %s is held safely until the job is done. It is fully refundable if the booking is cancelled before the service starts.',
             to_char(v_payment.amount, 'FM999999990.00')),
      jsonb_build_object('paymentId', p_payment_id, 'bookingId', v_booking.id));

    select user_id into v_provider_user from public.provider_profiles where id = v_booking.provider_id;
    perform public._notify(v_provider_user, 'New paid booking',
      'A customer has booked and paid. Accept the job from your job board.',
      jsonb_build_object('bookingId', v_booking.id), 'booking');
    return 'escrowed';
  end if;

  -- Booking was cancelled (or otherwise moved on) while the customer was
  -- paying: never escrow it, queue a refund instead.
  update public.payments
  set status = 'refund_pending', gateway_transaction_id = p_transaction_id,
      refund_reason = format('Payment completed after booking was %s', v_booking.status)
  where id = p_payment_id;

  perform public._notify(v_payment.customer_id, 'Refund on its way',
    'Your booking was cancelled before your payment completed. You will be refunded in full within 3-5 business days.',
    jsonb_build_object('paymentId', p_payment_id, 'bookingId', v_booking.id));
  return 'refund_pending';
end;
$$;
revoke all on function public.settle_ozow_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.settle_ozow_payment(uuid, text) to service_role;

-- Core release. Internal only.
create or replace function public._release_payment(p_payment_id uuid, p_by text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_payout numeric;
  v_booking uuid;
  v_provider_user uuid;
begin
  update public.payments
  set status = 'released', released_at = now(), released_by = p_by
  where id = p_payment_id and status in ('escrowed', 'disputed')
  returning provider_payout, booking_id into v_payout, v_booking;
  if not found then
    return false;
  end if;

  select pp.user_id into v_provider_user
  from public.bookings b join public.provider_profiles pp on pp.id = b.provider_id
  where b.id = v_booking;

  perform public._notify(
    v_provider_user,
    'Payment released',
    format('R %s has been released to you and will be in your next payout.', to_char(v_payout, 'FM999999990.00')),
    jsonb_build_object('paymentId', p_payment_id, 'bookingId', v_booking)
  );
  return true;
end;
$$;
revoke all on function public._release_payment(uuid, text) from public, anon, authenticated;

-- Customer approves the finished job (or admin forces release).
create or replace function public.release_payment(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_by text;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  if public.is_admin() then
    v_by := 'admin';
  elsif v_booking.customer_id = auth.uid() then
    v_by := 'customer';
  else
    raise exception 'Only the customer can approve this job' using errcode = '42501';
  end if;

  select * into v_payment from public.payments where booking_id = p_booking_id for update;
  if not found then
    raise exception 'There is no payment for this booking' using errcode = 'P0001';
  end if;
  if v_payment.status = 'released' then
    return; -- already approved / auto-released: idempotent
  end if;
  if v_payment.status <> 'escrowed' then
    raise exception 'This payment is % and cannot be released', v_payment.status using errcode = 'P0001';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'The provider has not marked this job as done yet' using errcode = 'P0001';
  end if;

  perform public._release_payment(v_payment.id, v_by);
end;
$$;
revoke all on function public.release_payment(uuid) from public, anon;
grant execute on function public.release_payment(uuid) to authenticated;

-- Release everything whose hold window has passed. Run by pg_cron.
create or replace function public.auto_release_payments()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select p.id
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where p.status = 'escrowed'
      and b.status = 'completed'
      and coalesce(b.provider_checked_out_at, b.completed_at) <= now() - public.escrow_hold_interval()
    for update of p skip locked
  loop
    if public._release_payment(r.id, 'auto') then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.auto_release_payments() from public, anon, authenticated;

-- Cancelling a paid booking queues a refund for admin to process.
create or replace function public.on_booking_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
begin
  update public.payments
  set status = 'refund_pending',
      refund_reason = coalesce(new.cancellation_reason, 'Booking cancelled')
  where booking_id = new.id and status = 'escrowed'
  returning customer_id into v_customer;

  if found then
    perform public._notify(
      v_customer, 'Refund on its way',
      'Your booking was cancelled. Your payment will be refunded within 3-5 business days.',
      jsonb_build_object('bookingId', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_cancelled on public.bookings;
create trigger on_booking_cancelled
  after update of status on public.bookings
  for each row when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.on_booking_cancelled();

-- ── 6. Disputes freeze the money; resolution moves it ──────────────────────

create unique index if not exists idx_disputes_one_active_per_booking
  on public.disputes(booking_id) where status in ('open', 'under_review', 'escalated');

create or replace function public.prepare_dispute()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_payment_id uuid;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  if auth.uid() is not null and not public.is_admin() then
    if new.raised_by_user_id is distinct from auth.uid() then
      raise exception 'You can only raise disputes as yourself' using errcode = '42501';
    end if;
    if auth.uid() <> v_booking.customer_id and not exists (
      select 1 from public.provider_profiles where id = v_booking.provider_id and user_id = auth.uid()
    ) then
      raise exception 'You are not part of this booking' using errcode = '42501';
    end if;
  end if;

  select id into v_payment_id from public.payments
  where booking_id = new.booking_id and status = 'escrowed';
  if v_payment_id is null then
    raise exception 'Only bookings with money held in escrow can be disputed. Please contact support.'
      using errcode = 'P0001';
  end if;

  new.payment_id := v_payment_id;
  new.status := 'open';
  new.resolved_by_admin_id := null;
  new.resolution_notes := null;
  new.resolved_at := null;
  return new;
end;
$$;

drop trigger if exists prepare_dispute on public.disputes;
create trigger prepare_dispute
  before insert on public.disputes
  for each row execute function public.prepare_dispute();

create or replace function public.on_dispute_raised()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.payments set status = 'disputed' where id = new.payment_id and status = 'escrowed';
  update public.bookings set status = 'disputed' where id = new.booking_id;
  return new;
end;
$$;

drop trigger if exists on_dispute_raised on public.disputes;
create trigger on_dispute_raised
  after insert on public.disputes
  for each row execute function public.on_dispute_raised();

create or replace function public.on_dispute_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
begin
  if new.status = 'resolved_provider' then
    perform public._release_payment(new.payment_id, 'admin');
    update public.bookings
    set status = 'completed', completed_at = coalesce(completed_at, now())
    where id = new.booking_id;
  elsif new.status = 'resolved_customer' then
    update public.payments
    set status = 'refund_pending', refund_reason = 'Dispute resolved in customer''s favour'
    where id = new.payment_id and status = 'disputed'
    returning customer_id into v_customer;
    update public.bookings
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        cancellation_reason = coalesce(cancellation_reason, 'Dispute resolved in customer''s favour')
    where id = new.booking_id;
    perform public._notify(
      v_customer, 'Dispute resolved',
      'Your dispute was resolved in your favour. Your refund will be processed within 3-5 business days.',
      jsonb_build_object('disputeId', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_dispute_resolved on public.disputes;
create trigger on_dispute_resolved
  after update of status on public.disputes
  for each row
  when (old.status in ('open', 'under_review', 'escalated')
        and new.status in ('resolved_customer', 'resolved_provider'))
  execute function public.on_dispute_resolved();

-- ── 7. Admin money operations ──────────────────────────────────────────────

-- Released payments not yet paid out, grouped per provider with bank details.
create or replace function public.admin_payouts_due()
returns table (
  provider_id uuid,
  provider_name text,
  amount numeric,
  payment_ids uuid[],
  account_holder text,
  bank_name text,
  account_number text,
  branch_code text,
  account_type text,
  bank_verified boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select pp.id, u.full_name, sum(p.provider_payout), array_agg(p.id),
           ba.account_holder, ba.bank_name, ba.account_number, ba.branch_code,
           ba.account_type, ba.verified_at is not null
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    join public.provider_profiles pp on pp.id = b.provider_id
    join public.users u on u.id = pp.user_id
    left join public.provider_bank_accounts ba on ba.provider_id = pp.id
    where p.status = 'released' and p.paid_out_at is null
    group by pp.id, u.full_name, ba.provider_id;
end;
$$;
revoke all on function public.admin_payouts_due() from public, anon;
grant execute on function public.admin_payouts_due() to authenticated;

create or replace function public.mark_payouts_paid(p_payment_ids uuid[], p_reference text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.payments
  set paid_out_at = now(), payout_reference = p_reference
  where id = any(p_payment_ids) and status = 'released' and paid_out_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.mark_payouts_paid(uuid[], text) from public, anon;
grant execute on function public.mark_payouts_paid(uuid[], text) to authenticated;

create or replace function public.mark_refunded(p_payment_id uuid, p_reference text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.payments
  set status = 'refunded', refunded_at = now(),
      refund_reason = coalesce(refund_reason, '') || ' [ref: ' || coalesce(p_reference, '-') || ']'
  where id = p_payment_id and status = 'refund_pending';
  if not found then
    raise exception 'Payment is not awaiting a refund' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.mark_refunded(uuid, text) from public, anon;
grant execute on function public.mark_refunded(uuid, text) to authenticated;

-- ── 8. Schedule auto-release every 15 minutes ──────────────────────────────

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('onserve-auto-release', '*/15 * * * *', 'select public.auto_release_payments()');
exception when others then
  raise notice 'pg_cron unavailable (%). Enable it in the dashboard and schedule public.auto_release_payments().', sqlerrm;
end;
$$;
