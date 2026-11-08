-- Allow admins to edit any user's profile.
--
-- Admin status MUST come from public.users.role (via public.is_admin()), never
-- from auth.users.raw_user_meta_data: user metadata is writable by the user
-- themselves through supabase.auth.updateUser(), so a metadata check would let
-- anyone grant themselves admin rights.
--
-- provider_profiles needs no extra policy: provider_profiles_update_own
-- already allows `user_id = auth.uid() or public.is_admin()`.
--
-- (20260812000022 drops/recreates this policy idempotently as well.)
drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin" on public.users
  for update using (public.is_admin()) with check (public.is_admin());
