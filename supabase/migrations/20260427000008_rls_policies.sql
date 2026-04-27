-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.saved_locations enable row level security;
alter table public.location_events enable row level security;
alter table public.service_categories enable row level security;
alter table public.service_types enable row level security;
alter table public.provider_services enable row level security;
alter table public.bookings enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.payments enable row level security;
alter table public.disputes enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: check if current user is provider
create or replace function public.is_provider()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'provider'
  );
$$;

-- ── USERS ──────────────────────────────────────────────────────────────────
create policy "users_select_own" on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- ── PROVIDER PROFILES ──────────────────────────────────────────────────────
-- Anyone can read verified provider profiles (for search)
create policy "provider_profiles_select_all" on public.provider_profiles
  for select using (verification_status = 'verified' or user_id = auth.uid() or public.is_admin());

create policy "provider_profiles_insert_own" on public.provider_profiles
  for insert with check (user_id = auth.uid());

create policy "provider_profiles_update_own" on public.provider_profiles
  for update using (user_id = auth.uid() or public.is_admin());

-- ── CUSTOMER PROFILES ──────────────────────────────────────────────────────
create policy "customer_profiles_select_own" on public.customer_profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy "customer_profiles_insert_own" on public.customer_profiles
  for insert with check (user_id = auth.uid());

create policy "customer_profiles_update_own" on public.customer_profiles
  for update using (user_id = auth.uid() or public.is_admin());

-- ── SAVED LOCATIONS ────────────────────────────────────────────────────────
create policy "saved_locations_select_own" on public.saved_locations
  for select using (user_id = auth.uid() or public.is_admin());

create policy "saved_locations_insert_own" on public.saved_locations
  for insert with check (user_id = auth.uid());

create policy "saved_locations_update_own" on public.saved_locations
  for update using (user_id = auth.uid());

create policy "saved_locations_delete_own" on public.saved_locations
  for delete using (user_id = auth.uid());

-- ── LOCATION EVENTS ────────────────────────────────────────────────────────
create policy "location_events_select_own" on public.location_events
  for select using (user_id = auth.uid() or public.is_admin());

create policy "location_events_insert_own" on public.location_events
  for insert with check (user_id = auth.uid());

-- ── SERVICE CATEGORIES (public read) ───────────────────────────────────────
create policy "service_categories_select_all" on public.service_categories
  for select using (is_active = true or public.is_admin());

-- ── SERVICE TYPES (public read) ────────────────────────────────────────────
create policy "service_types_select_all" on public.service_types
  for select using (is_active = true or public.is_admin());

-- ── PROVIDER SERVICES ──────────────────────────────────────────────────────
create policy "provider_services_select_all" on public.provider_services
  for select using (true); -- public — needed for search

create policy "provider_services_insert_own" on public.provider_services
  for insert with check (
    exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
  );

create policy "provider_services_update_own" on public.provider_services
  for update using (
    exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
  );

-- ── BOOKINGS ───────────────────────────────────────────────────────────────
create policy "bookings_select_participant" on public.bookings
  for select using (
    customer_id = auth.uid()
    or exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
    or public.is_admin()
  );

create policy "bookings_insert_customer" on public.bookings
  for insert with check (customer_id = auth.uid());

create policy "bookings_update_participant" on public.bookings
  for update using (
    customer_id = auth.uid()
    or exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
    or public.is_admin()
  );

-- ── QUOTE REQUESTS ─────────────────────────────────────────────────────────
create policy "quote_requests_select_participant" on public.quote_requests
  for select using (
    customer_id = auth.uid()
    or public.is_provider() -- providers can browse open requests
    or public.is_admin()
  );

create policy "quote_requests_insert_customer" on public.quote_requests
  for insert with check (customer_id = auth.uid());

-- ── QUOTES ─────────────────────────────────────────────────────────────────
create policy "quotes_select_participant" on public.quotes
  for select using (
    exists (
      select 1 from public.quote_requests qr
      where qr.id = quote_request_id and qr.customer_id = auth.uid()
    )
    or exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
    or public.is_admin()
  );

create policy "quotes_insert_provider" on public.quotes
  for insert with check (
    exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
  );

create policy "quotes_update_provider" on public.quotes
  for update using (
    exists (select 1 from public.provider_profiles where id = provider_id and user_id = auth.uid())
    or public.is_admin()
  );

-- ── PAYMENTS ───────────────────────────────────────────────────────────────
create policy "payments_select_participant" on public.payments
  for select using (
    customer_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      join public.provider_profiles pp on pp.id = b.provider_id
      where b.id = booking_id and pp.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "payments_insert_customer" on public.payments
  for insert with check (customer_id = auth.uid());

-- Only edge functions / admin update payments (escrow logic)
create policy "payments_update_admin" on public.payments
  for update using (public.is_admin());

-- ── DISPUTES ───────────────────────────────────────────────────────────────
create policy "disputes_select_participant" on public.disputes
  for select using (
    raised_by_user_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (
        b.customer_id = auth.uid()
        or exists (select 1 from public.provider_profiles where id = b.provider_id and user_id = auth.uid())
      )
    )
    or public.is_admin()
  );

create policy "disputes_insert_participant" on public.disputes
  for insert with check (raised_by_user_id = auth.uid());

create policy "disputes_update_admin" on public.disputes
  for update using (public.is_admin());

-- ── RATINGS ────────────────────────────────────────────────────────────────
create policy "ratings_select_all" on public.ratings
  for select using (true); -- public reputation data

create policy "ratings_insert_participant" on public.ratings
  for insert with check (
    rated_by_user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and b.status = 'completed'
      and (
        b.customer_id = auth.uid()
        or exists (select 1 from public.provider_profiles where id = b.provider_id and user_id = auth.uid())
      )
    )
  );

-- ── NOTIFICATIONS ──────────────────────────────────────────────────────────
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());
