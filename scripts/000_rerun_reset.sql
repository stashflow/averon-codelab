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
