-- Add super admin class codes system

-- Add status fields to classrooms
alter table public.classrooms
add column if not exists created_by_admin boolean default false,
add column if not exists is_active boolean default true,
add column if not exists max_teachers integer default 1,
add column if not exists max_students integer default 50;

-- Teacher requests table
create table if not exists public.teacher_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  status text not null default 'pending', -- 'pending', 'approved', 'rejected'
  requested_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid references auth.users(id),
  unique(teacher_id, classroom_id)
);

alter table public.teacher_requests enable row level security;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'teacher_requests'
  loop
    execute format('drop policy if exists %I on public.teacher_requests', r.policyname);
  end loop;
end $$;

create policy "teacher_requests_select_own" on public.teacher_requests 
  for select using (
    auth.uid() = teacher_id or 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "teacher_requests_insert_teacher" on public.teacher_requests 
  for insert with check (auth.uid() = teacher_id);

create policy "teacher_requests_update_admin" on public.teacher_requests 
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Assignment visibility control
alter table public.assignments
add column if not exists is_visible boolean default true,
add column if not exists visible_from timestamp with time zone,
add column if not exists visible_until timestamp with time zone;

-- Update classrooms policies for admin
drop policy if exists "classrooms_select_all" on public.classrooms;
create policy "classrooms_select_all" on public.classrooms for select using (true);

drop policy if exists "classrooms_insert_teacher" on public.classrooms;
create policy "classrooms_insert" on public.classrooms for insert with check (
  auth.uid() = teacher_id or 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "classrooms_update_teacher" on public.classrooms;
create policy "classrooms_update" on public.classrooms for update using (
  auth.uid() = teacher_id or 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "classrooms_delete_teacher" on public.classrooms;
create policy "classrooms_delete" on public.classrooms for delete using (
  auth.uid() = teacher_id or 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Admin activity log
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null, -- 'create_class', 'approve_teacher', 'reject_teacher', etc.
  target_id uuid,
  details jsonb,
  created_at timestamp with time zone default now()
);

alter table public.admin_activity_log enable row level security;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'admin_activity_log'
  loop
    execute format('drop policy if exists %I on public.admin_activity_log', r.policyname);
  end loop;
end $$;

create policy "admin_activity_log_select_admin" on public.admin_activity_log 
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_activity_log_insert_admin" on public.admin_activity_log 
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
