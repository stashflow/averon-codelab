-- Allow students to remove their own course enrollments
-- Safe to run multiple times

BEGIN;

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_enrollments_delete_student ON public.course_enrollments;
CREATE POLICY course_enrollments_delete_student
ON public.course_enrollments
FOR DELETE
USING (
  course_enrollments.student_id = auth.uid()
);

COMMIT;
