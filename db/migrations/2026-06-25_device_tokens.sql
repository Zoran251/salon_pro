-- Tabela za Firebase Cloud Messaging device tokene
-- Omogucava push notifikacije za vlasnike salona i kupce

begin;

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  platform text not null default 'web',
  salon_id uuid references public.saloni (id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (token)
);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);
create index if not exists device_tokens_salon_id_idx on public.device_tokens (salon_id);

alter table public.device_tokens enable row level security;

drop policy if exists device_tokens_owner_all on public.device_tokens;
create policy device_tokens_owner_all
on public.device_tokens
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
