-- ALIVI 3.2.0: tabela adicional, preserva memória e histórico existentes.
begin;
create table if not exists public.alivi_management (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('agenda','finance','business','stock')),
  record_id text not null check (length(record_id) between 1 and 100),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  deleted boolean not null default false,
  primary key (user_id, kind, record_id)
);
alter table public.alivi_management enable row level security;
revoke all on public.alivi_management from anon, public;
grant select, insert, update on public.alivi_management to authenticated;
drop policy if exists alivi_management_own_select on public.alivi_management;
create policy alivi_management_own_select on public.alivi_management for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists alivi_management_own_insert on public.alivi_management;
create policy alivi_management_own_insert on public.alivi_management for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists alivi_management_own_update on public.alivi_management;
create policy alivi_management_own_update on public.alivi_management for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Exclusão lógica: evita que aparelhos com registros antigos ressuscitem itens na migração inicial.
notify pgrst, 'reload schema';
commit;
