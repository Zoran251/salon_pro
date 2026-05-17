-- Osigurava kolonu za sliku usluge (dashboard + javna strana salona).
-- Idempotentno: bezbedno ako je već pokrenuta 2026-05-21_usluge_slika_url.sql.

begin;

alter table public.usluge
  add column if not exists slika_url text;

comment on column public.usluge.slika_url is
  'Opciona slika usluge: data URL iz pregledača (kao logo_url) ili javni HTTPS URL; prikaz na javnoj stranici salona.';

commit;
