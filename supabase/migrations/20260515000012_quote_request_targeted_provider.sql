-- Add optional targeted provider to quote requests.
-- When set, only that provider can see the request; when null, any provider can browse it.
alter table public.quote_requests
  add column targeted_provider_id uuid references public.provider_profiles(id);

create index idx_quote_requests_targeted_provider
  on public.quote_requests(targeted_provider_id)
  where targeted_provider_id is not null;

-- Tighten provider visibility: targeted requests are private to the named provider
drop policy "quote_requests_select_participant" on public.quote_requests;
create policy "quote_requests_select_participant" on public.quote_requests
  for select using (
    customer_id = auth.uid()
    or (
      public.is_provider()
      and (
        targeted_provider_id is null
        or exists (
          select 1 from public.provider_profiles
          where id = targeted_provider_id and user_id = auth.uid()
        )
      )
    )
    or public.is_admin()
  );
