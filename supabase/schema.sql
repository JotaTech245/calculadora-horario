create table if not exists public.overtime_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  hours numeric(5, 2) not null check (hours >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

alter table public.overtime_entries enable row level security;

create policy "Users can read own overtime entries"
on public.overtime_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own overtime entries"
on public.overtime_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own overtime entries"
on public.overtime_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own overtime entries"
on public.overtime_entries
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.overtime_entries to authenticated;
