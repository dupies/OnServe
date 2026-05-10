-- Returns all verified providers ordered by distance from a point, with pagination.
-- Used by the provider search page to show all providers (not radius-limited).
create or replace function public.list_providers_near(
  lat numeric,
  lng numeric,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  bio text,
  verification_status text,
  rating_average numeric,
  total_jobs_completed integer,
  completion_rate numeric,
  no_show_rate numeric,
  dispute_rate numeric,
  reputation_score numeric,
  distance_km numeric
)
language sql stable
as $$
  select
    pp.id,
    pp.user_id,
    pp.bio,
    pp.verification_status::text,
    pp.rating_average,
    pp.total_jobs_completed,
    pp.completion_rate,
    pp.no_show_rate,
    pp.dispute_rate,
    pp.reputation_score,
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
  order by distance_km asc
  limit p_limit
  offset p_offset;
$$;
