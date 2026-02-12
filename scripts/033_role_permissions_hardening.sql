-- Final role/permissions hardening migration
-- Goals:
-- - airtight role boundaries at DB level
-- - no circular RLS dependencies
-- - student access only to assigned classroom lessons/work
-- - teacher management limited to owned/scoped classrooms
-- - admin scope enforced in SQL, not frontend

BEGIN;

-- -------------------------------------------------------------------
-- 1) Canonical role/curriculum fields + constraints
-- -------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_edit_curriculum BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_teacher_school_required;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_teacher_school_required
  CHECK (
    role <> 'school_admin'
    OR school_id IS NOT NULL
  );

ALTER TABLE public.classrooms
  ALTER COLUMN teacher_id DROP NOT NULL;

-- Backfill legacy classroom control columns for environments that skipped
-- earlier migrations.
ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_teachers INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_students INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS pending_activation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_enrollments_classroom_student
  ON public.enrollments(classroom_id, student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_classroom
  ON public.enrollments(student_id, classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom
  ON public.assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student
  ON public.submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_classroom_lesson
  ON public.lesson_assignments(classroom_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_student_lesson
  ON public.student_lesson_progress(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_lesson_id
  ON public.checkpoints(lesson_id);

-- -------------------------------------------------------------------
-- 2) Security-definer helper functions (policy primitives)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_user_role(target_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = target_user_id
    AND (
      target_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role = 'full_admin'
      )
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_user_school_id(target_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.school_id
  FROM public.profiles p
  WHERE p.id = target_user_id
    AND (
      target_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('full_admin', 'district_admin', 'school_admin')
      )
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_is_full_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_user_role(target_user_id) = 'full_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_district_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_user_role(target_user_id) = 'district_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_school_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_user_role(target_user_id) = 'school_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_teacher(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_user_role(target_user_id) = 'teacher', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_student(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_user_role(target_user_id) = 'student', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_user_role(target_user_id) IN ('full_admin', 'district_admin', 'school_admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.app_user_manages_district(target_district_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_is_full_admin(target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.district_admins da
      WHERE da.admin_id = target_user_id
        AND da.district_id = target_district_id
    );
$$;

CREATE OR REPLACE FUNCTION public.app_user_school_district_id(target_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.district_id
  FROM public.profiles p
  JOIN public.schools s ON s.id = p.school_id
  WHERE p.id = target_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_can_manage_school(target_school_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_is_full_admin(target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.district_admins da
      JOIN public.schools s ON s.district_id = da.district_id
      WHERE da.admin_id = target_user_id
        AND s.id = target_school_id
    )
    OR (
      public.app_is_school_admin(target_user_id)
      AND public.app_user_school_id(target_user_id) = target_school_id
    );
$$;

CREATE OR REPLACE FUNCTION public.app_is_profile_in_admin_scope(target_profile_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_profile AS (
    SELECT p.id, p.school_id
    FROM public.profiles p
    WHERE p.id = target_profile_id
    LIMIT 1
  )
  SELECT
    target_profile.id = target_user_id
    OR public.app_is_full_admin(target_user_id)
    OR (
      public.app_is_district_admin(target_user_id)
      AND EXISTS (
        SELECT 1
        FROM public.district_admins da
        JOIN public.schools s ON s.district_id = da.district_id
        WHERE da.admin_id = target_user_id
          AND s.id = target_profile.school_id
      )
    )
    OR (
      public.app_is_school_admin(target_user_id)
      AND target_profile.school_id = public.app_user_school_id(target_user_id)
    )
  FROM target_profile;
$$;

CREATE OR REPLACE FUNCTION public.app_is_enrolled_in_classroom(target_classroom_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.classroom_id = target_classroom_id
      AND e.student_id = target_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.app_teacher_owns_classroom(target_classroom_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = target_classroom_id
      AND c.teacher_id = target_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.app_can_manage_classroom(target_classroom_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_teacher_owns_classroom(target_classroom_id, target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = target_classroom_id
        AND public.app_can_manage_school(c.school_id, target_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.app_can_view_classroom(target_classroom_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_can_manage_classroom(target_classroom_id, target_user_id)
    OR public.app_is_enrolled_in_classroom(target_classroom_id, target_user_id);
$$;

CREATE OR REPLACE FUNCTION public.app_classroom_is_joinable(target_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = target_classroom_id
      AND COALESCE(c.is_active, true)
  );
$$;

CREATE OR REPLACE FUNCTION public.lookup_classroom_by_code(target_code text, require_admin_created boolean DEFAULT false)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  code text,
  created_by_admin boolean,
  is_active boolean,
  max_teachers integer,
  max_students integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    c.code,
    COALESCE(c.created_by_admin, false) AS created_by_admin,
    COALESCE(c.is_active, true) AS is_active,
    c.max_teachers,
    c.max_students
  FROM public.classrooms c
  WHERE auth.uid() IS NOT NULL
    AND public.app_user_role(auth.uid()) IN ('student', 'teacher', 'school_admin', 'district_admin', 'full_admin')
    AND c.code = UPPER(TRIM(target_code))
    AND COALESCE(c.is_active, true)
    AND (NOT require_admin_created OR COALESCE(c.created_by_admin, false))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_can_manage_assignment(target_assignment_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = target_assignment_id
      AND public.app_can_manage_classroom(a.classroom_id, target_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.app_can_view_assignment(target_assignment_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = target_assignment_id
      AND (
        public.app_can_manage_classroom(a.classroom_id, target_user_id)
        OR public.app_is_enrolled_in_classroom(a.classroom_id, target_user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.app_is_student_assigned_lesson(target_student_id uuid, target_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.lesson_assignments la
      ON la.classroom_id = e.classroom_id
    WHERE e.student_id = target_student_id
      AND la.lesson_id = target_lesson_id
  );
$$;

CREATE OR REPLACE FUNCTION public.app_is_student_assigned_checkpoint(target_student_id uuid, target_checkpoint_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.checkpoints cp
    WHERE cp.id = target_checkpoint_id
      AND public.app_is_student_assigned_lesson(target_student_id, cp.lesson_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.app_can_view_lesson_progress(
  target_student_id uuid,
  target_lesson_id uuid,
  target_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_is_full_admin(target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.lesson_assignments la
      JOIN public.enrollments e
        ON e.classroom_id = la.classroom_id
      WHERE e.student_id = target_student_id
        AND la.lesson_id = target_lesson_id
        AND public.app_can_manage_classroom(la.classroom_id, target_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.app_can_manage_checkpoint_submission(
  target_student_id uuid,
  target_checkpoint_id uuid,
  target_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_is_full_admin(target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.checkpoints cp
      JOIN public.lesson_assignments la
        ON la.lesson_id = cp.lesson_id
      JOIN public.enrollments e
        ON e.classroom_id = la.classroom_id
      WHERE cp.id = target_checkpoint_id
        AND e.student_id = target_student_id
        AND public.app_can_manage_classroom(la.classroom_id, target_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.app_is_valid_progress_assignment(
  target_student_id uuid,
  target_lesson_id uuid,
  target_assignment_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_assignment_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.lesson_assignments la
      JOIN public.enrollments e
        ON e.classroom_id = la.classroom_id
      WHERE la.id = target_assignment_id
        AND la.lesson_id = target_lesson_id
        AND e.student_id = target_student_id
    );
$$;

CREATE OR REPLACE FUNCTION public.app_can_edit_curriculum(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_is_admin(target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = target_user_id
        AND p.role = 'teacher'
        AND p.can_edit_curriculum = true
    );
$$;

-- Prevent graders/admins from mutating student code/ownership while grading.
CREATE OR REPLACE FUNCTION public.enforce_submission_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF actor = OLD.student_id THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
      OR NEW.score IS DISTINCT FROM OLD.score
      OR NEW.feedback IS DISTINCT FROM OLD.feedback
      OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
    THEN
      RAISE EXCEPTION 'Students cannot modify grading or ownership fields';
    END IF;
    RETURN NEW;
  END IF;

  IF public.app_can_manage_assignment(OLD.assignment_id, actor) THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
      OR NEW.code IS DISTINCT FROM OLD.code
      OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
    THEN
      RAISE EXCEPTION 'Graders cannot modify submission ownership, assignment, or code';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update this submission';
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_role text;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  actor_role := public.app_user_role(actor);

  -- Self-service profile updates: allow onboarding school assignment only; block escalation.
  IF actor = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT (
        OLD.role = 'student'
        AND NEW.role = 'teacher'
        AND OLD.school_id IS NULL
        AND NEW.school_id IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'Role changes require admin action';
      END IF;
    END IF;

    IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      IF NOT (
        OLD.school_id IS NULL
        AND NEW.school_id IS NOT NULL
        AND NEW.role = 'teacher'
        AND OLD.role IN ('student', 'teacher')
      ) THEN
        RAISE EXCEPTION 'School reassignment requires admin action';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Only full_admin can grant/modify full_admin or district_admin.
  IF actor_role <> 'full_admin'
    AND (
      (NEW.role IN ('full_admin', 'district_admin') AND NEW.role IS DISTINCT FROM OLD.role)
      OR (OLD.role IN ('full_admin', 'district_admin') AND NEW.role IS DISTINCT FROM OLD.role)
    )
  THEN
    RAISE EXCEPTION 'Only full admin can modify full/district admin roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_submission_mutation ON public.submissions;
CREATE TRIGGER trg_enforce_submission_mutation
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_submission_mutation();

DROP TRIGGER IF EXISTS trg_enforce_profile_mutation ON public.profiles;
CREATE TRIGGER trg_enforce_profile_mutation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_mutation();

-- Helper functions are for policy use only.
REVOKE ALL ON FUNCTION public.app_user_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_school_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_full_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_district_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_school_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_teacher(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_manages_district(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_school_district_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_manage_school(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_profile_in_admin_scope(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_enrolled_in_classroom(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_teacher_owns_classroom(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_manage_classroom(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_view_classroom(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_classroom_is_joinable(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_classroom_by_code(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_manage_assignment(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_view_assignment(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_student_assigned_lesson(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_student_assigned_checkpoint(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_view_lesson_progress(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_manage_checkpoint_submission(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_valid_progress_assignment(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_edit_curriculum(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_submission_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_profile_mutation() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_school_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_full_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_district_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_school_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_manages_district(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_school_district_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_manage_school(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_profile_in_admin_scope(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_enrolled_in_classroom(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_teacher_owns_classroom(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_manage_classroom(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_view_classroom(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_classroom_is_joinable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_classroom_by_code(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_manage_assignment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_view_assignment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_student_assigned_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_student_assigned_checkpoint(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_view_lesson_progress(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_manage_checkpoint_submission(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_valid_progress_assignment(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_edit_curriculum(uuid) TO authenticated;

-- -------------------------------------------------------------------
-- 3) Reset + rebuild policies for core security tables
-- -------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
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
        'course_enrollments'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Profiles
CREATE POLICY profiles_select_self_or_scoped_admin
ON public.profiles
FOR SELECT
USING (public.app_is_profile_in_admin_scope(id));

CREATE POLICY profiles_insert_self_non_admin
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id
  AND role IN ('student', 'teacher')
);

CREATE POLICY profiles_update_self_non_admin
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id
  AND public.app_user_role(auth.uid()) IN ('student', 'teacher')
)
WITH CHECK (
  auth.uid() = id
  AND role IN ('student', 'teacher')
  AND (
    role = public.app_user_role(auth.uid())
    OR (
      public.app_user_role(auth.uid()) = 'student'
      AND role = 'teacher'
      AND school_id IS NOT NULL
    )
  )
);

CREATE POLICY profiles_update_self_admin_no_role_change
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id
  AND public.app_is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = id
  AND role = public.app_user_role(auth.uid())
);

CREATE POLICY profiles_update_scoped_admin
ON public.profiles
FOR UPDATE
USING (
  auth.uid() <> id
  AND public.app_is_profile_in_admin_scope(id)
)
WITH CHECK (
  auth.uid() <> id
  AND public.app_is_profile_in_admin_scope(id)
  AND (
    public.app_is_full_admin(auth.uid())
    OR (
      public.app_is_district_admin(auth.uid())
      AND role IN ('student', 'teacher', 'school_admin')
      AND (
        school_id IS NULL
        OR public.app_can_manage_school(school_id, auth.uid())
      )
    )
    OR (
      public.app_is_school_admin(auth.uid())
      AND role IN ('student', 'teacher')
      AND school_id = public.app_user_school_id(auth.uid())
    )
  )
);

-- Districts
CREATE POLICY districts_select_scoped
ON public.districts
FOR SELECT
USING (
  public.app_user_manages_district(districts.id, auth.uid())
);

CREATE POLICY districts_insert_full_admin
ON public.districts
FOR INSERT
WITH CHECK (public.app_is_full_admin(auth.uid()));

CREATE POLICY districts_update_scoped_admin
ON public.districts
FOR UPDATE
USING (
  public.app_user_manages_district(districts.id, auth.uid())
)
WITH CHECK (
  public.app_user_manages_district(districts.id, auth.uid())
);

CREATE POLICY districts_delete_full_admin
ON public.districts
FOR DELETE
USING (public.app_is_full_admin(auth.uid()));

-- District Admins
CREATE POLICY district_admins_select_scoped
ON public.district_admins
FOR SELECT
USING (
  public.app_is_full_admin(auth.uid())
  OR district_admins.admin_id = auth.uid()
  OR public.app_user_manages_district(district_admins.district_id, auth.uid())
);

CREATE POLICY district_admins_insert_full_admin
ON public.district_admins
FOR INSERT
WITH CHECK (public.app_is_full_admin(auth.uid()));

CREATE POLICY district_admins_delete_full_admin
ON public.district_admins
FOR DELETE
USING (public.app_is_full_admin(auth.uid()));

-- Schools
CREATE POLICY schools_select_scoped
ON public.schools
FOR SELECT
USING (
  public.app_can_manage_school(schools.id, auth.uid())
  OR public.app_user_school_id(auth.uid()) = schools.id
);

CREATE POLICY schools_insert_scoped_admin
ON public.schools
FOR INSERT
WITH CHECK (
  public.app_user_manages_district(schools.district_id, auth.uid())
);

CREATE POLICY schools_update_scoped_admin
ON public.schools
FOR UPDATE
USING (
  public.app_can_manage_school(schools.id, auth.uid())
)
WITH CHECK (
  public.app_is_full_admin(auth.uid())
  OR public.app_user_manages_district(schools.district_id, auth.uid())
  OR (
    public.app_is_school_admin(auth.uid())
    AND schools.id = public.app_user_school_id(auth.uid())
    AND schools.district_id = public.app_user_school_district_id(auth.uid())
  )
);

CREATE POLICY schools_delete_full_admin
ON public.schools
FOR DELETE
USING (public.app_is_full_admin(auth.uid()));

-- School Admins
CREATE POLICY school_admins_select_scoped
ON public.school_admins
FOR SELECT
USING (
  school_admins.admin_id = auth.uid()
  OR public.app_can_manage_school(school_admins.school_id, auth.uid())
);

CREATE POLICY school_admins_insert_scoped_admin
ON public.school_admins
FOR INSERT
WITH CHECK (
  public.app_is_full_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.district_admins da
    JOIN public.schools s
      ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid()
      AND s.id = school_admins.school_id
  )
);

CREATE POLICY school_admins_delete_scoped_admin
ON public.school_admins
FOR DELETE
USING (
  public.app_is_full_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.district_admins da
    JOIN public.schools s
      ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid()
      AND s.id = school_admins.school_id
  )
);

-- Classrooms
CREATE POLICY classrooms_select_scoped
ON public.classrooms
FOR SELECT
USING (public.app_can_view_classroom(classrooms.id, auth.uid()));

CREATE POLICY classrooms_insert_scoped
ON public.classrooms
FOR INSERT
WITH CHECK (
  (
    classrooms.teacher_id = auth.uid()
    AND public.app_is_teacher(auth.uid())
    AND classrooms.school_id = public.app_user_school_id(auth.uid())
  )
  OR public.app_can_manage_school(classrooms.school_id, auth.uid())
);

CREATE POLICY classrooms_update_scoped
ON public.classrooms
FOR UPDATE
USING (public.app_can_manage_classroom(classrooms.id, auth.uid()))
WITH CHECK (
  (
    classrooms.teacher_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = classrooms.teacher_id
        AND p.role = 'teacher'
    )
  )
  AND (
    (
      classrooms.teacher_id = auth.uid()
      AND public.app_is_teacher(auth.uid())
      AND classrooms.school_id = public.app_user_school_id(auth.uid())
    )
    OR public.app_can_manage_school(classrooms.school_id, auth.uid())
  )
);

CREATE POLICY classrooms_delete_scoped
ON public.classrooms
FOR DELETE
USING (public.app_can_manage_classroom(classrooms.id, auth.uid()));

-- Enrollments
CREATE POLICY enrollments_select_scoped
ON public.enrollments
FOR SELECT
USING (
  enrollments.student_id = auth.uid()
  OR public.app_can_manage_classroom(enrollments.classroom_id, auth.uid())
);

CREATE POLICY enrollments_insert_scoped
ON public.enrollments
FOR INSERT
WITH CHECK (
  (
    enrollments.student_id = auth.uid()
    AND public.app_is_student(auth.uid())
    AND public.app_classroom_is_joinable(enrollments.classroom_id)
  )
  OR public.app_can_manage_classroom(enrollments.classroom_id, auth.uid())
);

CREATE POLICY enrollments_update_admin
ON public.enrollments
FOR UPDATE
USING (public.app_can_manage_classroom(enrollments.classroom_id, auth.uid()))
WITH CHECK (public.app_can_manage_classroom(enrollments.classroom_id, auth.uid()));

CREATE POLICY enrollments_delete_scoped
ON public.enrollments
FOR DELETE
USING (
  enrollments.student_id = auth.uid()
  OR public.app_can_manage_classroom(enrollments.classroom_id, auth.uid())
);

-- Assignments (classroom coding assignments)
CREATE POLICY assignments_select_scoped
ON public.assignments
FOR SELECT
USING (public.app_can_view_assignment(assignments.id, auth.uid()));

CREATE POLICY assignments_insert_scoped
ON public.assignments
FOR INSERT
WITH CHECK (public.app_can_manage_classroom(assignments.classroom_id, auth.uid()));

CREATE POLICY assignments_update_scoped
ON public.assignments
FOR UPDATE
USING (public.app_can_manage_assignment(assignments.id, auth.uid()))
WITH CHECK (public.app_can_manage_classroom(assignments.classroom_id, auth.uid()));

CREATE POLICY assignments_delete_scoped
ON public.assignments
FOR DELETE
USING (public.app_can_manage_assignment(assignments.id, auth.uid()));

-- Submissions
CREATE POLICY submissions_select_scoped
ON public.submissions
FOR SELECT
USING (
  submissions.student_id = auth.uid()
  OR public.app_can_manage_assignment(submissions.assignment_id, auth.uid())
);

CREATE POLICY submissions_insert_student
ON public.submissions
FOR INSERT
WITH CHECK (
  submissions.student_id = auth.uid()
  AND public.app_can_view_assignment(submissions.assignment_id, auth.uid())
);

CREATE POLICY submissions_update_student
ON public.submissions
FOR UPDATE
USING (submissions.student_id = auth.uid())
WITH CHECK (
  submissions.student_id = auth.uid()
  AND public.app_can_view_assignment(submissions.assignment_id, auth.uid())
);

CREATE POLICY submissions_update_grader
ON public.submissions
FOR UPDATE
USING (public.app_can_manage_assignment(submissions.assignment_id, auth.uid()))
WITH CHECK (public.app_can_manage_assignment(submissions.assignment_id, auth.uid()));

-- Lesson Assignments
CREATE POLICY lesson_assignments_select_scoped
ON public.lesson_assignments
FOR SELECT
USING (
  public.app_can_manage_classroom(lesson_assignments.classroom_id, auth.uid())
  OR public.app_is_enrolled_in_classroom(lesson_assignments.classroom_id, auth.uid())
);

CREATE POLICY lesson_assignments_insert_scoped
ON public.lesson_assignments
FOR INSERT
WITH CHECK (
  lesson_assignments.assigned_by = auth.uid()
  AND public.app_can_manage_classroom(lesson_assignments.classroom_id, auth.uid())
);

CREATE POLICY lesson_assignments_update_scoped
ON public.lesson_assignments
FOR UPDATE
USING (public.app_can_manage_classroom(lesson_assignments.classroom_id, auth.uid()))
WITH CHECK (
  public.app_can_manage_classroom(lesson_assignments.classroom_id, auth.uid())
);

CREATE POLICY lesson_assignments_delete_scoped
ON public.lesson_assignments
FOR DELETE
USING (public.app_can_manage_classroom(lesson_assignments.classroom_id, auth.uid()));

-- Lessons + checkpoints
CREATE POLICY units_select_role_scoped
ON public.units
FOR SELECT
USING (
  public.app_is_admin(auth.uid())
  OR public.app_is_teacher(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.unit_id = units.id
      AND public.app_is_student_assigned_lesson(auth.uid(), l.id)
  )
);

CREATE POLICY units_modify_curriculum_scoped
ON public.units
FOR ALL
USING (public.app_can_edit_curriculum(auth.uid()))
WITH CHECK (public.app_can_edit_curriculum(auth.uid()));

CREATE POLICY lessons_select_role_scoped
ON public.lessons
FOR SELECT
USING (
  public.app_is_admin(auth.uid())
  OR public.app_is_teacher(auth.uid())
  OR public.app_is_student_assigned_lesson(auth.uid(), lessons.id)
);

CREATE POLICY lessons_modify_curriculum_scoped
ON public.lessons
FOR ALL
USING (public.app_can_edit_curriculum(auth.uid()))
WITH CHECK (public.app_can_edit_curriculum(auth.uid()));

CREATE POLICY checkpoints_select_role_scoped
ON public.checkpoints
FOR SELECT
USING (
  public.app_is_admin(auth.uid())
  OR public.app_is_teacher(auth.uid())
  OR public.app_is_student_assigned_lesson(auth.uid(), checkpoints.lesson_id)
);

CREATE POLICY checkpoints_modify_curriculum_scoped
ON public.checkpoints
FOR ALL
USING (public.app_can_edit_curriculum(auth.uid()))
WITH CHECK (public.app_can_edit_curriculum(auth.uid()));

-- Student lesson progress
CREATE POLICY student_lesson_progress_select_scoped
ON public.student_lesson_progress
FOR SELECT
USING (
  student_lesson_progress.student_id = auth.uid()
  OR public.app_can_view_lesson_progress(
    student_lesson_progress.student_id,
    student_lesson_progress.lesson_id,
    auth.uid()
  )
);

CREATE POLICY student_lesson_progress_insert_student
ON public.student_lesson_progress
FOR INSERT
WITH CHECK (
  student_lesson_progress.student_id = auth.uid()
  AND public.app_is_student_assigned_lesson(student_lesson_progress.student_id, student_lesson_progress.lesson_id)
  AND public.app_is_valid_progress_assignment(
    student_lesson_progress.student_id,
    student_lesson_progress.lesson_id,
    student_lesson_progress.assignment_id
  )
);

CREATE POLICY student_lesson_progress_update_student
ON public.student_lesson_progress
FOR UPDATE
USING (student_lesson_progress.student_id = auth.uid())
WITH CHECK (
  student_lesson_progress.student_id = auth.uid()
  AND public.app_is_student_assigned_lesson(student_lesson_progress.student_id, student_lesson_progress.lesson_id)
  AND public.app_is_valid_progress_assignment(
    student_lesson_progress.student_id,
    student_lesson_progress.lesson_id,
    student_lesson_progress.assignment_id
  )
);

-- Checkpoint submissions
CREATE POLICY checkpoint_submissions_select_scoped
ON public.checkpoint_submissions
FOR SELECT
USING (
  checkpoint_submissions.student_id = auth.uid()
  OR public.app_can_manage_checkpoint_submission(
    checkpoint_submissions.student_id,
    checkpoint_submissions.checkpoint_id,
    auth.uid()
  )
);

CREATE POLICY checkpoint_submissions_insert_student
ON public.checkpoint_submissions
FOR INSERT
WITH CHECK (
  checkpoint_submissions.student_id = auth.uid()
  AND public.app_is_student_assigned_checkpoint(
    checkpoint_submissions.student_id,
    checkpoint_submissions.checkpoint_id
  )
);

-- Class announcements
CREATE POLICY class_announcements_select_scoped
ON public.class_announcements
FOR SELECT
USING (public.app_can_view_classroom(class_announcements.classroom_id, auth.uid()));

CREATE POLICY class_announcements_insert_scoped
ON public.class_announcements
FOR INSERT
WITH CHECK (
  class_announcements.teacher_id = auth.uid()
  AND public.app_can_manage_classroom(class_announcements.classroom_id, auth.uid())
);

CREATE POLICY class_announcements_update_scoped
ON public.class_announcements
FOR UPDATE
USING (
  public.app_can_manage_classroom(class_announcements.classroom_id, auth.uid())
  AND (
    class_announcements.teacher_id = auth.uid()
    OR public.app_is_admin(auth.uid())
  )
)
WITH CHECK (
  public.app_can_manage_classroom(class_announcements.classroom_id, auth.uid())
  AND (
    class_announcements.teacher_id = auth.uid()
    OR public.app_is_admin(auth.uid())
  )
);

CREATE POLICY class_announcements_delete_scoped
ON public.class_announcements
FOR DELETE
USING (
  public.app_can_manage_classroom(class_announcements.classroom_id, auth.uid())
  AND (
    class_announcements.teacher_id = auth.uid()
    OR public.app_is_admin(auth.uid())
  )
);

-- Course enrollments
CREATE POLICY course_enrollments_select_scoped
ON public.course_enrollments
FOR SELECT
USING (
  course_enrollments.student_id = auth.uid()
  OR public.app_is_full_admin(auth.uid())
  OR public.app_can_manage_school(public.app_user_school_id(course_enrollments.student_id), auth.uid())
);

CREATE POLICY course_enrollments_insert_student
ON public.course_enrollments
FOR INSERT
WITH CHECK (
  course_enrollments.student_id = auth.uid()
  AND public.app_is_student(auth.uid())
);

CREATE POLICY course_enrollments_update_student
ON public.course_enrollments
FOR UPDATE
USING (course_enrollments.student_id = auth.uid())
WITH CHECK (
  course_enrollments.student_id = auth.uid()
  AND public.app_is_student(auth.uid())
);

COMMIT;
