-- Rashodi (expenses) table for salon analytics / P&L
create table if not exists public.rashodi (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.saloni(id) on delete cascade,
  naziv text not null,
  iznos numeric not null default 0,
  kategorija text not null default 'Ostalo',
  datum date not null default current_date,
  napomena text,
  created_at timestamptz not null default now()
);

alter table public.rashodi enable row level security;

create policy "Vlasnik vidi svoje rashode"
  on public.rashodi for select
  using (salon_id = auth.uid());

create policy "Vlasnik dodaje rashode"
  on public.rashodi for insert
  with check (salon_id = auth.uid());

create policy "Vlasnik briše svoje rashode"
  on public.rashodi for delete
  using (salon_id = auth.uid());

create policy "Vlasnik ažurira svoje rashode"
  on public.rashodi for update
  using (salon_id = auth.uid())
  with check (salon_id = auth.uid());

create index if not exists idx_rashodi_salon_datum on public.rashodi (salon_id, datum);
