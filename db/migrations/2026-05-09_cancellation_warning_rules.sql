-- Pravila otkazivanja i crne liste:
-- - 3+ sata pre termina: otkazivanje bez posledica
-- - manje od 3 sata, ali više od 30 min: prvo upozorenje, drugo takvo otkazivanje -> crna lista
-- - 30 min ili manje pre termina / nedolazak: odmah crna lista

begin;

create table if not exists public.customer_cancel_warnings (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  salon_id uuid not null references public.saloni (id) on delete cascade,
  termin_id uuid null references public.termini (id) on delete set null,
  minutes_before numeric null,
  created_at timestamptz not null default now()
);

create index if not exists customer_cancel_warnings_auth_idx
  on public.customer_cancel_warnings (auth_user_id, created_at desc);

create index if not exists customer_cancel_warnings_salon_idx
  on public.customer_cancel_warnings (salon_id, created_at desc);

alter table public.customer_cancel_warnings enable row level security;

drop policy if exists customer_cancel_warnings_salon_read on public.customer_cancel_warnings;
create policy customer_cancel_warnings_salon_read
on public.customer_cancel_warnings
for select
to authenticated
using (
  exists (select 1 from public.saloni s where s.id = auth.uid())
);

create or replace function public.cancel_customer_appointment(
  p_termin_id uuid,
  p_salon_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_termin record;
  v_minutes_before numeric;
  v_previous_warnings integer := 0;
  v_tier text := 'early_ok';
begin
  if v_uid is null then
    raise exception 'Sesija kupca nije važeća. Prijavite se ponovo.';
  end if;

  select
    t.id,
    t.salon_id,
    t.client_id,
    t.datum_vrijeme,
    t.status,
    sc.ime,
    sc.telefon
  into v_termin
  from public.termini t
  join public.salon_clients sc
    on sc.id = t.client_id
  where t.id = p_termin_id
    and t.salon_id = p_salon_id
    and sc.salon_id = p_salon_id
    and sc.auth_user_id = v_uid
  limit 1;

  if v_termin.id is null then
    raise exception 'Termin nije pronađen ili ne pripada vašem nalogu.';
  end if;

  if v_termin.status = 'otkazan' then
    return jsonb_build_object(
      'success', true,
      'tier', 'already_cancelled',
      'message', 'Termin je već otkazan.'
    );
  end if;

  if v_termin.status = 'nije_dosao' then
    return jsonb_build_object(
      'success', false,
      'tier', 'blacklist',
      'message', 'Termin je označen kao nedolazak i nalog je već blokiran.'
    );
  end if;

  v_minutes_before := extract(epoch from (v_termin.datum_vrijeme - now())) / 60.0;

  select count(*)
  into v_previous_warnings
  from public.customer_cancel_warnings w
  where w.auth_user_id = v_uid;

  if v_minutes_before <= 30 then
    v_tier := 'blacklist';
  elsif v_minutes_before < 180 then
    if v_previous_warnings > 0 then
      v_tier := 'blacklist_repeat';
    else
      v_tier := 'late_warning';
    end if;
  else
    v_tier := 'early_ok';
  end if;

  update public.termini
  set status = 'otkazan'
  where id = v_termin.id;

  if v_tier = 'late_warning' then
    insert into public.customer_cancel_warnings (
      auth_user_id,
      salon_id,
      termin_id,
      minutes_before
    )
    values (
      v_uid,
      p_salon_id,
      p_termin_id,
      round(v_minutes_before * 10) / 10
    );
  end if;

  if v_tier in ('blacklist', 'blacklist_repeat') then
    insert into public.kupci_crna_lista (
      auth_user_id,
      telefon,
      ime,
      razlog,
      minuta_pre_otkazivanja,
      salon_id,
      termin_id
    )
    values (
      v_uid,
      v_termin.telefon,
      v_termin.ime,
      case
        when v_tier = 'blacklist_repeat' then 'ponovljeno_kasno_otkazivanje'
        else 'kasno_otkazivanje'
      end,
      round(v_minutes_before * 10) / 10,
      p_salon_id,
      p_termin_id
    )
    on conflict (auth_user_id)
    do update set
      telefon = excluded.telefon,
      ime = excluded.ime,
      razlog = excluded.razlog,
      minuta_pre_otkazivanja = excluded.minuta_pre_otkazivanja,
      salon_id = excluded.salon_id,
      termin_id = excluded.termin_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'tier', v_tier,
    'message',
    case v_tier
      when 'early_ok' then
        'Termin je otkazan bez posledica. Hvala što ste javili najmanje 3 sata pre termina.'
      when 'late_warning' then
        'Termin je otkazan. Ovo je upozorenje: otkazivanje manje od 3 sata pre termina otežava rad salona. Ako to ponovite, nalog može biti blokiran.'
      when 'blacklist_repeat' then
        'Termin je otkazan kasno po drugi put. Vaš nalog je stavljen na crnu listu dok administrator ne ukloni blokadu.'
      else
        'Termin je otkazan 30 minuta ili manje pre početka. Vaš nalog je stavljen na crnu listu dok administrator ne ukloni blokadu.'
    end
  );
end;
$$;

grant execute on function public.cancel_customer_appointment(uuid, uuid) to authenticated;

create or replace function public.salon_mark_appointment_no_show(
  p_termin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salon uuid := auth.uid();
  v_termin record;
begin
  if v_salon is null then
    raise exception 'Niste prijavljeni.';
  end if;

  if not exists (select 1 from public.saloni s where s.id = v_salon) then
    raise exception 'Samo salon može označiti nedolazak.';
  end if;

  select
    t.id,
    t.salon_id,
    t.client_id,
    t.status,
    sc.auth_user_id,
    sc.telefon,
    sc.ime
  into v_termin
  from public.termini t
  left join public.salon_clients sc
    on sc.id = t.client_id
  where t.id = p_termin_id
    and t.salon_id = v_salon
  limit 1;

  if v_termin.id is null then
    raise exception 'Termin nije pronađen.';
  end if;

  update public.termini
  set status = 'nije_dosao'
  where id = p_termin_id
    and salon_id = v_salon;

  insert into public.kupci_crna_lista (
    auth_user_id,
    telefon,
    ime,
    razlog,
    minuta_pre_otkazivanja,
    salon_id,
    termin_id
  )
  values (
    v_termin.auth_user_id,
    v_termin.telefon,
    v_termin.ime,
    'nije_dosao',
    0,
    v_salon,
    p_termin_id
  )
  on conflict (auth_user_id)
  do update set
    telefon = excluded.telefon,
    ime = excluded.ime,
    razlog = 'nije_dosao',
    minuta_pre_otkazivanja = 0,
    salon_id = excluded.salon_id,
    termin_id = excluded.termin_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Termin je označen kao nedolazak. Kupac je stavljen na crnu listu.'
  );
end;
$$;

grant execute on function public.salon_mark_appointment_no_show(uuid) to authenticated;

commit;
