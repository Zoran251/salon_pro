-- Unique constraint na endpoint za pouzdan upsert
-- token kolona je legacy FCM, nova Web Push pretplata nema token

alter table public.device_tokens alter column token drop not null;

delete from public.device_tokens
where endpoint is null and token is null;

delete from public.device_tokens
where id in (
  select id from (
    select id, row_number() over (partition by endpoint order by created_at desc) as rn
    from public.device_tokens
    where endpoint is not null
  ) t where t.rn > 1
);

alter table public.device_tokens drop constraint if exists device_tokens_endpoint_unique;
alter table public.device_tokens add constraint device_tokens_endpoint_unique unique (endpoint);
