create or replace function public.admin_overview()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'total_users', (select count(*) from public.users),
    'customers', (select count(*) from public.users where role = 'customer'),
    'providers', (select count(*) from public.users where role = 'provider'),
    'admins', (select count(*) from public.users where role = 'admin'),
    'new_signups_7d', (select count(*) from public.users where created_at > now() - interval '7 days'),
    'pending_verifications', (select count(*) from public.provider_profiles where verification_status = 'pending'),
    'open_disputes', (select count(*) from public.disputes where status in ('open', 'under_review', 'escalated'))
  );
$$;
revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to authenticated;
