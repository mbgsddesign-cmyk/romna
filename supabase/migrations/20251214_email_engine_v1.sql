-- Recreate or Align email_accounts table
-- Dropping previous to ensure clean state if no data
drop table if exists email_accounts;

create table email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text check (provider in ('gmail', 'resend')) not null,
  email_address text not null,
  display_name text,
  is_default boolean default false,
  credentials_encrypted text not null, -- Stores encrypted JSON string (AuthTag + Payload)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Partial unique index for One Default Per User
create unique index email_accounts_user_default_idx 
  on email_accounts (user_id) 
  where is_default = true;

-- Update Trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_email_accounts_modtime
    before update on email_accounts
    for each row
    execute procedure update_updated_at_column();

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
