-- Create private storage bucket for identity documents
-- public = false ensures no public URL access; all access requires signed URLs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-documents',
  'identity-documents',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Storage RLS: only the document owner may upload into their own folder
create policy "Users can upload own identity documents"
  on storage.objects for insert
  with check (
    bucket_id = 'identity-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: owner can read; admins can read any
create policy "Users can read own identity documents"
  on storage.objects for select
  using (
    bucket_id = 'identity-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

-- Storage RLS: owner or admin may delete
create policy "Users or admins can delete identity documents"
  on storage.objects for delete
  using (
    bucket_id = 'identity-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

-- Create identity_documents table
create table public.identity_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('national_id', 'passport', 'driver_license', 'proof_residence')),
  document_url text not null, -- Signed URL or storage path
  uploaded_at timestamp with time zone not null default now(),
  verified_at timestamp with time zone, -- Set when admin approves
  verified_by_admin_id uuid references auth.users(id) on delete set null,
  rejection_reason text, -- Why document was rejected
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for performance
create index if not exists idx_identity_documents_user_id on public.identity_documents(user_id);
create index if not exists idx_identity_documents_verified_at on public.identity_documents(verified_at);

-- Partial unique index: only one unverified document per type per user
create unique index if not exists idx_identity_documents_pending on public.identity_documents(user_id, document_type)
  where verified_at is null;

-- Enable RLS
alter table public.identity_documents enable row level security;

-- Users can see and insert their own documents
create policy "Users can view own documents" on public.identity_documents
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own documents" on public.identity_documents
  for insert with check (auth.uid() = user_id);

-- Admins can update verification status
create policy "Admins can update verification status" on public.identity_documents
  for update using (public.is_admin())
  with check (public.is_admin());

-- Users cannot delete their own; only admins can
create policy "Admins can delete documents" on public.identity_documents
  for delete using (public.is_admin());

-- Auto-update trigger for updated_at
create trigger update_identity_documents_updated_at
  before update on public.identity_documents
  for each row
  execute function public.update_updated_at();
