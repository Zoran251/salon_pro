-- Kupac (authenticated, salon_clients.auth_user_id) može da ažurira sopstvene termine.
-- Bez ove policy PostgREST UPDATE ne dira red (0 redova), a Supabase klijent često ne javlja grešku —
-- UI je prikazivala uspeh iako se baza nije menjala.

begin;

drop policy if exists termini_client_update_own on public.termini;
create policy termini_client_update_own
on public.termini
for update
to authenticated
using (
  exists (
    select 1
    from public.salon_clients sc
    where sc.id = termini.client_id
      and sc.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.salon_clients sc
    where sc.id = termini.client_id
      and sc.auth_user_id = auth.uid()
      and sc.salon_id = termini.salon_id
  )
);

commit;
