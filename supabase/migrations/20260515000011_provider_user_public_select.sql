-- Marketplace visibility: allow any authenticated user to read basic info
-- for users who are providers (name, avatar shown on quote cards)
drop policy if exists "users_select_provider_public" on public.users;
create policy "users_select_provider_public" on public.users
  for select using (role = 'provider');
