-- Javno zakazivanje preko security definer funkcije.
-- Ovo izbjegava direktan anon INSERT u public.termini, pa RLS ostaje zatvoren
-- za tabelu, a aplikacija ima kontrolisan ulaz za booking.

begin;

create or replace function public.create_public_booking(
  p_salon_id uuid,
  p_client_id uuid,
  p_usluga_id uuid,
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
  v_id uuid;
  v_ime text := trim(coalesce(p_ime, ''));
  v_telefon text := trim(coalesce(p_telefon, ''));
begin
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
    raise exception 'Datum i vrijeme su obavezni.';
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
  ) then
    raise exception 'Klijent nije povezan sa ovim salonom.';
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

  insert into public.termini (
    salon_id,
    client_id,
    usluga_id,
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

grant execute on function public.create_public_booking(uuid, uuid, uuid, text, text, timestamptz, text) to anon;
grant execute on function public.create_public_booking(uuid, uuid, uuid, text, text, timestamptz, text) to authenticated;

commit;
