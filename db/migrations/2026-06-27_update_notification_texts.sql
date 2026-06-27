-- Ažuriranje tekstova notifikacija u DB triggerima
-- Potvrda: "Vaš termin je potvrđen, ukoliko trebate izmjeniti nešto uradite to najkasnije 6h prije termina"
-- Podsjetnik 1h: "Vaš termin je za 1h, hvala vam što koristite naše usluge"

begin;

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
      'Vaš termin je potvrđen, ukoliko trebate izmjeniti nešto uradite to najkasnije 6h prije termina.',
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

commit;
