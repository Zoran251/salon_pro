-- Automatska potvrda termina: ako je true, novi termini dobijaju status 'potvrđen' odmah
alter table public.saloni add column if not exists auto_confirm boolean not null default false;
