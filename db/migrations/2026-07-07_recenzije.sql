create table if not exists public.recenzije (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.saloni(id) on delete cascade,
  client_id uuid not null references public.salon_clients(id) on delete cascade,
  ocjena integer not null check (ocjena >= 1 and ocjena <= 5),
  komentar text default '',
  odgovor text default '',
  odgovor_created_at timestamptz,
  created_at timestamptz not null default now()
);

-- jedna recenzija po klijentu po salonu
alter table public.recenzije drop constraint if exists recenzije_unique_client_salon;
alter table public.recenzije add constraint recenzije_unique_client_salon unique (client_id, salon_id);

create index if not exists idx_recenzije_salon_id on public.recenzije(salon_id);

alter table public.recenzije enable row level security;

-- vlasnik salona vidi sve (select) i moze brisati/azurirati
drop policy if exists "Vlasnik moze sve na recenzije" on public.recenzije;
create policy "Vlasnik moze sve na recenzije"
  on public.recenzije
  using (
    salon_id in (select id from public.saloni where user_id = auth.uid())
  );

-- autentifikovani klijent insertuje / cita svoje
drop policy if exists "Klijent insert recenzija" on public.recenzije;
create policy "Klijent insert recenzija"
  on public.recenzije
  for insert
  with check (
    client_id in (select id from public.salon_clients where user_id = auth.uid())
  );

drop policy if exists "Klijent update svoje recenzije" on public.recenzije;
create policy "Klijent update svoje recenzije"
  on public.recenzije
  for update
  using (
    client_id in (select id from public.salon_clients where user_id = auth.uid())
  )
  with check (
    client_id in (select id from public.salon_clients where user_id = auth.uid())
  );

drop policy if exists "Javni select recenzije" on public.recenzije;
create policy "Javni select recenzije"
  on public.recenzije
  for select
  using (true);
