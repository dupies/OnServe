-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  full_name text not null default '',
  avatar_url text,
  role user_role not null default 'customer',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create user record on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, phone, role)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at();

-- Provider profiles
create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bio text,
  id_document_url text,
  verification_status verification_status not null default 'pending',
  rating_average numeric(3,2) not null default 0,
  total_jobs_completed integer not null default 0,
  completion_rate numeric(5,2) not null default 0,
  no_show_rate numeric(5,2) not null default 0,
  dispute_rate numeric(5,2) not null default 0,
  reputation_score numeric(5,2) not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger provider_profiles_updated_at
  before update on public.provider_profiles
  for each row execute function public.update_updated_at();

-- Customer profiles
create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  cancellation_rate numeric(5,2) not null default 0,
  dispute_abuse_score numeric(5,2) not null default 0,
  location_trust_score numeric(5,2) not null default 0,
  reputation_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_provider_profiles_user_id on public.provider_profiles(user_id);
create index idx_customer_profiles_user_id on public.customer_profiles(user_id);
create index idx_provider_profiles_verification on public.provider_profiles(verification_status);
