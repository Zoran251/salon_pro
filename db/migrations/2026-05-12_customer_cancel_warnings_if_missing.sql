-- Popravka: ako je pokrenuta migracija 2026-05-10 (cancel_customer_appointment + salon_notifications)
-- pre 2026-05-09, funkcija referiše public.customer_cancel_warnings koja ne postoji.
-- Ova skripta je idempotentna (IF NOT EXISTS / DROP IF EXISTS).

begin;

create table if not exists public.customer_cancel_warnings (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  salon_id uuid not null references public.saloni (id) on delete cascade,
  termin_id uuid null references public.termini (id) on delete set null,
  minutes_before numeric null,
  created_at timestamptz not null default now()
);

create index if not exists customer_cancel_warnings_auth_idx
  on public.customer_cancel_warnings (auth_user_id, created_at desc);

create index if not exists customer_cancel_warnings_salon_idx
  on public.customer_cancel_warnings (salon_id, created_at desc);

alter table public.customer_cancel_warnings enable row level security;

drop policy if exists customer_cancel_warnings_salon_read on public.customer_cancel_warnings;
create policy customer_cancel_warnings_salon_read
on public.customer_cancel_warnings
for select
to authenticated
using (
  exists (select 1 from public.saloni s where s.id = auth.uid())
);

commit;
