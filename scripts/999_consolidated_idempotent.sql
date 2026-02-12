-- Consolidated idempotent migration bundle
-- Generated from scripts/000..014
-- Safe for first-time and re-runs



-- =====================================================================
-- BEGIN scripts/000_rerun_reset.sql
-- =====================================================================

-- Rerun reset helper
-- Safe to run on first-time and repeated runs.
-- This removes conflicting policies/constraints/triggers so numbered migrations can be replayed.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','classrooms','enrollments','assignments','submissions',
        'teacher_requests','admin_activity_log',
        'districts','district_admins','courses','class_requests',
        'units','lessons','checkpoints','student_lesson_progress',
        'checkpoint_submissions','concept_mastery','badges','student_streaks',
        'assignment_templates','feedback_templates','audit_logs','data_exports',
        'legal_acceptances','course_enrollments','magic_links','schools','school_admins'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Common trigger/function/constraint reset points used by migrations
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_teacher_school_required;
ALTER TABLE IF EXISTS public.districts DROP CONSTRAINT IF EXISTS districts_code_unique;
ALTER TABLE IF EXISTS public.districts DROP CONSTRAINT IF EXISTS districts_district_code_unique;
ALTER TABLE IF EXISTS public.magic_links DROP CONSTRAINT IF EXISTS magic_links_role_check;


-- =====================================================================
-- END scripts/000_rerun_reset.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/001_create_schema.sql
-- =====================================================================

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


-- =====================================================================
-- END scripts/001_create_schema.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/002_profile_trigger.sql
-- =====================================================================

-- Create profile trigger for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- =====================================================================
-- END scripts/002_profile_trigger.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/003_admin_class_system.sql
-- =====================================================================

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


-- =====================================================================
-- END scripts/003_admin_class_system.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/004_district_hierarchy.sql
-- =====================================================================

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


-- =====================================================================
-- END scripts/004_district_hierarchy.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/005_platform_v2_schema.sql
-- =====================================================================

-- Averon Code Lab V2 Schema
-- Enhanced platform with trials, mastery tracking, and monetization

-- ============================================
-- PART 1: EXTEND EXISTING TABLES
-- ============================================

-- Add trial mode and licensing fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teacher_mode TEXT DEFAULT 'trial' CHECK (teacher_mode IN ('trial', 'district'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_student_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add plan and licensing to districts
ALTER TABLE districts ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'enterprise'));
ALTER TABLE districts ADD COLUMN IF NOT EXISTS teacher_limit INTEGER DEFAULT 10;
ALTER TABLE districts ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 500;
ALTER TABLE districts ADD COLUMN IF NOT EXISTS license_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE districts ADD COLUMN IF NOT EXISTS license_end TIMESTAMPTZ;
ALTER TABLE districts ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- ============================================
-- PART 2: LEARNING CONTENT STRUCTURE
-- ============================================

-- Courses table (already exists, extend it)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 40;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_trial_accessible BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS color TEXT;

-- Units within courses
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    learning_objectives TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons within units
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'interactive')),
    content_url TEXT,
    content_body TEXT,
    duration_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkpoints (practice problems within lessons)
CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    starter_code TEXT,
    solution_code TEXT,
    test_cases JSONB NOT NULL DEFAULT '[]',
    difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points INTEGER DEFAULT 10,
    order_index INTEGER NOT NULL,
    concept_tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: STUDENT PROGRESS TRACKING
-- ============================================

-- Student progress per lesson
CREATE TABLE IF NOT EXISTS student_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score NUMERIC(5,2),
    attempts INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    mastery_level TEXT DEFAULT 'learning' CHECK (mastery_level IN ('learning', 'proficient', 'mastered')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- Checkpoint submissions
CREATE TABLE IF NOT EXISTS checkpoint_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    test_results JSONB,
    score NUMERIC(5,2),
    is_correct BOOLEAN DEFAULT false,
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept mastery tracking
CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    concept_name TEXT NOT NULL,
    mastery_score NUMERIC(5,2) DEFAULT 0,
    practice_count INTEGER DEFAULT 0,
    last_practiced TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, concept_name)
);

-- ============================================
-- PART 4: MOTIVATION & ENGAGEMENT
-- ============================================

-- Badges and achievements
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Student streaks
CREATE TABLE IF NOT EXISTS student_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)
);

-- ============================================
-- PART 5: TEACHER EFFICIENCY
-- ============================================

-- Assignment templates (reusable)
CREATE TABLE IF NOT EXISTS assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT,
    starter_code TEXT,
    test_cases JSONB,
    rubric JSONB,
    points INTEGER DEFAULT 100,
    difficulty TEXT,
    concept_tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback templates
CREATE TABLE IF NOT EXISTS feedback_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 6: COMPLIANCE & AUDIT
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Data export requests
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID REFERENCES profiles(id),
    district_id UUID REFERENCES districts(id),
    export_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- PART 7: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_lesson ON checkpoints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_lesson ON student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_submissions_student ON checkpoint_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_submissions_checkpoint ON checkpoint_submissions(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student ON concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_badges_student ON badges(student_id);

-- ============================================
-- PART 8: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'units','lessons','checkpoints','student_lesson_progress',
        'checkpoint_submissions','concept_mastery','badges','student_streaks',
        'assignment_templates','feedback_templates','audit_logs','data_exports'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Units: Everyone can read
CREATE POLICY "Units are viewable by everyone" ON units FOR SELECT USING (true);

-- Lessons: Everyone can read
CREATE POLICY "Lessons are viewable by everyone" ON lessons FOR SELECT USING (true);

-- Checkpoints: Everyone can read
CREATE POLICY "Checkpoints are viewable by everyone" ON checkpoints FOR SELECT USING (true);

-- Student progress: Students see own, teachers see their students
CREATE POLICY "Students can view own progress" ON student_lesson_progress
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own progress" ON student_lesson_progress
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can modify own progress" ON student_lesson_progress
    FOR UPDATE USING (auth.uid() = student_id);

-- Checkpoint submissions: Students own, teachers can view
CREATE POLICY "Students can submit checkpoints" ON checkpoint_submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own submissions" ON checkpoint_submissions
    FOR SELECT USING (auth.uid() = student_id);

-- Concept mastery: Students own data
CREATE POLICY "Students can view own mastery" ON concept_mastery
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own mastery" ON concept_mastery
    FOR ALL USING (auth.uid() = student_id);

-- Badges: Students view own
CREATE POLICY "Students can view own badges" ON badges
    FOR SELECT USING (auth.uid() = student_id);

-- Streaks: Students own
CREATE POLICY "Students can view own streak" ON student_streaks
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own streak" ON student_streaks
    FOR ALL USING (auth.uid() = student_id);

-- Assignment templates: Teachers manage own
CREATE POLICY "Teachers can manage own templates" ON assignment_templates
    FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Public templates viewable by all" ON assignment_templates
    FOR SELECT USING (is_public = true);

-- Feedback templates: Teachers manage own
CREATE POLICY "Teachers can manage own feedback templates" ON feedback_templates
    FOR ALL USING (auth.uid() = teacher_id);

-- Audit logs: Admins only
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'full_admin', 'district_admin')
        )
    );

-- Data exports: Requesters and admins
CREATE POLICY "Users can view own export requests" ON data_exports
    FOR SELECT USING (auth.uid() = requested_by);

-- ============================================
-- PART 9: SEED DATA - SAMPLE COURSE
-- ============================================

-- Insert Python Basics course (trial-accessible)
INSERT INTO courses (id, name, description, language, level, difficulty_level, estimated_hours, is_trial_accessible, icon_name, color)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Python Fundamentals', 'Learn Python programming from scratch with hands-on practice', 'python', 'beginner', 'beginner', 30, true, 'Code', 'cyan')
ON CONFLICT (id) DO UPDATE SET
    is_trial_accessible = true,
    difficulty_level = 'beginner',
    estimated_hours = 30;

-- Insert sample units for Python Fundamentals
INSERT INTO units (course_id, title, description, order_index, learning_objectives) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Getting Started', 'Introduction to Python and basic concepts', 1, ARRAY['Understand what Python is', 'Write your first program', 'Use variables and data types']),
    ('00000000-0000-0000-0000-000000000001', 'Control Flow', 'Conditionals and loops', 2, ARRAY['Use if/else statements', 'Create for and while loops', 'Understand boolean logic']),
    ('00000000-0000-0000-0000-000000000001', 'Functions', 'Creating reusable code', 3, ARRAY['Define and call functions', 'Use parameters and return values', 'Understand scope'])
ON CONFLICT DO NOTHING;

-- Insert sample lessons (just first unit for now)
INSERT INTO lessons (unit_id, title, description, order_index, content_type, duration_minutes)
SELECT 
    u.id,
    'Variables and Data Types',
    'Learn how to store and work with different types of data in Python',
    1,
    'text',
    15
FROM units u WHERE u.title = 'Getting Started'
ON CONFLICT DO NOTHING;

INSERT INTO lessons (unit_id, title, description, order_index, content_type, duration_minutes)
SELECT 
    u.id,
    'Operators and Expressions',
    'Perform calculations and comparisons in Python',
    2,
    'text',
    20
FROM units u WHERE u.title = 'Getting Started'
ON CONFLICT DO NOTHING;

-- Insert sample checkpoints
INSERT INTO checkpoints (lesson_id, title, problem_description, starter_code, test_cases, points, order_index, concept_tags)
SELECT 
    l.id,
    'Create Your First Variable',
    'Create a variable called "name" and assign it your name as a string.',
    '# Write your code below\n',
    '[{"input": "", "expected_output": "name should be a string", "test_type": "variable_exists"}]'::jsonb,
    10,
    1,
    ARRAY['variables', 'strings']
FROM lessons l WHERE l.title = 'Variables and Data Types'
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 10: HELPER FUNCTIONS
-- ============================================

-- Function to check trial expiration
CREATE OR REPLACE FUNCTION is_trial_expired(teacher_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = teacher_id
        AND teacher_mode = 'trial'
        AND trial_end_date < NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trial days remaining
CREATE OR REPLACE FUNCTION trial_days_remaining(teacher_id UUID)
RETURNS INTEGER AS $$
DECLARE
    days INTEGER;
BEGIN
    SELECT EXTRACT(DAY FROM (trial_end_date - NOW()))::INTEGER
    INTO days
    FROM profiles
    WHERE id = teacher_id AND teacher_mode = 'trial';
    
    RETURN COALESCE(days, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate student mastery for a concept
CREATE OR REPLACE FUNCTION calculate_concept_mastery(
    p_student_id UUID,
    p_concept_name TEXT,
    p_course_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    avg_score NUMERIC;
BEGIN
    SELECT AVG(cs.score)
    INTO avg_score
    FROM checkpoint_submissions cs
    JOIN checkpoints c ON c.id = cs.checkpoint_id
    WHERE cs.student_id = p_student_id
    AND p_concept_name = ANY(c.concept_tags);
    
    RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award badge
CREATE OR REPLACE FUNCTION award_badge(
    p_student_id UUID,
    p_badge_type TEXT,
    p_badge_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_badge_id UUID;
BEGIN
    -- Check if already earned
    IF EXISTS (
        SELECT 1 FROM badges
        WHERE student_id = p_student_id AND badge_type = p_badge_type
    ) THEN
        RETURN NULL;
    END IF;
    
    INSERT INTO badges (student_id, badge_type, badge_name, badge_description)
    VALUES (p_student_id, p_badge_type, p_badge_name, p_description)
    RETURNING id INTO new_badge_id;
    
    RETURN new_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_student_streak(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
    today DATE := CURRENT_DATE;
    last_date DATE;
    current_streak_val INTEGER;
BEGIN
    SELECT last_activity_date, current_streak
    INTO last_date, current_streak_val
    FROM student_streaks
    WHERE student_id = p_student_id;
    
    IF NOT FOUND THEN
        -- Create new streak record
        INSERT INTO student_streaks (student_id, current_streak, longest_streak, last_activity_date)
        VALUES (p_student_id, 1, 1, today);
        RETURN;
    END IF;
    
    IF last_date = today THEN
        -- Already counted today
        RETURN;
    ELSIF last_date = today - INTERVAL '1 day' THEN
        -- Consecutive day
        UPDATE student_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = today
        WHERE student_id = p_student_id;
    ELSE
        -- Streak broken
        UPDATE student_streaks
        SET current_streak = 1,
            last_activity_date = today
        WHERE student_id = p_student_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE units IS 'Course units containing multiple lessons';
COMMENT ON TABLE lessons IS 'Individual lessons with content and learning materials';
COMMENT ON TABLE checkpoints IS 'Practice problems within lessons for immediate feedback';
COMMENT ON TABLE student_lesson_progress IS 'Tracks student progress through lessons';
COMMENT ON TABLE checkpoint_submissions IS 'Student submissions for checkpoint problems';
COMMENT ON TABLE concept_mastery IS 'Tracks student mastery level per programming concept';
COMMENT ON TABLE badges IS 'Achievement badges earned by students';
COMMENT ON TABLE student_streaks IS 'Tracks consecutive days of student activity';
COMMENT ON TABLE assignment_templates IS 'Reusable assignment templates for teachers';
COMMENT ON TABLE feedback_templates IS 'Quick feedback templates for grading';
COMMENT ON TABLE audit_logs IS 'Compliance and security audit trail';
COMMENT ON TABLE data_exports IS 'Tracks data export requests for compliance';


-- =====================================================================
-- END scripts/005_platform_v2_schema.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/006_legal_acceptance.sql
-- =====================================================================

-- Add legal acceptance tracking
-- This migration adds a table to track user acceptance of ToS and Privacy Policy

-- Create legal_acceptances table
CREATE TABLE IF NOT EXISTS legal_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    privacy_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    terms_version TEXT NOT NULL DEFAULT 'v1.0',
    privacy_version TEXT NOT NULL DEFAULT 'v1.0',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_id ON legal_acceptances(user_id);

-- Enable RLS
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'legal_acceptances'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.legal_acceptances', r.policyname);
  END LOOP;
END $$;

-- Policy: Users can view their own acceptance record
CREATE POLICY "Users can view own legal acceptance"
    ON legal_acceptances
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own acceptance (during signup)
CREATE POLICY "Users can create own legal acceptance"
    ON legal_acceptances
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Full admins can view all acceptances for compliance
CREATE POLICY "Full admins can view all legal acceptances"
    ON legal_acceptances
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'full_admin'
        )
    );

-- Add comment for documentation
COMMENT ON TABLE legal_acceptances IS 'Tracks user acceptance of Terms of Service and Privacy Policy for compliance';


-- =====================================================================
-- END scripts/006_legal_acceptance.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/007_course_enrollment_and_data.sql
-- =====================================================================

-- Course Enrollment and Sample Data Migration
-- This creates the course_enrollments table and populates courses with placeholder data

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage NUMERIC DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_enrollments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_enrollments', r.policyname);
  END LOOP;
END $$;

-- RLS Policies for course_enrollments
CREATE POLICY "Students can view own enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own enrollments"
  ON public.course_enrollments
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);

-- Insert sample courses (Python, JavaScript, Java, C++)
INSERT INTO public.courses (id, name, description, language, level, difficulty_level, estimated_hours, is_trial_accessible, icon_name, color, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Python Fundamentals', 'Learn Python programming from scratch with hands-on coding exercises and real-world projects', 'python', 'beginner', 'beginner', 40, true, 'Code', 'cyan', true),
  ('00000000-0000-0000-0000-000000000002', 'JavaScript Essentials', 'Master JavaScript fundamentals including ES6+, DOM manipulation, and async programming', 'javascript', 'beginner', 'beginner', 35, true, 'Code', 'yellow', true),
  ('00000000-0000-0000-0000-000000000003', 'Java Programming', 'Comprehensive Java course covering OOP, data structures, and application development', 'java', 'intermediate', 'intermediate', 50, false, 'Code', 'orange', true),
  ('00000000-0000-0000-0000-000000000004', 'C++ Mastery', 'Deep dive into C++ including memory management, STL, and advanced programming concepts', 'cpp', 'advanced', 'advanced', 60, false, 'Code', 'blue', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_trial_accessible = EXCLUDED.is_trial_accessible;

-- Insert Units for Python Fundamentals
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Getting Started with Python', 'Introduction to Python syntax, variables, and basic operations', 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Control Flow', 'Learn conditionals, loops, and program flow control', 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Functions and Modules', 'Create reusable code with functions and organize code with modules', 3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Data Structures', 'Master lists, dictionaries, sets, and tuples', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert Lessons for Python Unit 1
INSERT INTO public.lessons (id, unit_id, title, description, content_body, order_index, duration_minutes, content_type)
VALUES 
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Hello Python', 'Your first Python program', 'Learn how to write and run your first Python program using print statements.', 1, 15, 'text'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Variables and Types', 'Understanding data types', 'Explore Python variables, integers, floats, strings, and booleans.', 2, 20, 'text'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Basic Operations', 'Math and string operations', 'Perform arithmetic operations and string manipulations in Python.', 3, 25, 'text'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'User Input', 'Interactive programs', 'Create programs that accept and process user input.', 4, 20, 'text')
ON CONFLICT (id) DO NOTHING;

-- Insert Lessons for Python Unit 2
INSERT INTO public.lessons (id, unit_id, title, description, content_body, order_index, duration_minutes, content_type)
VALUES 
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'If Statements', 'Making decisions in code', 'Learn conditional logic with if, elif, and else statements.', 1, 20, 'text'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'While Loops', 'Repeating code with while', 'Use while loops to repeat code based on conditions.', 2, 25, 'text'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'For Loops', 'Iterating with for loops', 'Master for loops and the range function for iteration.', 3, 25, 'text')
ON CONFLICT (id) DO NOTHING;

-- Insert Checkpoints for Lesson 1
INSERT INTO public.checkpoints (id, lesson_id, title, problem_description, starter_code, solution_code, test_cases, order_index, points, difficulty, concept_tags)
VALUES 
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Print Hello World', 'Write a program that prints "Hello, World!" to the console', '# Write your code here\n', 'print("Hello, World!")', '[{"input": "", "expected": "Hello, World!", "description": "Should print Hello, World!"}]'::jsonb, 1, 10, 'easy', ARRAY['print', 'basics']),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Print Your Name', 'Create a program that prints your name', '# Print your name\n', 'print("Student Name")', '[{"input": "", "expected": "Student Name", "description": "Should print a name"}]'::jsonb, 2, 10, 'easy', ARRAY['print', 'strings'])
ON CONFLICT (id) DO NOTHING;

-- Insert Checkpoints for Lesson 2
INSERT INTO public.checkpoints (id, lesson_id, title, problem_description, starter_code, solution_code, test_cases, order_index, points, difficulty, concept_tags)
VALUES 
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Create Variables', 'Create variables for your name, age, and favorite color', '# Create three variables\nname = \nage = \ncolor = \n', 'name = "John"\nage = 25\ncolor = "blue"', '[{"input": "", "expected": "Variables created", "description": "Create name, age, and color variables"}]'::jsonb, 1, 15, 'easy', ARRAY['variables', 'types']),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Math Operations', 'Calculate the sum of two numbers', '# Calculate sum\na = 5\nb = 10\nresult = \nprint(result)', 'a = 5\nb = 10\nresult = a + b\nprint(result)', '[{"input": "", "expected": "15", "description": "Should print 15"}]'::jsonb, 2, 15, 'easy', ARRAY['math', 'operations'])
ON CONFLICT (id) DO NOTHING;

-- Insert Units for JavaScript
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'JavaScript Basics', 'Variables, data types, and operators', 1),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Functions and Scope', 'Creating and using functions', 2),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000002', 'DOM Manipulation', 'Working with HTML elements', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert Units for Java
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'Java Fundamentals', 'Syntax, variables, and data types', 1),
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000003', 'Object-Oriented Programming', 'Classes, objects, and inheritance', 2),
  ('10000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000003', 'Collections Framework', 'Lists, sets, and maps', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert Units for C++
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000004', 'C++ Basics', 'Syntax, variables, and control flow', 1),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000004', 'Pointers and Memory', 'Memory management and pointers', 2),
  ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000004', 'STL and Templates', 'Standard Template Library', 3)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;


-- =====================================================================
-- END scripts/007_course_enrollment_and_data.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/008_school_hierarchy_core.sql
-- =====================================================================

-- School hierarchy core
-- Full Admin -> Districts -> Schools -> Teachers -> Classes -> Students

-- Normalize districts code fields used inconsistently in app/scripts
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS district_code text;
UPDATE public.districts SET code = COALESCE(code, district_code);
UPDATE public.districts SET district_code = COALESCE(district_code, code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'districts_code_unique'
      AND conrelid = 'public.districts'::regclass
  ) THEN
    ALTER TABLE public.districts ADD CONSTRAINT districts_code_unique UNIQUE (code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'districts_district_code_unique'
      AND conrelid = 'public.districts'::regclass
  ) THEN
    ALTER TABLE public.districts ADD CONSTRAINT districts_district_code_unique UNIQUE (district_code);
  END IF;
END $$;

-- Schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  max_teachers integer NOT NULL DEFAULT 25 CHECK (max_teachers > 0),
  max_students integer NOT NULL DEFAULT 1500 CHECK (max_students > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_district_id ON public.schools(district_id);
CREATE INDEX IF NOT EXISTS idx_schools_admin_id ON public.schools(admin_id);

-- School admins mapping table (supports co-admin model)
CREATE TABLE IF NOT EXISTS public.school_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_school_admins_admin_id ON public.school_admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON public.school_admins(school_id);

-- Profiles role updates + school relationship
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student'));

-- Classrooms must belong to schools in new hierarchy
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_classrooms_school_id ON public.classrooms(school_id);

-- Keep district_id for reporting compatibility and backfill where possible
UPDATE public.classrooms c
SET district_id = s.district_id
FROM public.schools s
WHERE c.school_id = s.id
  AND c.district_id IS DISTINCT FROM s.district_id;


-- =====================================================================
-- END scripts/008_school_hierarchy_core.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/009_magic_links.sql
-- =====================================================================

-- Secure one-time invitation links

CREATE TABLE IF NOT EXISTS public.magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('school_admin', 'teacher')),
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email ON public.magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_school_id ON public.magic_links(school_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON public.magic_links(expires_at);

ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magic_links_select_admin" ON public.magic_links;
CREATE POLICY "magic_links_select_admin"
ON public.magic_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
);

DROP POLICY IF EXISTS "magic_links_insert_admin" ON public.magic_links;
CREATE POLICY "magic_links_insert_admin"
ON public.magic_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
);

DROP POLICY IF EXISTS "magic_links_update_admin" ON public.magic_links;
CREATE POLICY "magic_links_update_admin"
ON public.magic_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
);


-- =====================================================================
-- END scripts/009_magic_links.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/010_remove_trial_mode.sql
-- =====================================================================

-- Remove legacy trial mode

ALTER TABLE public.profiles DROP COLUMN IF EXISTS teacher_mode;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_start_date;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_end_date;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_student_count;

ALTER TABLE public.courses DROP COLUMN IF EXISTS is_trial_accessible;

DROP FUNCTION IF EXISTS is_trial_expired(uuid);
DROP FUNCTION IF EXISTS trial_days_remaining(uuid);


-- =====================================================================
-- END scripts/010_remove_trial_mode.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/011_school_rls_and_constraints.sql
-- =====================================================================

-- School constraints + RLS

-- Ensure teacher/school_admin rows have school_id before enforcing constraint.
-- This makes the migration rerunnable even on partially migrated datasets.
DO $$
DECLARE
  fallback_district_id uuid;
  fallback_school_id uuid;
BEGIN
  -- 1) Map teacher/school_admin from owned classrooms when possible
  UPDATE public.profiles p
  SET school_id = c.school_id
  FROM public.classrooms c
  WHERE p.role IN ('teacher', 'school_admin')
    AND p.school_id IS NULL
    AND c.teacher_id = p.id
    AND c.school_id IS NOT NULL;

  -- 2) Map school_admin from explicit school_admins table
  UPDATE public.profiles p
  SET school_id = sa.school_id
  FROM public.school_admins sa
  WHERE p.role = 'school_admin'
    AND p.school_id IS NULL
    AND sa.admin_id = p.id;

  -- 3) Map via district_admin linkage to any school in district
  UPDATE public.profiles p
  SET school_id = s.id
  FROM public.district_admins da
  JOIN public.schools s ON s.district_id = da.district_id
  WHERE p.role IN ('teacher', 'school_admin')
    AND p.school_id IS NULL
    AND da.admin_id = p.id;

  -- 4) Create fallback district/school if unresolved users remain
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role IN ('teacher', 'school_admin')
      AND school_id IS NULL
  ) THEN
    INSERT INTO public.districts (name, code, district_code, created_by)
    SELECT 'Unassigned District', 'UNASSIGNED', 'UNASSIGNED', id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1
    ON CONFLICT (code) DO NOTHING;

    SELECT id INTO fallback_district_id
    FROM public.districts
    WHERE code = 'UNASSIGNED'
    LIMIT 1;

    INSERT INTO public.schools (name, district_id, max_teachers, max_students, is_active)
    VALUES ('Unassigned School', fallback_district_id, 10000, 100000, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO fallback_school_id
    FROM public.schools
    WHERE district_id = fallback_district_id
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.profiles
    SET school_id = fallback_school_id
    WHERE role IN ('teacher', 'school_admin')
      AND school_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_teacher_school_required;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_teacher_school_required
  CHECK (
    role <> 'school_admin'
    OR school_id IS NOT NULL
  );

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select_hierarchy" ON public.schools;
CREATE POLICY "schools_select_hierarchy"
ON public.schools
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    WHERE da.admin_id = auth.uid()
      AND da.district_id = schools.district_id
  )
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = schools.id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.school_id = schools.id
  )
);

DROP POLICY IF EXISTS "schools_insert_admins" ON public.schools;
CREATE POLICY "schools_insert_admins"
ON public.schools
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    WHERE da.admin_id = auth.uid()
      AND da.district_id = schools.district_id
  )
);

DROP POLICY IF EXISTS "schools_update_admins" ON public.schools;
CREATE POLICY "schools_update_admins"
ON public.schools
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    WHERE da.admin_id = auth.uid()
      AND da.district_id = schools.district_id
  )
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = schools.id
  )
);

DROP POLICY IF EXISTS "school_admins_select_hierarchy" ON public.school_admins;
CREATE POLICY "school_admins_select_hierarchy"
ON public.school_admins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    JOIN public.schools s ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid()
      AND s.id = school_admins.school_id
  )
  OR school_admins.admin_id = auth.uid()
);

DROP POLICY IF EXISTS "school_admins_insert_hierarchy" ON public.school_admins;
CREATE POLICY "school_admins_insert_hierarchy"
ON public.school_admins
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    JOIN public.schools s ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid()
      AND s.id = school_admins.school_id
  )
);

-- Update classrooms policies for school hierarchy
DROP POLICY IF EXISTS "classrooms_select_hierarchy" ON public.classrooms;
CREATE POLICY "classrooms_select_hierarchy"
ON public.classrooms
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'full_admin')
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    JOIN public.schools s ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid() AND s.id = classrooms.school_id
  )
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid() AND sa.school_id = classrooms.school_id
  )
  OR classrooms.teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = auth.uid() AND e.classroom_id = classrooms.id)
);

DROP POLICY IF EXISTS "classrooms_insert_district_admin" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_insert" ON public.classrooms;
CREATE POLICY "classrooms_insert_hierarchy"
ON public.classrooms
FOR INSERT
WITH CHECK (
  classrooms.teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'full_admin')
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid() AND sa.school_id = classrooms.school_id
  )
);

DROP POLICY IF EXISTS "classrooms_update_hierarchy" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_update" ON public.classrooms;
CREATE POLICY "classrooms_update_hierarchy"
ON public.classrooms
FOR UPDATE
USING (
  classrooms.teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'full_admin')
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid() AND sa.school_id = classrooms.school_id
  )
);


-- =====================================================================
-- END scripts/011_school_rls_and_constraints.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/012_backfill_school_assignments.sql
-- =====================================================================

-- Backfill schools from existing district/teacher/classroom data

-- 1) Create one default school per district when none exists
INSERT INTO public.schools (name, district_id, created_by)
SELECT d.name || ' - Main School', d.id, d.created_by
FROM public.districts d
WHERE NOT EXISTS (
  SELECT 1 FROM public.schools s WHERE s.district_id = d.id
);

-- 2) If profile has school_name, try to map to existing school in same district first
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.school_id IS NULL
  AND p.role IN ('teacher', 'school_admin')
  AND p.school_name IS NOT NULL
  AND lower(trim(p.school_name)) = lower(trim(s.name));

-- 3) Map remaining teachers to district default school when district context exists
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.school_id IS NULL
  AND p.role IN ('teacher', 'school_admin')
  AND EXISTS (
    SELECT 1 FROM public.district_admins da
    WHERE da.admin_id = p.id
      AND da.district_id = s.district_id
  );

-- 4) Map teacher classrooms to teacher school
UPDATE public.classrooms c
SET school_id = p.school_id
FROM public.profiles p
WHERE c.teacher_id = p.id
  AND c.school_id IS NULL
  AND p.school_id IS NOT NULL;

-- 5) Map any remaining classrooms via district default school
UPDATE public.classrooms c
SET school_id = s.id
FROM public.schools s
WHERE c.school_id IS NULL
  AND c.district_id = s.district_id;

-- 6) Ensure district_id stays in sync where school is set
UPDATE public.classrooms c
SET district_id = s.district_id
FROM public.schools s
WHERE c.school_id = s.id
  AND c.district_id IS DISTINCT FROM s.district_id;


-- =====================================================================
-- END scripts/012_backfill_school_assignments.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/013_cleanup_legacy_paths.sql
-- =====================================================================

-- Legacy compatibility cleanup after school hierarchy rollout

-- Ensure all teachers have school_id before enforcing NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.role IN ('teacher', 'school_admin')
      AND p.school_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot finalize migration: some teacher/school_admin profiles still have NULL school_id';
  END IF;
END $$;

-- Optional hardening: apply NOT NULL once data is clean
-- ALTER TABLE public.profiles ALTER COLUMN school_id SET NOT NULL;

-- Trial dashboard route is deprecated at app layer; keep no DB dependency.


-- =====================================================================
-- END scripts/013_cleanup_legacy_paths.sql
-- =====================================================================


-- =====================================================================
-- BEGIN scripts/014_magic_links_account_types.sql
-- =====================================================================

-- Expand magic links to support all account types and role-aware invitation permissions

ALTER TABLE public.magic_links
  DROP CONSTRAINT IF EXISTS magic_links_role_check;

ALTER TABLE public.magic_links
  ADD CONSTRAINT magic_links_role_check
  CHECK (role IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student'));

-- Allow school_admin visibility for invites related to their school
DROP POLICY IF EXISTS "magic_links_select_admin" ON public.magic_links;
CREATE POLICY "magic_links_select_admin"
ON public.magic_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = magic_links.school_id
  )
);

-- Allow school_admin inserts scoped to own school
DROP POLICY IF EXISTS "magic_links_insert_admin" ON public.magic_links;
CREATE POLICY "magic_links_insert_admin"
ON public.magic_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = magic_links.school_id
  )
);

DROP POLICY IF EXISTS "magic_links_update_admin" ON public.magic_links;
CREATE POLICY "magic_links_update_admin"
ON public.magic_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = magic_links.school_id
  )
);


-- =====================================================================
-- END scripts/014_magic_links_account_types.sql
-- =====================================================================
