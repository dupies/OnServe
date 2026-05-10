-- Fix list_providers_near:
-- 1. SECURITY DEFINER so it bypasses RLS on saved_locations (provider locations)
-- 2. LEFT JOIN so providers without a saved location still appear (distance = NULL, sorted last)
-- Also fixes search_providers_near with SECURITY DEFINER for the same reason.

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
language sql stable security definer set search_path = public
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
    case when sl.point is not null then
      round(
        (st_distance(
          sl.point,
          st_setsrid(st_makepoint(lng, lat), 4326)::geography
        ) / 1000)::numeric, 2
      )
    else null end as distance_km
  from public.provider_profiles pp
  left join public.saved_locations sl
    on sl.user_id = pp.user_id and sl.is_default = true
  where pp.verification_status = 'verified'
  order by distance_km asc nulls last
  limit p_limit
  offset p_offset;
$$;

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
language sql stable security definer set search_path = public
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
