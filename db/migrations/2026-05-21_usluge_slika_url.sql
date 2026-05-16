-- Opciona slika usluge (javni prikaz na landing stranici salona).
-- Idempotentno.

begin;

alter table public.usluge
  add column if not exists slika_url text;

comment on column public.usluge.slika_url is 'Opciona slika usluge (URL ili data URL); prikaz na javnoj stranici salona.';

commit;
