-- Service categories
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Service types
create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  pricing_model pricing_model not null default 'fixed',
  base_price numeric(10,2),
  hourly_rate numeric(10,2),
  estimated_duration_mins integer,
  required_skills text[] not null default '{}',
  required_certifications text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Provider services (what each provider offers)
create table public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete cascade,
  custom_price numeric(10,2),
  service_radius_km integer not null default 10,
  is_available boolean not null default true,
  availability_schedule jsonb,
  created_at timestamptz not null default now(),
  unique(provider_id, service_type_id)
);

-- Seed initial categories
insert into public.service_categories (name, slug, sort_order) values
  ('Cleaning', 'cleaning', 1),
  ('Beauty', 'beauty', 2),
  ('Plumbing', 'plumbing', 3),
  ('Electrical', 'electrical', 4),
  ('Gardening', 'gardening', 5),
  ('Photography', 'photography', 6),
  ('Catering', 'catering', 7),
  ('Tutoring', 'tutoring', 8);

-- Seed cleaning service types
insert into public.service_types (category_id, name, pricing_model, base_price, estimated_duration_mins)
select id, 'Deep clean', 'fixed', 450, 180 from public.service_categories where slug = 'cleaning';

insert into public.service_types (category_id, name, pricing_model, base_price, estimated_duration_mins)
select id, 'Standard clean', 'fixed', 250, 120 from public.service_categories where slug = 'cleaning';

insert into public.service_types (category_id, name, pricing_model, base_price, estimated_duration_mins)
select id, 'Move-out clean', 'fixed', 700, 300 from public.service_categories where slug = 'cleaning';

-- Seed plumbing (quote-based)
insert into public.service_types (category_id, name, pricing_model, description)
select id, 'Leak repair', 'quote_based', 'Submit a quote request, providers will bid'
from public.service_categories where slug = 'plumbing';

-- Indexes
create index idx_service_types_category_id on public.service_types(category_id);
create index idx_provider_services_provider_id on public.provider_services(provider_id);
create index idx_provider_services_service_type_id on public.provider_services(service_type_id);

-- Function to search providers near a point (used by providerService.ts)
create or replace function public.search_providers_near(
  lat numeric,
  lng numeric,
  radius_km integer default 10
)
returns table (
  provider_id uuid,
  user_id uuid,
  reputation_score numeric,
  rating_average numeric,
  distance_km numeric
)
language sql stable
as $$
  select
    pp.id as provider_id,
    pp.user_id,
    pp.reputation_score,
    pp.rating_average,
    round(
      (st_distance(
        sl.point,
        st_setsrid(st_makepoint(lng, lat), 4326)::geography
      ) / 1000)::numeric, 2
    ) as distance_km
  from public.provider_profiles pp
  join public.saved_locations sl on sl.user_id = pp.user_id
  where
    pp.verification_status = 'verified'
    and sl.is_default = true
    and st_dwithin(
      sl.point,
      st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  order by distance_km asc;
$$;
