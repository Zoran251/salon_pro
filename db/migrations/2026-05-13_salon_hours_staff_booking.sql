-- Opciono radno vreme po tipu dana + zaposleni i izbor zaposlenog pri zakazivanju.

begin;

alter table public.saloni
  add column if not exists radni_dani_od text,
  add column if not exists radni_dani_do text,
  add column if not exists subota_od text,
  add column if not exists subota_do text,
  add column if not exists nedelja_od text,
  add column if not exists nedelja_do text,
  add column if not exists nedelja_zatvoreno boolean not null default false;

update public.saloni
set
  radni_dani_od = coalesce(radni_dani_od, radno_od),
  radni_dani_do = coalesce(radni_dani_do, radno_do)
where (radni_dani_od is null or radni_dani_do is null)
  and (radno_od is not null or radno_do is not null);

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'saloni'
      and c.column_name = 'vikend_od'
  ) then
    execute '
      update public.saloni
      set
        subota_od = coalesce(subota_od, vikend_od),
        subota_do = coalesce(subota_do, vikend_do),
        nedelja_od = coalesce(nedelja_od, vikend_od),
        nedelja_do = coalesce(nedelja_do, vikend_do)
    ';
  end if;
end $$;

create table if not exists public.zaposleni (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.saloni(id) on delete cascade,
  ime text not null,
  uloga text,
  aktivan boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists zaposleni_salon_id_idx on public.zaposleni(salon_id);
create index if not exists zaposleni_public_idx on public.zaposleni(salon_id, aktivan);

alter table public.termini
  add column if not exists zaposleni_id uuid null references public.zaposleni(id) on delete set null;

create index if not exists termini_zaposleni_id_idx on public.termini(zaposleni_id);

alter table public.zaposleni enable row level security;

drop policy if exists zaposleni_public_read on public.zaposleni;
create policy zaposleni_public_read
on public.zaposleni
for select
to anon, authenticated
using (
  aktivan
  and exists (
    select 1
    from public.saloni s
    where s.id = zaposleni.salon_id
      and coalesce(s.aktivan, true)
  )
);

drop policy if exists zaposleni_owner_all on public.zaposleni;
create policy zaposleni_owner_all
on public.zaposleni
for all
to authenticated
using (salon_id = auth.uid())
with check (salon_id = auth.uid());

create or replace function public.create_authenticated_booking(
  p_salon_id uuid,
  p_client_id uuid,
  p_usluga_id uuid,
  p_zaposleni_id uuid,
  p_ime text,
  p_telefon text,
  p_datum_vrijeme timestamptz,
  p_napomena text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_ime text := trim(coalesce(p_ime, ''));
  v_telefon text := trim(coalesce(p_telefon, ''));
begin
  if v_uid is null then
    raise exception 'Za zakazivanje termina morate biti prijavljeni kao kupac.';
  end if;

  if p_salon_id is null then
    raise exception 'Nedostaje salon.';
  end if;

  if p_client_id is null then
    raise exception 'Nedostaje klijent.';
  end if;

  if v_ime = '' then
    raise exception 'Ime klijenta je obavezno.';
  end if;

  if v_telefon = '' then
    raise exception 'Telefon klijenta je obavezan.';
  end if;

  if p_datum_vrijeme is null then
    raise exception 'Datum i vreme su obavezni.';
  end if;

  if not exists (
    select 1
    from public.saloni s
    where s.id = p_salon_id
      and coalesce(s.aktivan, true)
  ) then
    raise exception 'Salon nije pronađen.';
  end if;

  if not exists (
    select 1
    from public.salon_clients sc
    where sc.id = p_client_id
      and sc.salon_id = p_salon_id
      and sc.auth_user_id = v_uid
  ) then
    raise exception 'Kupac nije povezan sa ovim salonom.';
  end if;

  if p_usluga_id is not null and not exists (
    select 1
    from public.usluge u
    where u.id = p_usluga_id
      and u.salon_id = p_salon_id
      and coalesce(u.aktivan, true)
  ) then
    raise exception 'Usluga nije pronađena za ovaj salon.';
  end if;

  if p_zaposleni_id is not null and not exists (
    select 1
    from public.zaposleni z
    where z.id = p_zaposleni_id
      and z.salon_id = p_salon_id
      and z.aktivan
  ) then
    raise exception 'Zaposleni nije pronađen za ovaj salon.';
  end if;

  insert into public.termini (
    salon_id,
    client_id,
    usluga_id,
    zaposleni_id,
    ime_klijenta,
    telefon_klijenta,
    datum_vrijeme,
    napomena,
    status
  )
  values (
    p_salon_id,
    p_client_id,
    p_usluga_id,
    p_zaposleni_id,
    v_ime,
    v_telefon,
    p_datum_vrijeme,
    nullif(trim(coalesce(p_napomena, '')), ''),
    'ceka'
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_authenticated_booking(uuid, uuid, uuid, uuid, text, text, timestamptz, text) to authenticated;

create or replace function public.notify_client_on_termini_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  v_client := new.client_id;
  if v_client is null and new.telefon_klijenta is not null then
    select sc.id
    into v_client
    from public.salon_clients sc
    where sc.salon_id = new.salon_id
      and trim(replace(coalesce(sc.telefon, ''), ' ', '')) = trim(replace(coalesce(new.telefon_klijenta, ''), ' ', ''))
    limit 1;
  end if;

  if v_client is not null then
    insert into public.notifications (salon_id, client_id, tip, title, body, appointment_id)
    values (
      new.salon_id,
      v_client,
      'appointment_created',
      'Zahtev za termin je poslat',
      'Vaš zahtev za termin je zabeležen. Salon će vas obavestiti čim termin bude potvrđen.',
      new.id
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_client_on_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  v_client := new.client_id;
  if v_client is null and new.telefon_klijenta is not null then
    select sc.id
    into v_client
    from public.salon_clients sc
    where sc.salon_id = new.salon_id
      and trim(replace(coalesce(sc.telefon, ''), ' ', '')) = trim(replace(coalesce(new.telefon_klijenta, ''), ' ', ''))
    limit 1;
  end if;

  if v_client is null then
    return new;
  end if;

  if old.status is distinct from new.status and new.status = 'potvrđen' then
    insert into public.notifications (salon_id, client_id, tip, title, body, appointment_id)
    values (
      new.salon_id,
      v_client,
      'appointment_confirmed',
      'Termin je potvrđen',
      'Salon je potvrdio vaš termin. Detalje možete pogledati u aplikaciji.',
      new.id
    );
  end if;

  if old.status is distinct from new.status and new.status = 'otkazan' then
    insert into public.notifications (salon_id, client_id, tip, title, body, appointment_id)
    values (
      new.salon_id,
      v_client,
      'appointment_cancelled',
      'Termin je otkazan',
      'Termin je otkazan. Ako imate pitanja, obratite se salonu.',
      new.id
    );
  end if;

  if old.datum_vrijeme is distinct from new.datum_vrijeme
    or old.usluga_id is distinct from new.usluga_id
    or old.zaposleni_id is distinct from new.zaposleni_id
  then
    insert into public.notifications (salon_id, client_id, tip, title, body, appointment_id)
    values (
      new.salon_id,
      v_client,
      'appointment_updated',
      'Termin je izmenjen',
      'Salon je izmenio detalje vašeg termina. Proverite nove podatke u aplikaciji.',
      new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.bump_loyalty_on_termin_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sv integer;
  v_akt boolean;
  v_tip text;
  v_vrijednost numeric;
  v_cnt integer;
  v_mod integer;
  v_prog integer;
  v_ready boolean;
  v_prev_ready boolean;
  v_reward text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.client_id is null then
    return new;
  end if;
  if new.status is distinct from 'potvrđen' then
    return new;
  end if;
  if coalesce(old.status, '') = 'potvrđen' then
    return new;
  end if;

  insert into public.loyalty_accounts (salon_id, client_id, visits_count, progress_percent, reward_ready, updated_at)
  values (new.salon_id, new.client_id, 0, 0, false, now())
  on conflict (salon_id, client_id) do nothing;

  select
    coalesce(l.aktivan, false),
    greatest(coalesce(l.svaki_koji, 5), 2),
    coalesce(l.tip, 'popust'),
    coalesce(l.vrijednost, 0)
  into v_akt, v_sv, v_tip, v_vrijednost
  from public.lojalnost l
  where l.salon_id = new.salon_id
  limit 1;

  v_akt := coalesce(v_akt, false);
  v_sv := greatest(coalesce(v_sv, 5), 2);
  v_tip := coalesce(v_tip, 'popust');
  v_vrijednost := coalesce(v_vrijednost, 0);

  select la.reward_ready into v_prev_ready
  from public.loyalty_accounts la
  where la.salon_id = new.salon_id and la.client_id = new.client_id
  limit 1;

  update public.loyalty_accounts la
  set
    visits_count = la.visits_count + 1,
    updated_at = now()
  where la.salon_id = new.salon_id and la.client_id = new.client_id
  returning la.visits_count into v_cnt;

  if v_akt then
    v_mod := v_cnt % v_sv;
    if v_mod = 0 then
      v_prog := 100;
      v_ready := true;
    else
      v_prog := least(100, greatest(0, round((v_mod::numeric / v_sv::numeric) * 100)));
      v_ready := false;
    end if;
  else
    v_prog := 0;
    v_ready := false;
  end if;

  update public.loyalty_accounts la
  set
    progress_percent = v_prog,
    reward_ready = v_ready,
    updated_at = now()
  where la.salon_id = new.salon_id and la.client_id = new.client_id;

  if v_tip = 'popust' then
    v_reward := trim(to_char(v_vrijednost, 'FM999999990.##')) || '% popusta';
  elsif v_tip = 'vaučer' then
    v_reward := 'vaučer od ' || trim(to_char(v_vrijednost, 'FM999999990.##')) || ' RSD';
  else
    v_reward := 'besplatna usluga';
  end if;

  if v_akt and v_ready and (not coalesce(v_prev_ready, false)) then
    insert into public.notifications (salon_id, client_id, tip, title, body, appointment_id)
    values (
      new.salon_id,
      new.client_id,
      'loyalty_reward_ready',
      'Nagrada lojalnosti je spremna',
      format('Ostvarili ste %s. posetu u ovom salonu. Vaša nagrada je %s.', v_sv, v_reward),
      new.id
    );
  end if;

  return new;
end;
$$;

update public.notifications
set
  title = case tip
    when 'appointment_created' then 'Zahtev za termin je poslat'
    when 'appointment_confirmed' then 'Termin je potvrđen'
    when 'appointment_cancelled' then 'Termin je otkazan'
    when 'appointment_updated' then 'Termin je izmenjen'
    when 'loyalty_reward_ready' then 'Nagrada lojalnosti je spremna'
    else title
  end,
  body = case tip
    when 'appointment_created' then 'Vaš zahtev za termin je zabeležen. Salon će vas obavestiti čim termin bude potvrđen.'
    when 'appointment_confirmed' then 'Salon je potvrdio vaš termin. Detalje možete pogledati u aplikaciji.'
    when 'appointment_cancelled' then 'Termin je otkazan. Ako imate pitanja, obratite se salonu.'
    when 'appointment_updated' then 'Salon je izmenio detalje vašeg termina. Proverite nove podatke u aplikaciji.'
    else body
  end
where tip in ('appointment_created', 'appointment_confirmed', 'appointment_cancelled', 'appointment_updated', 'loyalty_reward_ready');

commit;
