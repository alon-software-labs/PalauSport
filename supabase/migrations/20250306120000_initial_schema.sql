-- PalauSport Cruise Reservation CRM - Initial Schema
-- Follows Postgres best practices: lowercase snake_case, bigint identity PKs,
-- timestamptz, numeric for money, indexed FKs, RLS

-- Enums
create type cabin_type as enum ('BUNK', 'QUEEN_SUITE');
create type reservation_status as enum ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- Sequence for invoice numbers
create sequence invoice_number_seq start 1;

-- cruise_events
create table cruise_events (
  id bigint generated always as identity primary key,
  name text not null,
  date date not null,
  destination text not null,
  capacity int not null default 26,
  current_bookings int not null default 0,
  created_at timestamptz not null default now()
);

-- reservations
create table reservations (
  id bigint generated always as identity primary key,
  event_id bigint not null references cruise_events(id) on delete cascade,
  cabin_id text not null,
  cabin_type cabin_type not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  passengers jsonb not null default '[]',
  status reservation_status not null default 'PENDING',
  total_guests int not null,
  total_price numeric(10,2) not null,
  notes text,
  invoice_generated boolean not null default false,
  created_at timestamptz not null default now()
);

create index reservations_event_id_idx on reservations (event_id);

-- invoices
create table invoices (
  id bigint generated always as identity primary key,
  reservation_id bigint not null references reservations(id) on delete cascade,
  invoice_number text unique,
  customer_name text not null,
  customer_email text not null,
  total_guests int not null,
  cabin_type cabin_type not null,
  total_price numeric(10,2) not null,
  generated_at timestamptz not null default now(),
  allergies text
);

create index invoices_reservation_id_idx on invoices (reservation_id);

-- Auto-generate invoice_number on insert
create or replace function set_invoice_number()
returns trigger as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || lpad(nextval('invoice_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger invoices_set_invoice_number
  before insert on invoices
  for each row
  execute function set_invoice_number();

-- Row Level Security
alter table cruise_events enable row level security;
alter table reservations enable row level security;
alter table invoices enable row level security;

create policy "cruise_events_authenticated" on cruise_events
  for all to authenticated using (true) with check (true);

create policy "reservations_authenticated" on reservations
  for all to authenticated using (true) with check (true);

create policy "invoices_authenticated" on invoices
  for all to authenticated using (true) with check (true);

-- Seed default cruise events
insert into cruise_events (name, date, destination, capacity, current_bookings) values
  ('Caribbean Dream', '2024-06-15', 'Caribbean Islands', 26, 0),
  ('Mediterranean Escape', '2024-07-20', 'Mediterranean Sea', 26, 0),
  ('Alaska Adventure', '2024-08-10', 'Alaska', 26, 0);
