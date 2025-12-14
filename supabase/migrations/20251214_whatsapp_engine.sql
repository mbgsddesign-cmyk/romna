-- Create WhatsApp Accounts Table
create table if not exists whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  provider text not null default 'twilio',
  display_name text,
  phone_number text, -- Store the number associated if needed for user reference
  is_default boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table whatsapp_accounts enable row level security;

create policy "Users can view their own whatsapp accounts"
  on whatsapp_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own whatsapp accounts"
  on whatsapp_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own whatsapp accounts"
  on whatsapp_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own whatsapp accounts"
  on whatsapp_accounts for delete
  using (auth.uid() = user_id);

-- Update execution_plans payload type check if possible? No, payload is jsonb.
-- But we can add a comment.
comment on table whatsapp_accounts is 'Stores user configuration for WhatsApp integration';
