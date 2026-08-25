-- Terms acceptance columns for saloni table
alter table public.saloni
add column if not exists prihvatio_uslove boolean not null default false,
add column if not exists uslovi_prihvacen_at timestamptz;

create index if not exists saloni_prihvatio_uslove_idx on public.saloni (prihvatio_uslove);