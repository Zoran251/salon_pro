-- Web Push pretplate (Native Push API) umjesto FCM tokena
-- Endpoint je jedinstven identifikator subscriptiona

begin;

alter table public.device_tokens add column if not exists auth_key text;
alter table public.device_tokens add column if not exists p256dh_key text;
alter table public.device_tokens add column if not exists endpoint text;

drop index if exists device_tokens_endpoint_idx;
create index if not exists device_tokens_endpoint_idx on public.device_tokens (endpoint);

-- Stari unique constraint na token vise ne treba za web push
-- (token kolona ostaje za backward compatibility)
alter table public.device_tokens drop constraint if exists device_tokens_token_key;

commit;
