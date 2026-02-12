-- Classroom course offerings and student enrollment gating.
-- Teachers can offer specific courses per classroom and decide whether
-- students may enroll in unrelated courses.

BEGIN;

ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS allow_non_related_courses BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.classroom_course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  offered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(classroom_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_course_offerings_classroom
  ON public.classroom_course_offerings(classroom_id, is_active);
CREATE INDEX IF NOT EXISTS idx_classroom_course_offerings_course
  ON public.classroom_course_offerings(course_id, is_active);

CREATE OR REPLACE FUNCTION public.app_student_can_enroll_course(
  target_student_id uuid,
  target_course_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.classrooms c
      ON c.id = e.classroom_id
    WHERE e.student_id = target_student_id
      AND (
        COALESCE(c.allow_non_related_courses, false)
        OR EXISTS (
          SELECT 1
          FROM public.classroom_course_offerings cco
          WHERE cco.classroom_id = e.classroom_id
            AND cco.course_id = target_course_id
            AND COALESCE(cco.is_active, true)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.app_student_can_enroll_course(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_student_can_enroll_course(uuid, uuid) TO authenticated;

ALTER TABLE public.classroom_course_offerings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('classroom_course_offerings', 'course_enrollments')
  LOOP
    IF r.tablename = 'classroom_course_offerings'
       OR r.policyname IN ('course_enrollments_insert_student', 'course_enrollments_update_student')
    THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END IF;
  END LOOP;
END $$;

CREATE POLICY classroom_course_offerings_select_scoped
ON public.classroom_course_offerings
FOR SELECT
USING (
  public.app_can_manage_classroom(classroom_course_offerings.classroom_id, auth.uid())
  OR public.app_is_enrolled_in_classroom(classroom_course_offerings.classroom_id, auth.uid())
);

CREATE POLICY classroom_course_offerings_insert_scoped
ON public.classroom_course_offerings
FOR INSERT
WITH CHECK (
  classroom_course_offerings.offered_by = auth.uid()
  AND public.app_can_manage_classroom(classroom_course_offerings.classroom_id, auth.uid())
);

CREATE POLICY classroom_course_offerings_update_scoped
ON public.classroom_course_offerings
FOR UPDATE
USING (
  public.app_can_manage_classroom(classroom_course_offerings.classroom_id, auth.uid())
)
WITH CHECK (
  classroom_course_offerings.offered_by = auth.uid()
  AND public.app_can_manage_classroom(classroom_course_offerings.classroom_id, auth.uid())
);

CREATE POLICY classroom_course_offerings_delete_scoped
ON public.classroom_course_offerings
FOR DELETE
USING (
  public.app_can_manage_classroom(classroom_course_offerings.classroom_id, auth.uid())
);

CREATE POLICY course_enrollments_insert_student
ON public.course_enrollments
FOR INSERT
WITH CHECK (
  course_enrollments.student_id = auth.uid()
  AND public.app_is_student(auth.uid())
  AND public.app_student_can_enroll_course(auth.uid(), course_enrollments.course_id)
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
