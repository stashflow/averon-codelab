-- Backfill schools from existing district/teacher/classroom data

-- 1) Create one default school per district when none exists
INSERT INTO public.schools (name, district_id, created_by)
SELECT d.name || ' - Main School', d.id, d.created_by
FROM public.districts d
WHERE NOT EXISTS (
  SELECT 1 FROM public.schools s WHERE s.district_id = d.id
);

-- 2) If profile has school_name, try to map to existing school in same district first
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.school_id IS NULL
  AND p.role IN ('teacher', 'school_admin')
  AND p.school_name IS NOT NULL
  AND lower(trim(p.school_name)) = lower(trim(s.name));

-- 3) Map remaining teachers to district default school when district context exists
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.school_id IS NULL
  AND p.role IN ('teacher', 'school_admin')
  AND EXISTS (
    SELECT 1 FROM public.district_admins da
    WHERE da.admin_id = p.id
      AND da.district_id = s.district_id
  );

-- 4) Map teacher classrooms to teacher school
UPDATE public.classrooms c
SET school_id = p.school_id
FROM public.profiles p
WHERE c.teacher_id = p.id
  AND c.school_id IS NULL
  AND p.school_id IS NOT NULL;

-- 5) Map any remaining classrooms via district default school
UPDATE public.classrooms c
SET school_id = s.id
FROM public.schools s
WHERE c.school_id IS NULL
  AND c.district_id = s.district_id;

-- 6) Ensure district_id stays in sync where school is set
UPDATE public.classrooms c
SET district_id = s.district_id
FROM public.schools s
WHERE c.school_id = s.id
  AND c.district_id IS DISTINCT FROM s.district_id;
