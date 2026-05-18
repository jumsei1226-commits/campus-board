create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  university text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  weekday int not null check (weekday between 1 and 7),
  period int not null check (period between 1 and 6),
  room text,
  teacher text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_completed boolean not null default false,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists classes_user_weekday_period_idx on public.classes(user_id, weekday, period);
create index if not exists assignments_user_due_date_idx on public.assignments(user_id, due_date);
create index if not exists assignments_user_completed_idx on public.assignments(user_id, is_completed);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_classes_updated_at on public.classes;
create trigger set_classes_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.assignments enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view own classes" on public.classes;
create policy "Users can view own classes"
on public.classes for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own classes" on public.classes;
create policy "Users can insert own classes"
on public.classes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own classes" on public.classes;
create policy "Users can update own classes"
on public.classes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own classes" on public.classes;
create policy "Users can delete own classes"
on public.classes for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own assignments" on public.assignments;
create policy "Users can view own assignments"
on public.assignments for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own assignments" on public.assignments;
create policy "Users can insert own assignments"
on public.assignments for insert
with check (
  auth.uid() = user_id
  and (
    class_id is null
    or exists (
      select 1 from public.classes
      where classes.id = assignments.class_id
      and classes.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update own assignments" on public.assignments;
create policy "Users can update own assignments"
on public.assignments for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    class_id is null
    or exists (
      select 1 from public.classes
      where classes.id = assignments.class_id
      and classes.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can delete own assignments" on public.assignments;
create policy "Users can delete own assignments"
on public.assignments for delete
using (auth.uid() = user_id);
