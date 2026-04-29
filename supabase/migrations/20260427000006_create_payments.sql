-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  customer_id uuid not null references public.users(id),
  amount numeric(10,2) not null,
  deposit_amount numeric(10,2) not null default 0,
  balance_amount numeric(10,2) not null default 0,
  status payment_status not null default 'pending',
  payment_gateway payment_gateway not null default 'yoco',
  gateway_transaction_id text,
  gateway_reference text,
  escrowed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.update_updated_at();

-- Disputes
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  payment_id uuid not null references public.payments(id),
  raised_by_user_id uuid not null references public.users(id),
  reason text not null,
  description text not null,
  evidence_urls text[] not null default '{}',
  status dispute_status not null default 'open',
  resolved_by_admin_id uuid references public.users(id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  type notification_type not null default 'system',
  metadata jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_payments_booking_id on public.payments(booking_id);
create index idx_payments_customer_id on public.payments(customer_id);
create index idx_payments_status on public.payments(status);
create index idx_disputes_booking_id on public.disputes(booking_id);
create index idx_disputes_status on public.disputes(status);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_is_read on public.notifications(user_id, is_read);
