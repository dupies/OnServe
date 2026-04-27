-- Saved locations
create table public.saved_locations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  label location_label not null default 'Home',
  custom_name text,
  formatted_address text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  point geography(point, 4326),
  visit_count integer not null default 0,
  trust_score numeric(5,2) not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-compute PostGIS point from lat/lng
create or replace function public.set_location_point()
returns trigger language plpgsql
as $$
begin
  new.point = st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  return new;
end;
$$;

create trigger saved_locations_set_point
  before insert or update of latitude, longitude on public.saved_locations
  for each row execute function public.set_location_point();

-- Location events (captured at time of booking)
create table public.location_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  booking_id uuid, -- FK added after bookings table exists
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  point geography(point, 4326),
  formatted_address text not null,
  trust_level trust_level not null default 'unverified',
  captured_at timestamptz not null default now()
);

create trigger location_events_set_point
  before insert or update of latitude, longitude on public.location_events
  for each row execute function public.set_location_point();

-- Indexes
create index idx_saved_locations_user_id on public.saved_locations(user_id);
create index idx_saved_locations_point on public.saved_locations using gist(point);
create index idx_location_events_user_id on public.location_events(user_id);
create index idx_location_events_booking_id on public.location_events(booking_id);
