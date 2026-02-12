-- Deployment Verification Script (Role Security Final)
-- Run after applying schema migrations, especially:
-- - scripts/031_fix_school_admins_policy_recursion.sql
-- - scripts/032_fix_classrooms_policy_recursion.sql
-- - scripts/033_role_permissions_hardening.sql
-- - scripts/034_role_permissions_finalize.sql

-- ============================================================================
-- 1) RLS must be enabled on core role-sensitive tables
-- ============================================================================
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'districts',
    'district_admins',
    'schools',
    'school_admins',
    'classrooms',
    'enrollments',
    'assignments',
    'submissions',
    'lesson_assignments',
    'student_lesson_progress',
    'units',
    'lessons',
    'checkpoints',
    'checkpoint_submissions',
    'class_announcements',
    'course_enrollments',
    'class_requests',
    'teacher_requests',
    'messages',
    'magic_links',
    'courses',
    'course_categories',
    'classroom_course_offerings'
  )
ORDER BY tablename;

-- ============================================================================
-- 2) Core helper functions must exist
-- ============================================================================
SELECT
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'app_user_role',
    'app_user_school_id',
    'app_is_full_admin',
    'app_is_district_admin',
    'app_is_school_admin',
    'app_is_teacher',
    'app_is_student',
    'app_is_admin',
    'app_user_manages_district',
    'app_user_school_district_id',
    'app_can_manage_school',
    'app_is_profile_in_admin_scope',
    'app_is_enrolled_in_classroom',
    'app_teacher_owns_classroom',
    'app_can_manage_classroom',
    'app_can_view_classroom',
    'app_classroom_is_joinable',
    'lookup_classroom_by_code',
    'app_can_manage_assignment',
    'app_can_view_assignment',
    'app_is_student_assigned_lesson',
    'app_is_student_assigned_checkpoint',
    'app_can_view_lesson_progress',
    'app_can_manage_checkpoint_submission',
    'app_is_valid_progress_assignment',
    'app_can_edit_curriculum',
    'app_can_create_magic_link',
    'app_can_send_message',
    'app_student_can_enroll_course',
    'enforce_submission_mutation',
    'enforce_profile_mutation',
    'enforce_message_mutation',
    'redeem_magic_link'
  )
ORDER BY p.proname;

-- ============================================================================
-- 3) Validate canonical role constraints
-- ============================================================================
SELECT
  conname,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'profiles'
  AND conname IN ('profiles_role_check', 'profiles_teacher_school_required')
ORDER BY conname;

-- ============================================================================
-- 4) Guardrail triggers must exist
-- ============================================================================
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND t.tgname IN ('trg_enforce_submission_mutation', 'trg_enforce_profile_mutation', 'trg_enforce_message_mutation')
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- 5) Check policy inventory for core tables
-- ============================================================================
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'schools',
    'school_admins',
    'classrooms',
    'enrollments',
    'assignments',
    'submissions',
    'lesson_assignments',
    'student_lesson_progress',
    'units',
    'lessons',
    'checkpoints',
    'checkpoint_submissions',
    'class_announcements',
    'class_requests',
    'teacher_requests',
    'messages',
    'magic_links',
    'courses',
    'course_categories',
    'classroom_course_offerings'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- 6) Sanity checks for key relational integrity
-- ============================================================================
SELECT
  'classrooms_without_school' AS check_name,
  COUNT(*) AS issue_count
FROM public.classrooms
WHERE school_id IS NULL
UNION ALL
SELECT
  'school_admin_without_school' AS check_name,
  COUNT(*) AS issue_count
FROM public.profiles
WHERE role = 'school_admin'
  AND school_id IS NULL
UNION ALL
SELECT
  'orphan_enrollments' AS check_name,
  COUNT(*) AS issue_count
FROM public.enrollments e
LEFT JOIN public.classrooms c ON c.id = e.classroom_id
WHERE c.id IS NULL
UNION ALL
SELECT
  'orphan_submissions' AS check_name,
  COUNT(*) AS issue_count
FROM public.submissions s
LEFT JOIN public.assignments a ON a.id = s.assignment_id
WHERE a.id IS NULL
UNION ALL
SELECT
  'orphan_class_requests' AS check_name,
  COUNT(*) AS issue_count
FROM public.class_requests cr
LEFT JOIN public.classrooms c ON c.id = cr.classroom_id
WHERE c.id IS NULL
UNION ALL
SELECT
  'orphan_teacher_requests' AS check_name,
  COUNT(*) AS issue_count
FROM public.teacher_requests tr
LEFT JOIN public.classrooms c ON c.id = tr.classroom_id
WHERE c.id IS NULL
UNION ALL
SELECT
  'messages_self_targeted' AS check_name,
  COUNT(*) AS issue_count
FROM public.messages m
WHERE m.sender_id = m.recipient_id
UNION ALL
SELECT
  'orphan_classroom_course_offerings' AS check_name,
  COUNT(*) AS issue_count
FROM public.classroom_course_offerings cco
LEFT JOIN public.classrooms c ON c.id = cco.classroom_id
LEFT JOIN public.courses co ON co.id = cco.course_id
WHERE c.id IS NULL OR co.id IS NULL;

-- ============================================================================
-- 7) Recursion risk check (policy text should not self-query the same table)
-- ============================================================================
SELECT
  tablename,
  policyname,
  CASE
    WHEN COALESCE(qual, '') ILIKE ('%from public.' || tablename || '%')
      OR COALESCE(qual, '') ILIKE ('%join public.' || tablename || '%')
      OR COALESCE(with_check, '') ILIKE ('%from public.' || tablename || '%')
      OR COALESCE(with_check, '') ILIKE ('%join public.' || tablename || '%')
    THEN 'RISK'
    ELSE 'OK'
  END AS recursion_risk
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'districts',
    'district_admins',
    'schools',
    'school_admins',
    'classrooms',
    'enrollments',
    'assignments',
    'submissions',
    'lesson_assignments',
    'student_lesson_progress',
    'units',
    'lessons',
    'checkpoints',
    'checkpoint_submissions',
    'class_announcements',
    'course_enrollments',
    'class_requests',
    'teacher_requests',
    'messages',
    'magic_links',
    'courses',
    'course_categories',
    'classroom_course_offerings'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- 8) Optional summary
-- ============================================================================
SELECT
  'Role security verification complete. Review issue_count and recursion_risk outputs.' AS status;
