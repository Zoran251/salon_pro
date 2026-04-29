-- Otkazivanje termina od strane registrovanog kupca kroz kontrolisanu RPC funkciju.
-- Funkcija radi sa auth.uid(), pa kupac može otkazati samo svoj termin u datom salonu.

begin;

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
  v_tier text := 'early_warning';
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

  v_minutes_before := extract(epoch from (v_termin.datum_vrijeme - now())) / 60.0;

  if v_minutes_before <= 30 then
    v_tier := 'blacklist';
  elsif v_minutes_before < 60 then
    v_tier := 'late_warning';
  end if;

  update public.termini
  set status = 'otkazan'
  where id = v_termin.id;

  if v_tier = 'blacklist' then
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
      'kasno_otkazivanje',
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
      when 'early_warning' then
        'Termin je otkazan. Hvala što ste nas obavestili bar sat vremena unapred.'
      when 'late_warning' then
        'Termin je otkazan. Otkazivanje manje od sat vremena pre termina otežava rad salona; molimo vas da ubuduće javite ranije.'
      else
        'Termin je otkazan vrlo kasno. Vaš nalog je zabeležen na crnoj listi dok administrator ne ukloni zapis.'
    end
  );
end;
$$;

grant execute on function public.cancel_customer_appointment(uuid, uuid) to authenticated;

commit;
