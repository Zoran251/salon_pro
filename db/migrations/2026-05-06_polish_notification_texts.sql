-- Ujednačeni tekstovi obaveštenja na ekavici.

begin;

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
      'Vaš termin je otkazan. Ako imate pitanja, obratite se salonu.',
      new.id
    );
  end if;

  if old.datum_vrijeme is distinct from new.datum_vrijeme then
    insert into public.notifications (salon_id, client_id, tip, title, body, appointment_id)
    values (
      new.salon_id,
      v_client,
      'appointment_updated',
      'Termin je izmenjen',
      'Salon je izmenio datum ili vreme vašeg termina. Proverite nove detalje u aplikaciji.',
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
  v_cnt integer;
  v_mod integer;
  v_prog integer;
  v_ready boolean;
  v_prev_ready boolean;
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
    coalesce((select l.aktivan from public.lojalnost l where l.salon_id = new.salon_id limit 1), false),
    greatest(coalesce((select l.svaki_koji from public.lojalnost l where l.salon_id = new.salon_id limit 1), 5), 2)
  into v_akt, v_sv;

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

  if v_akt and v_ready and (not coalesce(v_prev_ready, false)) then
    insert into public.notifications (salon_id, client_id, tip, title, body, appointment_id)
    values (
      new.salon_id,
      new.client_id,
      'loyalty_reward_ready',
      'Nagrada lojalnosti je spremna',
      format('Ostvarili ste %s. posetu u ovom salonu. Pitajte osoblje kako možete iskoristiti nagradu.', v_sv),
      new.id
    );
  end if;

  return new;
end;
$$;

commit;
