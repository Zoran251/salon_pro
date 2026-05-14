-- Radno vreme salona (Europe/Belgrade) + zabrana preklapanja termina istog zaposlenog (trajanje iz usluge).

begin;

create or replace function public._vreme_tekst_u_minute_od_ponoci(t text)
returns int
language sql
immutable
as $$
  select case
    when t is null or btrim(t) = '' then 0
    else
      coalesce(nullif(split_part(btrim(t), ':', 1), '')::int, 0) * 60
      + coalesce(nullif(split_part(btrim(t), ':', 2), ''), '')::int
  end;
$$;

create or replace function public.usluga_trajanje_minuta(p_usluga_id uuid, p_salon_id uuid)
returns int
language plpgsql
stable
as $$
declare
  v int;
begin
  if p_usluga_id is null then
    return 30;
  end if;
  select greatest(5, least(480, coalesce(u.trajanje, 30)::int))
  into v
  from public.usluge u
  where u.id = p_usluga_id
    and u.salon_id = p_salon_id;
  if not found then
    return 30;
  end if;
  return v;
end;
$$;

create or replace function public._termin_preklapanje_postoji(
  p_salon_id uuid,
  p_zaposleni_id uuid,
  p_start timestamptz,
  p_dur_min int,
  p_exclude_termin_id uuid
)
returns boolean
language plpgsql
stable
as $$
declare
  v_zap uuid := coalesce(p_zaposleni_id, '00000000-0000-0000-0000-000000000000'::uuid);
  v_end timestamptz := p_start + make_interval(mins => greatest(p_dur_min, 1));
begin
  return exists (
    select 1
    from public.termini t
    where t.salon_id = p_salon_id
      and coalesce(t.zaposleni_id, '00000000-0000-0000-0000-000000000000'::uuid) = v_zap
      and (p_exclude_termin_id is null or t.id <> p_exclude_termin_id)
      and t.status is distinct from 'otkazan'
      and t.status is distinct from 'nije_dosao'
      and tstzrange(
        t.datum_vrijeme,
        t.datum_vrijeme + make_interval(mins => public.usluga_trajanje_minuta(t.usluga_id, p_salon_id)),
        '[)'
      ) && tstzrange(p_start, v_end, '[)')
  );
end;
$$;

create or replace function public._salon_radni_prozor_za_termin(
  p_salon_id uuid,
  p_start timestamptz,
  p_dur_min int
)
returns boolean
language plpgsql
stable
as $$
declare
  v record;
  v_dow int;
  v_od text;
  v_do text;
  v_o int;
  v_c int;
  v_start_min int;
  v_end_min int;
  v_dur int := greatest(p_dur_min, 1);
begin
  select
    s.radno_od,
    s.radno_do,
    s.radni_dani_od,
    s.radni_dani_do,
    s.subota_od,
    s.subota_do,
    s.nedelja_od,
    s.nedelja_do,
    coalesce(s.nedelja_zatvoreno, false) as ned_zat
  into v
  from public.saloni s
  where s.id = p_salon_id;

  if not found then
    return false;
  end if;

  v_dow := extract(dow from (p_start at time zone 'Europe/Belgrade'))::int;

  if v_dow = 0 then
    if v.ned_zat then
      return false;
    end if;
    v_od := nullif(btrim(coalesce(v.nedelja_od, '')), '');
    v_do := nullif(btrim(coalesce(v.nedelja_do, '')), '');
    if (v_od is null or v_do is null) and nullif(btrim(coalesce(v.radno_od, '')), '') is not null then
      v_od := btrim(v.radno_od);
      v_do := nullif(btrim(coalesce(v.radno_do, '')), '');
    end if;
  elsif v_dow = 6 then
    v_od := nullif(btrim(coalesce(v.subota_od, '')), '');
    v_do := nullif(btrim(coalesce(v.subota_do, '')), '');
    if v_od is null or v_do is null then
      v_od := nullif(btrim(coalesce(v.radni_dani_od, v.radno_od, '')), '');
      v_do := nullif(btrim(coalesce(v.radni_dani_do, v.radno_do, '')), '');
    end if;
  else
    v_od := nullif(btrim(coalesce(v.radni_dani_od, v.radno_od, '')), '');
    v_do := nullif(btrim(coalesce(v.radni_dani_do, v.radno_do, '')), '');
  end if;

  if v_od is null or v_do is null or v_od = '' or v_do = '' then
    return true;
  end if;

  v_o := public._vreme_tekst_u_minute_od_ponoci(v_od);
  v_c := public._vreme_tekst_u_minute_od_ponoci(v_do);
  if v_c <= v_o then
    return false;
  end if;

  v_start_min :=
    extract(hour from (p_start at time zone 'Europe/Belgrade'))::int * 60
    + extract(minute from (p_start at time zone 'Europe/Belgrade'))::int;
  v_end_min := v_start_min + v_dur;

  if v_start_min < v_o or v_end_min > v_c then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.trg_termini_poslovna_pravila()
returns trigger
language plpgsql
as $$
declare
  v_dur int;
  v_pre boolean;
begin
  if new.status in ('otkazan', 'nije_dosao') then
    return new;
  end if;

  v_dur := public.usluga_trajanje_minuta(new.usluga_id, new.salon_id);

  if not public._salon_radni_prozor_za_termin(new.salon_id, new.datum_vrijeme, v_dur) then
    raise exception 'RADNO_VREME: Termin nije unutar radnog vremena ili je salon zatvoren tog dana.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(concat_ws(':', new.salon_id::text, coalesce(new.zaposleni_id::text, 'nil')), 0)
  );

  select public._termin_preklapanje_postoji(
    new.salon_id,
    new.zaposleni_id,
    new.datum_vrijeme,
    v_dur,
    new.id
  )
  into v_pre;

  if v_pre then
    raise exception 'SLOT_ZAUZET: Zauzet termin za istog zaposlenog u izabranom intervalu.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_termini_poslovna_pravila on public.termini;

create trigger trg_termini_poslovna_pravila
before insert or update of datum_vrijeme, usluga_id, zaposleni_id, status, salon_id, client_id
on public.termini
for each row
execute function public.trg_termini_poslovna_pravila();

commit;
