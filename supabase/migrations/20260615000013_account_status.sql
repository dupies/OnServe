drop type if exists account_status cascade;
create type account_status as enum ('active', 'suspended', 'banned');

alter table public.users
  add column if not exists account_status account_status not null default 'active',
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz;

create index if not exists idx_users_account_status on public.users(account_status);
