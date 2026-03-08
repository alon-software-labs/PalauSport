-- Track when each employee last read each chat thread
create table public.chat_thread_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  reservation_id bigint not null references reservations(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, reservation_id)
);

create index chat_thread_reads_reservation_id_idx on chat_thread_reads (reservation_id);

alter table chat_thread_reads enable row level security;

-- Employees only
create policy "chat_thread_reads_employee_all" on chat_thread_reads
  for all to authenticated using (public.is_employee()) with check (public.is_employee());
