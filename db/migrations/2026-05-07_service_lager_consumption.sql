-- Povezivanje usluga sa lagerom i automatsko skidanje stanja pri potvrdi termina.
-- Lager se umanjuje tek kada salon potvrdi termin (status -> potvrđen).

begin;

create table if not exists public.usluga_lager_potrosnja (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.saloni (id) on delete cascade,
  usluga_id uuid not null references public.usluge (id) on delete cascade,
  lager_id uuid not null references public.lager (id) on delete cascade,
  kolicina numeric not null check (kolicina > 0),
  created_at timestamptz default now(),
  unique (usluga_id, lager_id)
);

create index if not exists usluga_lager_potrosnja_salon_idx
  on public.usluga_lager_potrosnja (salon_id);

create index if not exists usluga_lager_potrosnja_usluga_idx
  on public.usluga_lager_potrosnja (usluga_id);

create index if not exists usluga_lager_potrosnja_lager_idx
  on public.usluga_lager_potrosnja (lager_id);

alter table public.usluga_lager_potrosnja enable row level security;

drop policy if exists usluga_lager_potrosnja_owner_all on public.usluga_lager_potrosnja;
create policy usluga_lager_potrosnja_owner_all
on public.usluga_lager_potrosnja
for all
to authenticated
using (salon_id = auth.uid())
with check (salon_id = auth.uid());

create or replace function public.consume_lager_on_termin_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.usluga_id is null then
    return new;
  end if;

  if new.status is distinct from 'potvrđen' then
    return new;
  end if;

  if coalesce(old.status, '') = 'potvrđen' then
    return new;
  end if;

  update public.lager l
  set kolicina = greatest(0, l.kolicina - p.kolicina)
  from public.usluga_lager_potrosnja p
  where p.lager_id = l.id
    and p.usluga_id = new.usluga_id
    and p.salon_id = new.salon_id
    and l.salon_id = new.salon_id;

  return new;
end;
$$;

drop trigger if exists trg_consume_lager_on_termin_confirmed on public.termini;
create trigger trg_consume_lager_on_termin_confirmed
after update on public.termini
for each row execute function public.consume_lager_on_termin_confirmed();

commit;
