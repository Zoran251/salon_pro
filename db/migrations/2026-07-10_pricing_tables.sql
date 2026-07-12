-- Planovi pretplate
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  tip text not null check (tip in ('mjesečna', 'godišnja', 'doživotna')),
  naziv text not null,
  cijena_eur numeric(10,2) not null,
  period text not null check (period in ('month', 'year', 'lifetime')),
  aktivno boolean not null default true,
  created_at timestamptz default now()
);

-- Pretplate salona
create table if not exists public.salon_subscriptions (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.saloni (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status text not null default 'aktivna' check (status in ('aktivna', 'istekla', 'otkazana')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (salon_id)
);

-- Promo kodovi
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  plan_id uuid references public.subscription_plans (id),
  cijena_eur numeric(10,2),
  max_koristi integer not null default 1,
  trenutno_koristi integer not null default 0,
  aktivno boolean not null default true,
  created_at timestamptz default now()
);

-- Indexi
create index if not exists salon_subscriptions_salon_id_idx on public.salon_subscriptions (salon_id);
create index if not exists salon_subscriptions_status_idx on public.salon_subscriptions (status);
create index if not exists promo_codes_kod_idx on public.promo_codes (kod);

-- Insert default planovi
insert into public.subscription_plans (tip, naziv, cijena_eur, period) values
  ('mjesečna', 'Mjesečna pretplata', 29.99, 'month'),
  ('godišnja', 'Godišnja pretplata', 299, 'year'),
  ('doživotna', 'Doživotna licenca', 1200, 'lifetime')
on conflict do nothing;

-- Insert promo kod Osnivac10 (doživotna licenca za 500€, max 10 koristi)
insert into public.promo_codes (kod, plan_id, cijena_eur, max_koristi)
select 'Osnivac10', id, 500, 10
from public.subscription_plans
where tip = 'doživotna'
on conflict (kod) do nothing;

-- RLS: salon_subscriptions — salon vidi samo svoju
alter table public.salon_subscriptions enable row level security;
drop policy if exists salon_subscriptions_select on public.salon_subscriptions;
drop policy if exists salon_subscriptions_insert on public.salon_subscriptions;

create policy salon_subscriptions_select on public.salon_subscriptions
  for select using (salon_id = auth.uid());

create policy salon_subscriptions_insert on public.salon_subscriptions
  for insert with check (salon_id = auth.uid());
