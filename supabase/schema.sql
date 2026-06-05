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

drop policy if exists "Users can read own overtime entries" on public.overtime_entries;
create policy "Users can read own overtime entries"
on public.overtime_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own overtime entries" on public.overtime_entries;
create policy "Users can create own overtime entries"
on public.overtime_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own overtime entries" on public.overtime_entries;
create policy "Users can update own overtime entries"
on public.overtime_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own overtime entries" on public.overtime_entries;
create policy "Users can delete own overtime entries"
on public.overtime_entries
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.overtime_entries to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role_title text,
  avatar_url text,
  default_work_hours numeric(5, 2) check (default_work_hours is null or default_work_hours >= 0),
  default_lunch_minutes integer check (default_lunch_minutes is null or default_lunch_minutes >= 0),
  monthly_salary numeric(10, 2) check (monthly_salary is null or monthly_salary >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles drop column if exists monthly_divisor;
alter table public.profiles drop column if exists overtime_percent;

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant select, insert, update on public.profiles to authenticated;
