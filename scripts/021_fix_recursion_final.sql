-- Final fix for infinite recursion in RLS policies
-- The key principle: NEVER query the same table you're creating a policy for
-- Always use profiles.role and profiles.school_id to check permissions

-- ============================================================================
-- SCHOOL_ADMINS TABLE - Remove all self-referencing queries
-- ============================================================================

DROP POLICY IF EXISTS "school_admins_select_hierarchy" ON public.school_admins;
CREATE POLICY "school_admins_select_hierarchy"
ON public.school_admins
FOR SELECT
USING (
  -- Full admins can see all
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- District admins can see school admins in their district
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    JOIN public.schools s ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid()
      AND s.id = school_admins.school_id
  )
  -- Users can see their own school_admin record
  OR school_admins.admin_id = auth.uid()
  -- School admins can see other admins in same school (use profiles.school_id to avoid recursion)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = school_admins.school_id
  )
);

DROP POLICY IF EXISTS "school_admins_insert_hierarchy" ON public.school_admins;
CREATE POLICY "school_admins_insert_hierarchy"
ON public.school_admins
FOR INSERT
WITH CHECK (
  -- Full admins can insert all
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- District admins can insert school admins in their district
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    JOIN public.schools s ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid()
      AND s.id = school_admins.school_id
  )
);

-- ============================================================================
-- SCHOOLS TABLE - Use profiles.role and profiles.school_id only
-- ============================================================================

DROP POLICY IF EXISTS "schools_select_hierarchy" ON public.schools;
CREATE POLICY "schools_select_hierarchy"
ON public.schools
FOR SELECT
USING (
  -- Full admins can see all schools
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- District admins can see schools in their district
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    WHERE da.admin_id = auth.uid()
      AND da.district_id = schools.district_id
  )
  -- School admins, teachers, students can see their own school (via profiles.school_id)
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
  -- Full admins can create schools
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- District admins can create schools in their district
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
  -- Full admins can update all schools
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- District admins can update schools in their district
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    WHERE da.admin_id = auth.uid()
      AND da.district_id = schools.district_id
  )
  -- School admins can update their own school (via profiles.school_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = schools.id
  )
);

-- ============================================================================
-- MAGIC_LINKS TABLE - Use profiles.role and profiles.school_id only
-- ============================================================================

DROP POLICY IF EXISTS "magic_links_select_admin" ON public.magic_links;
CREATE POLICY "magic_links_select_admin"
ON public.magic_links
FOR SELECT
USING (
  -- Full admins and district admins can see all
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  -- School admins can see magic links for their school (via profiles.school_id)
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
  -- Full admins and district admins can create for anyone
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  -- School admins can create magic links for their school (via profiles.school_id)
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
  -- Full admins and district admins can update all
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  -- School admins can update magic links for their school (via profiles.school_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = magic_links.school_id
  )
);

-- ============================================================================
-- CLASSROOMS TABLE - Use profiles.role and profiles.school_id only
-- ============================================================================

DROP POLICY IF EXISTS "classrooms_select_hierarchy" ON public.classrooms;
CREATE POLICY "classrooms_select_hierarchy"
ON public.classrooms
FOR SELECT
USING (
  -- Full admins can see all
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- District admins can see classrooms in their district
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    JOIN public.schools s ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid()
      AND s.id = classrooms.school_id
  )
  -- School admins can see classrooms in their school (via profiles.school_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = classrooms.school_id
  )
  -- Teachers can see their own classrooms
  OR classrooms.teacher_id = auth.uid()
  -- Students can see classrooms they're enrolled in
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
  -- Teachers can create their own classrooms
  classrooms.teacher_id = auth.uid()
  -- Full admins can create any classroom
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- School admins can create classrooms in their school (via profiles.school_id)
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
  -- Teachers can update their own classrooms
  classrooms.teacher_id = auth.uid()
  -- Full admins can update any classroom
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  )
  -- School admins can update classrooms in their school (via profiles.school_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = classrooms.school_id
  )
);
