-- Remove class-scoped student course enrollments when a class membership is removed
-- This covers teacher classroom deletion (cascade deletes enrollments)
-- and admin deletion paths that delete rows from public.enrollments.
-- Safe to run multiple times.

BEGIN;

CREATE OR REPLACE FUNCTION public.app_cleanup_course_enrollments_on_enrollment_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If course-offering linkage table is unavailable, do nothing.
  IF to_regclass('public.classroom_course_offerings') IS NULL THEN
    RETURN OLD;
  END IF;

  -- Remove enrollments for courses offered by the removed classroom,
  -- only when the student no longer has that same course offered
  -- through any of their remaining classrooms.
  DELETE FROM public.course_enrollments ce
  WHERE ce.student_id = OLD.student_id
    AND ce.course_id IN (
      SELECT cco.course_id
      FROM public.classroom_course_offerings cco
      WHERE cco.classroom_id = OLD.classroom_id
        AND COALESCE(cco.is_active, true) = true
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.classroom_course_offerings cco2
        ON cco2.classroom_id = e.classroom_id
       AND cco2.course_id = ce.course_id
       AND COALESCE(cco2.is_active, true) = true
      WHERE e.student_id = OLD.student_id
    );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_course_enrollments_on_enrollment_delete ON public.enrollments;
CREATE TRIGGER trg_cleanup_course_enrollments_on_enrollment_delete
AFTER DELETE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.app_cleanup_course_enrollments_on_enrollment_delete();

COMMIT;
