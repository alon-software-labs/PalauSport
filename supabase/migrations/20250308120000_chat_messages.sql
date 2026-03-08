-- Chat messages: one thread per reservation
-- Follows Postgres best practices: lowercase snake_case, bigint identity PKs,
-- timestamptz, indexed FKs, RLS

create table public.chat_messages (
  id bigint generated always as identity primary key,
  reservation_id bigint not null references reservations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role public.app_role not null,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_reservation_id_idx on chat_messages (reservation_id);
create index chat_messages_reservation_created_idx on chat_messages (reservation_id, created_at);

-- Row Level Security
alter table chat_messages enable row level security;

-- Employees: full CRUD on all chat messages
create policy "chat_messages_employee_all" on chat_messages
  for all to authenticated using (public.is_employee()) with check (public.is_employee());

-- Clients: SELECT and INSERT only for their own reservations
create policy "chat_messages_client_select_own" on chat_messages
  for select to authenticated using (
    public.is_client()
    and exists (
      select 1 from reservations r
      where r.id = chat_messages.reservation_id
      and r.customer_email = auth.jwt() ->> 'email'
    )
  );

create policy "chat_messages_client_insert_own" on chat_messages
  for insert to authenticated with check (
    public.is_client()
    and exists (
      select 1 from reservations r
      where r.id = chat_messages.reservation_id
      and r.customer_email = auth.jwt() ->> 'email'
    )
  );

-- Enable Realtime for chat_messages
alter publication supabase_realtime add table chat_messages;
