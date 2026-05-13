-- Zakazivanje po mreži od 15 min + trajanje usluge; isti zaposleni ne može preklapajuće termine.
-- Predlog prvih N slobodnih slotova za izabrani dan (Europe/Belgrade).

begin;

-- ---------------------------------------------------------------------------
-- Pomoć: tekst "09:30" ili "9:00" -> minuti od ponoći [0..1440)
-- ---------------------------------------------------------------------------
create or replace function public._tekst_u_minute_od_ponoci(t text)
returns int
language plpgsql
immutable
as $$
declare
  p text := trim(coalesce(t, ''));
  a text[];
  hh int;
  mi int;
begin
  if p = '' then
    return null;
  end if;
  a := string_to_array(p, ':');
  if array_length(a, 1) is null or array_length(a, 1) < 1 then
    return null;
  end if;
  hh := a[1]::int;
  mi := case when array_length(a, 1) >= 2 and nullif(trim(a[2]), '') is not null then trim(a[2])::int else 0 end;
  if hh < 0 or hh > 23 or mi < 0 or mi > 59 then
    return null;
  end if;
  return hh * 60 + mi;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trajanje usluge u minutama (ograničeno 5–480, podrazumevano 30)
-- ---------------------------------------------------------------------------
create or replace function public.usluga_trajanje_minuta(p_usluga_id uuid, p_salon_id uuid)
returns int
language sql
stable
as $$
  select greatest(
    5,
    least(
      480,
      coalesce(
        (select u.trajanje from public.usluge u where u.id = p_usluga_id and u.salon_id = p_salon_id),
        30
      )
    )
  )::int;
$$;

-- ---------------------------------------------------------------------------
-- Da li postoji preklapanje za zaposlenog (NULL = NULL kao isti „red“)
-- ---------------------------------------------------------------------------
create or replace function public._termin_preklapanje_postoji(
  p_salon_id uuid,
  p_zaposleni_id uuid,
  p_start timestamptz,
  p_dur_min int,
  p_exclude_termin_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.termini t
    left join public.usluge u on u.id = t.usluga_id and u.salon_id = t.salon_id
    where t.salon_id = p_salon_id
      and t.id is distinct from p_exclude_termin_id
      and coalesce(t.status, '') not in ('otkazan', 'nije_dosao')
      and (t.zaposleni_id is not distinct from p_zaposleni_id)
      and t.datum_vrijeme < p_start + make_interval(mins => greatest(5, least(480, p_dur_min)))
      and p_start < t.datum_vrijeme + make_interval(
        mins => greatest(
          5,
          least(480, coalesce(u.trajanje, 30))
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- BEFORE INSERT/UPDATE: zaključavanje po salonu+zaposlenom + provera preklapanja
-- ---------------------------------------------------------------------------
create or replace function public.trg_termini_provera_preklapanja()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dur int;
begin
  if tg_op = 'UPDATE' then
    if new.datum_vrijeme is not distinct from old.datum_vrijeme
      and new.zaposleni_id is not distinct from old.zaposleni_id
      and new.usluga_id is not distinct from old.usluga_id
      and new.status is not distinct from old.status
    then
      return new;
    end if;
  end if;

  if new.status is not null and new.status in ('otkazan', 'nije_dosao') then
    return new;
  end if;

  v_dur := public.usluga_trajanje_minuta(new.usluga_id, new.salon_id);

  perform pg_advisory_xact_lock(
    hashtext(new.salon_id::text || '|' || coalesce(new.zaposleni_id::text, 'null'))
  );

  if public._termin_preklapanje_postoji(
    new.salon_id,
    new.zaposleni_id,
    new.datum_vrijeme,
    v_dur,
    new.id
  ) then
    raise exception 'SLOT_ZAUZET'
      using errcode = 'P0001',
        message = 'SLOT_ZAUZET',
        hint = 'Izaberite drugo vreme ili drugog zaposlenog.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_termini_provera_preklapanja on public.termini;
create trigger trg_termini_provera_preklapanja
before insert or update of datum_vrijeme, zaposleni_id, usluga_id, status
on public.termini
for each row
execute function public.trg_termini_provera_preklapanja();

-- ---------------------------------------------------------------------------
-- Prvi N slobodnih početaka (mreža 15 min) u radnom vremenu za jedan kalendar dan
-- p_dan = datum u kalendaru Srbije (bez zone, npr. iz forme)
-- p_exclude_termin_id: pri izmeni termina — ne računaj preklapanje sa samim sobom
-- ---------------------------------------------------------------------------
drop function if exists public.predlozi_slobodne_slotove(uuid, uuid, uuid, date, int);

create or replace function public.predlozi_slobodne_slotove(
  p_salon_id uuid,
  p_usluga_id uuid,
  p_zaposleni_id uuid,
  p_dan date,
  p_limit int default 3,
  p_exclude_termin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_dur int;
  v_dow int;
  v_open text;
  v_close text;
  v_open_m int;
  v_close_m int;
  v_sm int;
  v_hh int;
  v_mi int;
  v_start timestamptz;
  v_arr timestamptz[] := array[]::timestamptz[];
  v_cnt int := 0;
  v_ts0 timestamptz;
  v_ts text;
  v_today date;
begin
  if p_limit < 1 then
    p_limit := 1;
  end if;
  if p_limit > 20 then
    p_limit := 20;
  end if;

  v_today := (now() at time zone 'Europe/Belgrade')::date;
  if p_dan < v_today then
    return '[]'::jsonb;
  end if;

  select * into s from public.saloni where id = p_salon_id and coalesce(aktivan, true);
  if not found then
    return '[]'::jsonb;
  end if;

  v_dur := public.usluga_trajanje_minuta(p_usluga_id, p_salon_id);

  v_ts0 := (p_dan::text || ' 12:00:00')::timestamp without time zone at time zone 'Europe/Belgrade';
  v_dow := extract(isodow from (v_ts0))::int;

  if v_dow = 7 then
    if coalesce(s.nedelja_zatvoreno, false) then
      return '[]'::jsonb;
    end if;
    v_open := coalesce(nullif(trim(s.nedelja_od), ''), nullif(trim(s.radni_dani_od), ''), trim(s.radno_od));
    v_close := coalesce(nullif(trim(s.nedelja_do), ''), nullif(trim(s.radni_dani_do), ''), trim(s.radno_do));
  elsif v_dow = 6 then
    v_open := coalesce(nullif(trim(s.subota_od), ''), nullif(trim(s.radni_dani_od), ''), trim(s.radno_od));
    v_close := coalesce(nullif(trim(s.subota_do), ''), nullif(trim(s.radni_dani_do), ''), trim(s.radno_do));
  else
    v_open := coalesce(nullif(trim(s.radni_dani_od), ''), trim(s.radno_od));
    v_close := coalesce(nullif(trim(s.radni_dani_do), ''), trim(s.radno_do));
  end if;

  v_open_m := public._tekst_u_minute_od_ponoci(v_open);
  v_close_m := public._tekst_u_minute_od_ponoci(v_close);
  if v_open_m is null or v_close_m is null or v_close_m <= v_open_m then
    return '[]'::jsonb;
  end if;

  for v_sm in select generate_series(v_open_m, v_close_m - v_dur, 15)
  loop
    v_hh := v_sm / 60;
    v_mi := v_sm % 60;
    v_ts := p_dan::text || ' '
      || lpad(v_hh::text, 2, '0') || ':'
      || lpad(v_mi::text, 2, '0') || ':00';
    v_start := v_ts::timestamp without time zone at time zone 'Europe/Belgrade';

    if v_start < now() + interval '3 minutes' then
      continue;
    end if;

    if not public._termin_preklapanje_postoji(p_salon_id, p_zaposleni_id, v_start, v_dur, p_exclude_termin_id) then
      v_arr := array_append(v_arr, v_start);
      v_cnt := v_cnt + 1;
      exit when v_cnt >= p_limit;
    end if;
  end loop;

  return case when cardinality(v_arr) = 0 then '[]'::jsonb else to_jsonb(v_arr) end;
end;
$$;

grant execute on function public.predlozi_slobodne_slotove(uuid, uuid, uuid, date, int, uuid) to anon, authenticated;
grant execute on function public.usluga_trajanje_minuta(uuid, uuid) to anon, authenticated;

commit;
