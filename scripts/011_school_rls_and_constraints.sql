-- School constraints + RLS

-- Ensure teacher/school_admin rows have school_id before enforcing constraint.
-- This makes the migration rerunnable even on partially migrated datasets.
DO $$
DECLARE
  fallback_district_id uuid;
  fallback_school_id uuid;
BEGIN
  -- 1) Map teacher/school_admin from owned classrooms when possible
  UPDATE public.profiles p
  SET school_id = c.school_id
  FROM public.classrooms c
  WHERE p.role IN ('teacher', 'school_admin')
    AND p.school_id IS NULL
    AND c.teacher_id = p.id
    AND c.school_id IS NOT NULL;

  -- 2) Map school_admin from explicit school_admins table
  UPDATE public.profiles p
  SET school_id = sa.school_id
  FROM public.school_admins sa
  WHERE p.role = 'school_admin'
    AND p.school_id IS NULL
    AND sa.admin_id = p.id;

  -- 3) Map via district_admin linkage to any school in district
  UPDATE public.profiles p
  SET school_id = s.id
  FROM public.district_admins da
  JOIN public.schools s ON s.district_id = da.district_id
  WHERE p.role IN ('teacher', 'school_admin')
    AND p.school_id IS NULL
    AND da.admin_id = p.id;

  -- 4) Create fallback district/school if unresolved users remain
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role IN ('teacher', 'school_admin')
      AND school_id IS NULL
  ) THEN
    INSERT INTO public.districts (name, code, district_code, created_by)
    SELECT 'Unassigned District', 'UNASSIGNED', 'UNASSIGNED', id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1
    ON CONFLICT (code) DO NOTHING;

    SELECT id INTO fallback_district_id
    FROM public.districts
    WHERE code = 'UNASSIGNED'
    LIMIT 1;

    INSERT INTO public.schools (name, district_id, max_teachers, max_students, is_active)
    VALUES ('Unassigned School', fallback_district_id, 10000, 100000, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO fallback_school_id
    FROM public.schools
    WHERE district_id = fallback_district_id
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.profiles
    SET school_id = fallback_school_id
    WHERE role IN ('teacher', 'school_admin')
      AND school_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_teacher_school_required;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_teacher_school_required
  CHECK (
    role <> 'school_admin'
    OR school_id IS NOT NULL
  );

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;

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
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = schools.id
  )
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
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = schools.id
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
);

DROP POLICY IF EXISTS "school_admins_insert_hierarchy" ON public.school_admins;
CREATE POLICY "school_admins_insert_hierarchy"
ON public.school_admins
FOR INSERT
WITH CHECK (
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
);

-- Update classrooms policies for school hierarchy
DROP POLICY IF EXISTS "classrooms_select_hierarchy" ON public.classrooms;
CREATE POLICY "classrooms_select_hierarchy"
ON public.classrooms
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'full_admin')
  OR EXISTS (
    SELECT 1 FROM public.district_admins da
    JOIN public.schools s ON s.district_id = da.district_id
    WHERE da.admin_id = auth.uid() AND s.id = classrooms.school_id
  )
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid() AND sa.school_id = classrooms.school_id
  )
  OR classrooms.teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = auth.uid() AND e.classroom_id = classrooms.id)
);

DROP POLICY IF EXISTS "classrooms_insert_district_admin" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_insert" ON public.classrooms;
CREATE POLICY "classrooms_insert_hierarchy"
ON public.classrooms
FOR INSERT
WITH CHECK (
  classrooms.teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'full_admin')
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid() AND sa.school_id = classrooms.school_id
  )
);

DROP POLICY IF EXISTS "classrooms_update_hierarchy" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_update" ON public.classrooms;
CREATE POLICY "classrooms_update_hierarchy"
ON public.classrooms
FOR UPDATE
USING (
  classrooms.teacher_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'full_admin')
  OR EXISTS (
    SELECT 1 FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid() AND sa.school_id = classrooms.school_id
  )
);
