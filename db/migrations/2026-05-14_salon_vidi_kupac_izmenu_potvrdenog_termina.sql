-- Zastavica last_updated_by_client + obaveštenje salonu kada kupac izmeni potvrđen termin.
-- Ispravka: kupac ne dobija obaveštenje „Salon je izmenio“ kada je izmenu napravio sam.

begin;

alter table public.termini
  add column if not exists last_updated_by_client boolean not null default false;

create index if not exists termini_last_updated_by_client_idx
  on public.termini (salon_id)
  where last_updated_by_client;

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

  if (
    old.datum_vrijeme is distinct from new.datum_vrijeme
    or old.usluga_id is distinct from new.usluga_id
    or old.zaposleni_id is distinct from new.zaposleni_id
  )
    and not coalesce(new.last_updated_by_client, false)
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

create or replace function public.notify_salon_on_customer_termin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ime text;
  v_changed boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is distinct from 'potvrđen' then
    return new;
  end if;

  if not coalesce(new.last_updated_by_client, false) then
    return new;
  end if;

  v_changed :=
    old.datum_vrijeme is distinct from new.datum_vrijeme
    or old.usluga_id is distinct from new.usluga_id
    or old.zaposleni_id is distinct from new.zaposleni_id
    or old.napomena is distinct from new.napomena;

  if not v_changed then
    return new;
  end if;

  if to_regclass('public.salon_notifications') is null then
    return new;
  end if;

  select sc.ime into v_ime
  from public.salon_clients sc
  where sc.id = new.client_id
  limit 1;

  insert into public.salon_notifications (
    salon_id,
    tip,
    title,
    body,
    appointment_id
  )
  values (
    new.salon_id,
    'appointment_updated_by_customer',
    'Kupac je izmenio potvrđen termin',
    format(
      '%s je ažurirao/la zakazani termin (novi početak: %s). Proverite listu termina.',
      coalesce(nullif(trim(v_ime), ''), nullif(trim(new.ime_klijenta), ''), 'Kupac'),
      to_char(new.datum_vrijeme at time zone 'Europe/Belgrade', 'DD.MM.YYYY. HH24:MI')
    ),
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_salon_customer_termin on public.termini;
create trigger trg_notify_salon_customer_termin
after update on public.termini
for each row
execute function public.notify_salon_on_customer_termin_change();

commit;
