-- Users profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student', -- 'student', 'teacher', 'admin'
  school_name text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', r.policyname);
  end loop;
end $$;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Classrooms table
create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  code text not null unique,
  created_at timestamp with time zone default now()
);

alter table public.classrooms enable row level security;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'classrooms'
  loop
    execute format('drop policy if exists %I on public.classrooms', r.policyname);
  end loop;
end $$;

create policy "classrooms_select_all" on public.classrooms for select using (true);
create policy "classrooms_insert_teacher" on public.classrooms for insert with check (auth.uid() = teacher_id);
create policy "classrooms_update_teacher" on public.classrooms for update using (auth.uid() = teacher_id);
create policy "classrooms_delete_teacher" on public.classrooms for delete using (auth.uid() = teacher_id);

-- Classroom enrollments
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  enrolled_at timestamp with time zone default now(),
  unique(classroom_id, student_id)
);

alter table public.enrollments enable row level security;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'enrollments'
  loop
    execute format('drop policy if exists %I on public.enrollments', r.policyname);
  end loop;
end $$;

create policy "enrollments_select_own" on public.enrollments for select using (
  auth.uid() = student_id or auth.uid() in (
    select teacher_id from public.classrooms where id = classroom_id
  )
);
create policy "enrollments_insert" on public.enrollments for insert with check (auth.uid() = student_id);

-- Assignments/Problems
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  title text not null,
  description text,
  starter_code text,
  test_cases jsonb,
  language text not null default 'python', -- 'python', 'javascript', 'java'
  due_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.assignments enable row level security;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'assignments'
  loop
    execute format('drop policy if exists %I on public.assignments', r.policyname);
  end loop;
end $$;

create policy "assignments_select_own_class" on public.assignments for select using (
  auth.uid() in (select teacher_id from public.classrooms where id = classroom_id) or
  classroom_id in (select classroom_id from public.enrollments where student_id = auth.uid())
);
create policy "assignments_insert_teacher" on public.assignments for insert with check (
  auth.uid() in (select teacher_id from public.classrooms where id = classroom_id)
);
create policy "assignments_update_teacher" on public.assignments for update using (
  auth.uid() in (select teacher_id from public.classrooms where id = classroom_id)
);

-- Student submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  status text default 'pending', -- 'pending', 'submitted', 'graded'
  score integer,
  feedback text,
  submitted_at timestamp with time zone default now(),
  graded_at timestamp with time zone,
  unique(assignment_id, student_id)
);

alter table public.submissions enable row level security;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'submissions'
  loop
    execute format('drop policy if exists %I on public.submissions', r.policyname);
  end loop;
end $$;

create policy "submissions_select_own" on public.submissions for select using (
  auth.uid() = student_id or
  auth.uid() in (
    select teacher_id from public.classrooms
    where id = (select classroom_id from public.assignments where id = assignment_id)
  )
);
create policy "submissions_insert_student" on public.submissions for insert with check (auth.uid() = student_id);
create policy "submissions_update_own" on public.submissions for update using (auth.uid() = student_id);
create policy "submissions_update_teacher" on public.submissions for update using (
  auth.uid() in (
    select teacher_id from public.classrooms
    where id = (select classroom_id from public.assignments where id = assignment_id)
  )
);
