-- District Hierarchy System
-- User Levels: FULL_ADMIN -> District -> District Admin -> Teacher -> Student

-- Update profiles with new role system
alter table public.profiles 
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check check (role in ('full_admin', 'district_admin', 'teacher', 'student'));

-- Districts table
create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  district_code text unique not null,
  created_by uuid not null references auth.users(id),
  is_active boolean default true,
  max_classes integer default 10,
  max_teachers integer default 50,
  max_students integer default 1000,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- District admins (many-to-many: districts can have multiple admins)
create table if not exists public.district_admins (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamp with time zone default now(),
  assigned_by uuid references auth.users(id),
  unique(district_id, admin_id)
);

-- Available courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  language text not null, -- 'python', 'javascript', 'java', 'cpp'
  level text not null, -- 'beginner', 'intermediate', 'advanced'
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Insert default courses
insert into public.courses (name, description, language, level) values
('Python Fundamentals', 'Learn Python basics', 'python', 'beginner'),
('JavaScript Essentials', 'Master JavaScript fundamentals', 'javascript', 'beginner'),
('Java Programming', 'Object-oriented programming with Java', 'java', 'intermediate'),
('C++ Advanced', 'Advanced C++ concepts', 'cpp', 'advanced')
on conflict do nothing;

-- Rebuild classrooms to support district hierarchy
alter table public.classrooms
drop column if exists created_by_admin,
add column if not exists district_id uuid references public.districts(id) on delete cascade,
add column if not exists course_id uuid references public.courses(id),
add column if not exists pending_activation boolean default true,
add column if not exists activated_at timestamp with time zone,
add column if not exists activated_by uuid references auth.users(id);

-- Class creation requests (District Admin creates, Full Admin activates)
create table if not exists public.class_requests (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  district_id uuid not null references public.districts(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  status text not null default 'pending', -- 'pending', 'approved', 'rejected'
  requested_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid references auth.users(id),
  rejection_reason text,
  unique(classroom_id)
);

-- Enable RLS
alter table public.districts enable row level security;
alter table public.district_admins enable row level security;
alter table public.courses enable row level security;
alter table public.class_requests enable row level security;
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('districts', 'district_admins', 'courses', 'class_requests', 'classrooms')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Districts policies
create policy "districts_select_all" on public.districts for select using (true);
create policy "districts_insert_full_admin" on public.districts for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin')
);
create policy "districts_update_admins" on public.districts for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin') or
  exists (select 1 from public.district_admins where district_id = districts.id and admin_id = auth.uid())
);
create policy "districts_delete_full_admin" on public.districts for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin')
);

-- District admins policies
create policy "district_admins_select" on public.district_admins for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('full_admin', 'district_admin'))
);
create policy "district_admins_insert_full_admin" on public.district_admins for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin')
);
create policy "district_admins_delete_full_admin" on public.district_admins for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin')
);

-- Courses policies (everyone can view)
create policy "courses_select_all" on public.courses for select using (true);
create policy "courses_modify_full_admin" on public.courses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin')
);

-- Class requests policies
create policy "class_requests_select" on public.class_requests for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin') or
  auth.uid() = requested_by
);
create policy "class_requests_insert_district_admin" on public.class_requests for insert with check (
  exists (select 1 from public.district_admins where admin_id = auth.uid() and district_id = class_requests.district_id)
);
create policy "class_requests_update_full_admin" on public.class_requests for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin')
);

-- Update classrooms policies for district hierarchy
drop policy if exists "classrooms_select_all" on public.classrooms;
create policy "classrooms_select_hierarchy" on public.classrooms for select using (
  -- Full admin sees all
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin') or
  -- District admin sees their district's classes
  exists (select 1 from public.district_admins da where da.admin_id = auth.uid() and da.district_id = classrooms.district_id) or
  -- Teachers see classes they own
  auth.uid() = teacher_id or
  -- Students see classes they're enrolled in
  exists (select 1 from public.enrollments where student_id = auth.uid() and classroom_id = classrooms.id)
);

drop policy if exists "classrooms_insert" on public.classrooms;
create policy "classrooms_insert_district_admin" on public.classrooms for insert with check (
  exists (select 1 from public.district_admins where admin_id = auth.uid() and district_id = classrooms.district_id) or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin')
);

drop policy if exists "classrooms_update" on public.classrooms;
create policy "classrooms_update_hierarchy" on public.classrooms for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'full_admin') or
  exists (select 1 from public.district_admins da where da.admin_id = auth.uid() and da.district_id = classrooms.district_id) or
  auth.uid() = teacher_id
);
