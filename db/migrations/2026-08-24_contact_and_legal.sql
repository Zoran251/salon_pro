-- Contact messages (landing page inquiries)
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  type text not null check (type in ('upit', 'konsultacija')),
  status text not null default 'novo' check (status in ('novo', 'u_toku', 'odgovoreno', 'zatvoreno')),
  created_at timestamptz default now()
);

create index if not exists contact_messages_status_idx on public.contact_messages (status);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Javni insert bez auth (landing forma) - anon users
drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert on public.contact_messages
  for insert with check (true);

-- Javni select za admin panel ne treba (service role bypasses RLS)
-- Admin koristi service role ključ na serveru -> RLS se ne primenjuje

-- Legal pages (Terms & Privacy)
create table if not exists public.legal_pages (
  slug text primary key check (slug in ('terms', 'privacy')),
  title text not null,
  content_html text not null,
  version int not null default 1,
  updated_at timestamptz default now()
);

alter table public.legal_pages enable row level security;

-- Javnost može čitati (anon + authenticated)
drop policy if exists legal_pages_public_read on public.legal_pages;
create policy legal_pages_public_read on public.legal_pages
  for select using (true);

-- Admin piše preko service role (bypasses RLS) - politika ne required
-- Service role ključ na serveru automatski bypassuje RLS

-- Seed legal pages (placeholder content - to be updated via admin or SQL)
insert into public.legal_pages (slug, title, content_html, version) values
  ('terms', 'Uslovi korištenja', '<h2>Uslovi korištenja</h2><p>Sadržaj će biti dodat...</p>', 1),
  ('privacy', 'Pravila privatnosti', '<h2>Pravila privatnosti</h2><p>Sadržaj će biti dodat...</p>', 1)
on conflict (slug) do nothing;