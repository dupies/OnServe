-- Ratings (dual — both sides rate each other)
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  rated_by_user_id uuid not null references public.users(id),
  rated_user_id uuid not null references public.users(id),
  score integer not null check (score between 1 and 5),
  comment text,
  is_provider_rating boolean not null, -- true = customer rating provider, false = provider rating customer
  created_at timestamptz not null default now(),
  unique(booking_id, rated_by_user_id) -- one rating per person per booking
);

-- After a rating is inserted, update the provider's average rating
create or replace function public.update_provider_rating()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_provider_user_id uuid;
  v_new_avg numeric;
  v_new_count integer;
begin
  -- Only run for provider ratings
  if not new.is_provider_rating then
    return new;
  end if;

  -- Get provider user_id from the booking
  select b.provider_id into v_provider_user_id
  from public.bookings b
  join public.provider_profiles pp on pp.id = b.provider_id
  where b.id = new.booking_id
  limit 1;

  if v_provider_user_id is null then
    return new;
  end if;

  -- Recalculate average
  select
    round(avg(r.score)::numeric, 2),
    count(*)
  into v_new_avg, v_new_count
  from public.ratings r
  join public.bookings b on b.id = r.booking_id
  join public.provider_profiles pp on pp.id = b.provider_id
  where pp.user_id = v_provider_user_id
    and r.is_provider_rating = true;

  update public.provider_profiles
  set
    rating_average = coalesce(v_new_avg, 0),
    total_jobs_completed = v_new_count
  where user_id = v_provider_user_id;

  return new;
end;
$$;

create trigger after_rating_insert
  after insert on public.ratings
  for each row execute function public.update_provider_rating();

-- Indexes
create index idx_ratings_booking_id on public.ratings(booking_id);
create index idx_ratings_rated_user_id on public.ratings(rated_user_id);
create index idx_ratings_is_provider_rating on public.ratings(is_provider_rating);
