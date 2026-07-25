create extension if not exists pgcrypto;

create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists analysis_history_user_time_idx
  on public.analysis_history (user_id, occurred_at desc);

alter table public.analysis_history enable row level security;

revoke all on table public.analysis_history from anon;
grant select, insert, delete on table public.analysis_history to authenticated;

drop policy if exists "Users can read their own history" on public.analysis_history;
create policy "Users can read their own history"
  on public.analysis_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own history" on public.analysis_history;
create policy "Users can create their own history"
  on public.analysis_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own history" on public.analysis_history;
create policy "Users can delete their own history"
  on public.analysis_history
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
