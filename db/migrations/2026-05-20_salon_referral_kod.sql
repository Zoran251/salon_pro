-- Referal kod po salonu, veza preporučenog salona, trigger za validaciju i generisanje koda.
-- Idempotentno.

begin;

alter table public.saloni
  add column if not exists referal_kod text,
  add column if not exists preporucio_salon_id uuid references public.saloni (id) on delete set null,
  add column if not exists referal_kod_prijava text;

create unique index if not exists saloni_referal_kod_unique
  on public.saloni (referal_kod)
  where referal_kod is not null and btrim(referal_kod) <> '';

create index if not exists saloni_preporucio_salon_id_idx
  on public.saloni (preporucio_salon_id)
  where preporucio_salon_id is not null;

-- Jednokratno: postojećim salonima dodeli kod (kolizije retke — petlja po redu).
do $$
declare
  r record;
  v_try int;
  v_kod text;
begin
  for r in select id from public.saloni where referal_kod is null or btrim(referal_kod) = '' loop
    v_try := 0;
    loop
      v_try := v_try + 1;
      exit when v_try > 80;
      v_kod := upper(substring(md5(random()::text || clock_timestamp()::text || r.id::text) from 1 for 8));
      if not exists (select 1 from public.saloni s where s.referal_kod = v_kod) then
        update public.saloni set referal_kod = v_kod where id = r.id;
        exit;
      end if;
    end loop;
  end loop;
end $$;

create or replace function public.saloni_bi_referal_kod()
returns trigger
language plpgsql
as $$
declare
  v_ref uuid;
  v_kod text;
  v_try int;
  v_new_kod text;
begin
  -- Ne verujemo preporucio_salon_id sa klijenta — samo kod iz prijave.
  new.preporucio_salon_id := null;

  if new.referal_kod_prijava is not null and btrim(new.referal_kod_prijava) <> '' then
    v_kod := upper(regexp_replace(btrim(new.referal_kod_prijava), '[^A-Z0-9]', '', 'g'));
    if v_kod <> '' then
      select s.id into v_ref
      from public.saloni s
      where upper(s.referal_kod) = v_kod
        and s.id is distinct from new.id
      limit 1;
      if v_ref is not null then
        new.preporucio_salon_id := v_ref;
      end if;
    end if;
  end if;
  new.referal_kod_prijava := null;

  if new.referal_kod is null or btrim(new.referal_kod) = '' then
    v_try := 0;
    loop
      v_try := v_try + 1;
      exit when v_try > 60;
      v_new_kod := upper(substring(md5(random()::text || clock_timestamp()::text || coalesce(new.id::text, '')) from 1 for 8));
      if not exists (select 1 from public.saloni s where s.referal_kod = v_new_kod) then
        new.referal_kod := v_new_kod;
        exit;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists saloni_bi_referal_kod on public.saloni;
create trigger saloni_bi_referal_kod
  before insert on public.saloni
  for each row
  execute function public.saloni_bi_referal_kod();

commit;
