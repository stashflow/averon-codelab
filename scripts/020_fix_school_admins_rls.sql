-- Fix infinite recursion in school_admins RLS policies
-- The issue: policies were checking school_admins table while evaluating school_admins access
-- Solution: Check profiles.role directly instead of recursing through school_admins

-- Drop and recreate school_admins SELECT policy without recursion
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
  -- School admins can see other admins in their own school
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = school_admins.school_id
  )
);

-- Fix schools SELECT policy to avoid similar recursion issues
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
  -- School admins can see their assigned schools (check via profiles.school_id to avoid recursion)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = schools.id
  )
  -- Teachers and students can see their own school
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.school_id = schools.id
  )
);

-- Fix schools UPDATE policy
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
  -- School admins can update their own school (check via profiles.school_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = schools.id
  )
);

-- Fix magic_links policies to avoid recursion
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
  -- School admins can see magic links for their school (check via profiles.school_id)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
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
  -- School admins can create magic links for their school (check via profiles.school_id)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
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
  -- School admins can update magic links for their school (check via profiles.school_id)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'school_admin'
      AND p.school_id = magic_links.school_id
  )
);
