alter table public.usluge
  add column if not exists valuta text not null default 'RSD'
  check (valuta in ('RSD', 'KM', 'EUR', 'USD'));
