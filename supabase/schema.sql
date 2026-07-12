create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  university text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  term_type text not null default 'semester' check (term_type in ('semester', 'quarter', 'custom')),
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_term_id uuid references public.terms(id) on delete set null,
  semester_system text not null default 'semester' check (semester_system in ('semester', 'quarter')),
  show_saturday boolean not null default false,
  notifications_enabled boolean not null default false,
  notification_time time not null default '09:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id uuid references public.terms(id) on delete cascade,
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
  term_id uuid references public.terms(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_completed boolean not null default false,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timetable_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  university text,
  faculty text,
  department text,
  grade text,
  term_name text,
  semester_system text not null default 'semester' check (semester_system in ('semester', 'quarter')),
  includes_saturday boolean not null default false,
  description text,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timetable_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.timetable_templates(id) on delete cascade,
  title text not null,
  weekday int not null check (weekday between 1 and 7),
  period int not null check (period between 1 and 6),
  room text,
  teacher text,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.classes add column if not exists term_id uuid references public.terms(id) on delete cascade;
alter table public.assignments add column if not exists term_id uuid references public.terms(id) on delete cascade;

insert into public.terms (user_id, name, term_type, sort_order)
select users.id, '2026前期', 'semester', 1
from auth.users users
where not exists (
  select 1 from public.terms terms
  where terms.user_id = users.id
);

insert into public.user_settings (user_id, current_term_id, semester_system, show_saturday, notifications_enabled, notification_time)
select distinct on (users.id) users.id, terms.id, 'semester', false, false, '09:00'
from auth.users users
join public.terms terms on terms.user_id = users.id
order by users.id, terms.sort_order, terms.created_at
on conflict (user_id) do nothing;

update public.classes classes
set term_id = settings.current_term_id
from public.user_settings settings
where classes.user_id = settings.user_id
and classes.term_id is null;

update public.assignments assignments
set term_id = settings.current_term_id
from public.user_settings settings
where assignments.user_id = settings.user_id
and assignments.term_id is null;

create index if not exists terms_user_sort_idx on public.terms(user_id, sort_order);
create index if not exists classes_user_term_weekday_period_idx on public.classes(user_id, term_id, weekday, period);
create index if not exists assignments_user_term_due_date_idx on public.assignments(user_id, term_id, due_date);
create index if not exists assignments_user_completed_idx on public.assignments(user_id, is_completed);
create index if not exists templates_shared_updated_idx on public.timetable_templates(is_shared, updated_at desc);
create index if not exists template_items_template_idx on public.timetable_template_items(template_id, weekday, period);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.terms to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.timetable_templates to authenticated;
grant select, insert, update, delete on public.timetable_template_items to authenticated;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_terms_updated_at on public.terms;
create trigger set_terms_updated_at before update on public.terms for each row execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

drop trigger if exists set_classes_updated_at on public.classes;
create trigger set_classes_updated_at before update on public.classes for each row execute function public.set_updated_at();

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();

drop trigger if exists set_timetable_templates_updated_at on public.timetable_templates;
create trigger set_timetable_templates_updated_at before update on public.timetable_templates for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_term_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  insert into public.terms (user_id, name, term_type, sort_order)
  values (new.id, '2026前期', 'semester', 1)
  returning id into default_term_id;

  insert into public.user_settings (user_id, current_term_id, semester_system, show_saturday, notifications_enabled, notification_time)
  values (new.id, default_term_id, 'semester', false, false, '09:00')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.terms enable row level security;
alter table public.user_settings enable row level security;
alter table public.classes enable row level security;
alter table public.assignments enable row level security;
alter table public.timetable_templates enable row level security;
alter table public.timetable_template_items enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can view own terms" on public.terms;
create policy "Users can view own terms" on public.terms for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own terms" on public.terms;
create policy "Users can insert own terms" on public.terms for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own terms" on public.terms;
create policy "Users can update own terms" on public.terms for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own terms" on public.terms;
create policy "Users can delete own terms" on public.terms for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can view own classes" on public.classes;
create policy "Users can view own classes" on public.classes for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own classes" on public.classes;
create policy "Users can insert own classes" on public.classes for insert with check (
  auth.uid() = user_id
  and (term_id is null or exists (select 1 from public.terms where terms.id = classes.term_id and terms.user_id = auth.uid()))
);
drop policy if exists "Users can update own classes" on public.classes;
create policy "Users can update own classes" on public.classes for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and (term_id is null or exists (select 1 from public.terms where terms.id = classes.term_id and terms.user_id = auth.uid()))
);
drop policy if exists "Users can delete own classes" on public.classes;
create policy "Users can delete own classes" on public.classes for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own assignments" on public.assignments;
create policy "Users can view own assignments" on public.assignments for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own assignments" on public.assignments;
create policy "Users can insert own assignments" on public.assignments for insert with check (
  auth.uid() = user_id
  and (term_id is null or exists (select 1 from public.terms where terms.id = assignments.term_id and terms.user_id = auth.uid()))
  and (class_id is null or exists (select 1 from public.classes where classes.id = assignments.class_id and classes.user_id = auth.uid()))
);
drop policy if exists "Users can update own assignments" on public.assignments;
create policy "Users can update own assignments" on public.assignments for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and (term_id is null or exists (select 1 from public.terms where terms.id = assignments.term_id and terms.user_id = auth.uid()))
  and (class_id is null or exists (select 1 from public.classes where classes.id = assignments.class_id and classes.user_id = auth.uid()))
);
drop policy if exists "Users can delete own assignments" on public.assignments;
create policy "Users can delete own assignments" on public.assignments for delete using (auth.uid() = user_id);

drop policy if exists "Users can view shared or own templates" on public.timetable_templates;
create policy "Users can view shared or own templates" on public.timetable_templates for select using (is_shared = true or auth.uid() = user_id);
drop policy if exists "Users can insert own templates" on public.timetable_templates;
create policy "Users can insert own templates" on public.timetable_templates for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own templates" on public.timetable_templates;
create policy "Users can update own templates" on public.timetable_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own templates" on public.timetable_templates;
create policy "Users can delete own templates" on public.timetable_templates for delete using (auth.uid() = user_id);

drop policy if exists "Users can view shared or own template items" on public.timetable_template_items;
create policy "Users can view shared or own template items" on public.timetable_template_items for select using (
  exists (
    select 1 from public.timetable_templates
    where timetable_templates.id = timetable_template_items.template_id
    and (timetable_templates.is_shared = true or timetable_templates.user_id = auth.uid())
  )
);
drop policy if exists "Users can insert own template items" on public.timetable_template_items;
create policy "Users can insert own template items" on public.timetable_template_items for insert with check (
  exists (
    select 1 from public.timetable_templates
    where timetable_templates.id = timetable_template_items.template_id
    and timetable_templates.user_id = auth.uid()
  )
);
drop policy if exists "Users can update own template items" on public.timetable_template_items;
create policy "Users can update own template items" on public.timetable_template_items for update using (
  exists (
    select 1 from public.timetable_templates
    where timetable_templates.id = timetable_template_items.template_id
    and timetable_templates.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.timetable_templates
    where timetable_templates.id = timetable_template_items.template_id
    and timetable_templates.user_id = auth.uid()
  )
);
drop policy if exists "Users can delete own template items" on public.timetable_template_items;
create policy "Users can delete own template items" on public.timetable_template_items for delete using (
  exists (
    select 1 from public.timetable_templates
    where timetable_templates.id = timetable_template_items.template_id
    and timetable_templates.user_id = auth.uid()
  )
);
