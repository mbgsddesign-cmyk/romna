create type email_provider as enum ('gmail', 'resend');

create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider email_provider not null,
  email_address text not null,
  display_name text,
  is_default boolean default false,
  credentials jsonb, -- Encrypted access_token, refresh_token, or verify_status
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table email_accounts enable row level security;

create policy "Users can view their own email accounts"
  on email_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own email accounts"
  on email_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own email accounts"
  on email_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own email accounts"
  on email_accounts for delete
  using (auth.uid() = user_id);
