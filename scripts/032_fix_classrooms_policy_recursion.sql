-- Break circular RLS dependency between classrooms and enrollments.
-- classrooms policy referenced enrollments, and enrollments policy referenced classrooms.
-- Use a SECURITY DEFINER helper so classrooms can check enrollment without
-- triggering enrollments RLS evaluation.

CREATE OR REPLACE FUNCTION public.is_enrolled_in_classroom(target_classroom_id uuid)
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
      AND e.student_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_enrolled_in_classroom(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_classroom(uuid) TO authenticated;

DROP POLICY IF EXISTS "classrooms_select_hierarchy" ON public.classrooms;
CREATE POLICY "classrooms_select_hierarchy"
ON public.classrooms
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
      AND s.id = classrooms.school_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = classrooms.school_id
  )
  OR classrooms.teacher_id = auth.uid()
  OR public.is_enrolled_in_classroom(classrooms.id)
);
