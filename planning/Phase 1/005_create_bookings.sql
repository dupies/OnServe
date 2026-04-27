-- Bookings
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.users(id),
  provider_id uuid references public.provider_profiles(id),
  service_type_id uuid not null references public.service_types(id),
  location_id uuid not null references public.saved_locations(id),
  booking_type booking_type not null default 'instant',
  status booking_status not null default 'pending',
  total_amount numeric(10,2) not null,
  deposit_amount numeric(10,2),
  customer_notes text,
  scheduled_at timestamptz not null,
  provider_checked_in_at timestamptz,
  provider_checked_out_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.update_updated_at();

-- Quote requests
create table public.quote_requests (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id),
  customer_id uuid not null references public.users(id),
  service_type_id uuid not null references public.service_types(id),
  location_id uuid not null references public.saved_locations(id),
  problem_description text not null,
  uploaded_image_urls text[] not null default '{}',
  status quote_status not null default 'open',
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

-- Quotes (provider responses to quote requests)
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id),
  quoted_price numeric(10,2) not null,
  estimated_duration_mins integer,
  notes text,
  status quote_response_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(quote_request_id, provider_id)
);

-- Add FK from location_events to bookings now that bookings table exists
alter table public.location_events
  add constraint location_events_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete set null;

-- Indexes
create index idx_bookings_customer_id on public.bookings(customer_id);
create index idx_bookings_provider_id on public.bookings(provider_id);
create index idx_bookings_status on public.bookings(status);
create index idx_bookings_scheduled_at on public.bookings(scheduled_at);
create index idx_quote_requests_customer_id on public.quote_requests(customer_id);
create index idx_quote_requests_status on public.quote_requests(status);
create index idx_quotes_quote_request_id on public.quotes(quote_request_id);
create index idx_quotes_provider_id on public.quotes(provider_id);
