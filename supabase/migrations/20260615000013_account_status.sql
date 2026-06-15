create type account_status as enum ('active', 'suspended', 'banned');

alter table public.users
  add column account_status account_status not null default 'active',
  add column suspension_reason text,
  add column suspended_at timestamptz;

create index idx_users_account_status on public.users(account_status);
