-- Rashodi (expenses) table for salon analytics / P&L.
-- Run after 2026-03-01_core_salon_tables.sql because it references public.saloni.
begin;

create table if not exists public.rashodi (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.saloni(id) on delete cascade,
  naziv text not null,
  iznos numeric not null default 0 check (iznos >= 0),
  kategorija text not null default 'Ostalo',
  datum date not null default current_date,
  napomena text,
  created_at timestamptz not null default now()
);

alter table public.rashodi enable row level security;

drop policy if exists "Vlasnik vidi svoje rashode" on public.rashodi;
drop policy if exists "Vlasnik dodaje rashode" on public.rashodi;
drop policy if exists "Vlasnik briše svoje rashode" on public.rashodi;
drop policy if exists "Vlasnik ažurira svoje rashode" on public.rashodi;
drop policy if exists rashodi_owner_select on public.rashodi;
drop policy if exists rashodi_owner_insert on public.rashodi;
drop policy if exists rashodi_owner_update on public.rashodi;
drop policy if exists rashodi_owner_delete on public.rashodi;

create policy rashodi_owner_select
  on public.rashodi for select
  to authenticated
  using (salon_id = auth.uid());

create policy rashodi_owner_insert
  on public.rashodi for insert
  to authenticated
  with check (salon_id = auth.uid());

create policy rashodi_owner_update
  on public.rashodi for update
  to authenticated
  using (salon_id = auth.uid())
  with check (salon_id = auth.uid());

create policy rashodi_owner_delete
  on public.rashodi for delete
  to authenticated
  using (salon_id = auth.uid());

create index if not exists idx_rashodi_salon_datum on public.rashodi (salon_id, datum);

commit;
