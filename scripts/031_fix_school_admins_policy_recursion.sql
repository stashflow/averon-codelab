-- Fix infinite recursion in hierarchy policies.
-- Avoid querying public.school_admins inside policies that can be evaluated
-- while resolving school_admin-related checks.

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
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.school_id = schools.id
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
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = schools.id
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
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = school_admins.school_id
  )
);

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
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = auth.uid()
      AND e.classroom_id = classrooms.id
  )
);

DROP POLICY IF EXISTS "classrooms_insert_hierarchy" ON public.classrooms;
CREATE POLICY "classrooms_insert_hierarchy"
ON public.classrooms
FOR INSERT
WITH CHECK (
  classrooms.teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = classrooms.school_id
  )
);

DROP POLICY IF EXISTS "classrooms_update_hierarchy" ON public.classrooms;
CREATE POLICY "classrooms_update_hierarchy"
ON public.classrooms
FOR UPDATE
USING (
  classrooms.teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = classrooms.school_id
  )
);

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
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = magic_links.school_id
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
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = magic_links.school_id
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
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = magic_links.school_id
  )
);
