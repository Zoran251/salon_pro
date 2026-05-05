-- Audit log: automatic tracking of data changes for key tables
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  salon_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_salon on public.audit_log (salon_id, created_at desc);
create index if not exists idx_audit_log_table on public.audit_log (table_name, created_at desc);

alter table public.audit_log enable row level security;

create policy "Vlasnik vidi audit log svog salona"
  on public.audit_log for select
  using (salon_id = auth.uid());

-- Generic audit trigger function
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salon_id uuid;
  v_record_id text;
  v_user_id uuid;
begin
  v_user_id := coalesce(auth.uid(), null);

  if TG_OP = 'DELETE' then
    v_record_id := OLD.id::text;
    v_salon_id := case when TG_TABLE_NAME in ('saloni') then OLD.id else OLD.salon_id end;
    insert into public.audit_log (table_name, record_id, salon_id, action, old_data, changed_by)
    values (TG_TABLE_NAME, v_record_id, v_salon_id, 'DELETE', to_jsonb(OLD), v_user_id);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    v_record_id := NEW.id::text;
    v_salon_id := case when TG_TABLE_NAME in ('saloni') then NEW.id else NEW.salon_id end;
    insert into public.audit_log (table_name, record_id, salon_id, action, old_data, new_data, changed_by)
    values (TG_TABLE_NAME, v_record_id, v_salon_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
    return NEW;
  elsif TG_OP = 'INSERT' then
    v_record_id := NEW.id::text;
    v_salon_id := case when TG_TABLE_NAME in ('saloni') then NEW.id else NEW.salon_id end;
    insert into public.audit_log (table_name, record_id, salon_id, action, new_data, changed_by)
    values (TG_TABLE_NAME, v_record_id, v_salon_id, 'INSERT', to_jsonb(NEW), v_user_id);
    return NEW;
  end if;
  return null;
end;
$$;

-- Attach audit triggers to key business tables
create trigger trg_audit_saloni
  after insert or update or delete on public.saloni
  for each row execute function public.fn_audit_log();

create trigger trg_audit_usluge
  after insert or update or delete on public.usluge
  for each row execute function public.fn_audit_log();

create trigger trg_audit_termini
  after insert or update or delete on public.termini
  for each row execute function public.fn_audit_log();

create trigger trg_audit_rashodi
  after insert or update or delete on public.rashodi
  for each row execute function public.fn_audit_log();

create trigger trg_audit_lager
  after insert or update or delete on public.lager
  for each row execute function public.fn_audit_log();

create trigger trg_audit_kupci_crna_lista
  after insert or update or delete on public.kupci_crna_lista
  for each row execute function public.fn_audit_log();
