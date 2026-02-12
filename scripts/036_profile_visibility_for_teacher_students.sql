-- Expand profile read visibility so teachers can view students in classes they manage.

BEGIN;

CREATE OR REPLACE FUNCTION public.app_teacher_can_view_profile(
  target_profile_id uuid,
  target_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.student_id = target_profile_id
        AND public.app_can_manage_classroom(e.classroom_id, target_user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.classrooms c
      JOIN public.enrollments e
        ON e.classroom_id = c.id
      WHERE c.teacher_id = target_profile_id
        AND e.student_id = target_user_id
    );
$$;

REVOKE ALL ON FUNCTION public.app_teacher_can_view_profile(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_teacher_can_view_profile(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_select_self_or_scoped_admin ON public.profiles;
CREATE POLICY profiles_select_self_or_scoped_admin
ON public.profiles
FOR SELECT
USING (
  public.app_is_profile_in_admin_scope(id)
  OR public.app_teacher_can_view_profile(id, auth.uid())
);

COMMIT;
