create table if not exists public.salon_slike (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.saloni(id) on delete cascade,
  url text not null,
  opis text default '',
  redoslijed integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_salon_slike_salon_id on public.salon_slike(salon_id);

alter table public.salon_slike enable row level security;

drop policy if exists "Vlasnik moze sve na salon_slike" on public.salon_slike;
create policy "Vlasnik moze sve na salon_slike"
  on public.salon_slike
  using (
    salon_id = auth.uid()
  );

drop policy if exists "Javni select salon_slike" on public.salon_slike;
create policy "Javni select salon_slike"
  on public.salon_slike
  for select
  using (true);
