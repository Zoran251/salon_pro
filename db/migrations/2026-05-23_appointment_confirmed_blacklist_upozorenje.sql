-- Tekst obaveštenja kupcu kada salon potvrdi termin: upozorenje o roku od 6h i crnoj listi.

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
      'Termin vam je potvrđen',
      'Termin vam je potvrđen. Ukoliko dođe do izmena obavite ih najkasnije 6 sati pre vašeg termina kako bi izbegli blokiranje naloga. Zahvalan vam je Salon pro, odgovornost čini razliku.',
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

update public.notifications
set
  title = case tip
    when 'appointment_confirmed' then 'Termin vam je potvrđen'
    else title
  end,
  body = case tip
    when 'appointment_confirmed' then 'Termin vam je potvrđen. Ukoliko dođe do izmena obavite ih najkasnije 6 sati pre vašeg termina kako bi izbegli blokiranje naloga. Zahvalan vam je Salon pro, odgovornost čini razliku.'
    else body
  end
where tip = 'appointment_confirmed';

commit;
