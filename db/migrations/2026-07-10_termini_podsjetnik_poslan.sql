alter table public.termini
  add column if not exists podsjetnik_poslan boolean not null default false;

create index if not exists termini_podsjetnik_idx on public.termini (podsjetnik_poslan, datum_vrijeme)
  where status = 'potvrđen' and podsjetnik_poslan = false;
