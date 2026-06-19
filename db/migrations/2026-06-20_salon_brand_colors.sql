-- Brend boje salona: sekundarna, akcent i boja teksta (primarna već postoji).
-- Idempotentno.

begin;

alter table public.saloni
  add column if not exists boja_sekundarna text default '#121212',
  add column if not exists boja_akcent text default '#f5e17a',
  add column if not exists boja_font text default '#f5f0e8';

commit;
