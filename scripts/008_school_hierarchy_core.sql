-- School hierarchy core
-- Full Admin -> Districts -> Schools -> Teachers -> Classes -> Students

-- Normalize districts code fields used inconsistently in app/scripts
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS district_code text;
UPDATE public.districts SET code = COALESCE(code, district_code);
UPDATE public.districts SET district_code = COALESCE(district_code, code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'districts_code_unique'
      AND conrelid = 'public.districts'::regclass
  ) THEN
    ALTER TABLE public.districts ADD CONSTRAINT districts_code_unique UNIQUE (code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'districts_district_code_unique'
      AND conrelid = 'public.districts'::regclass
  ) THEN
    ALTER TABLE public.districts ADD CONSTRAINT districts_district_code_unique UNIQUE (district_code);
  END IF;
END $$;

-- Schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  max_teachers integer NOT NULL DEFAULT 25 CHECK (max_teachers > 0),
  max_students integer NOT NULL DEFAULT 1500 CHECK (max_students > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_district_id ON public.schools(district_id);
CREATE INDEX IF NOT EXISTS idx_schools_admin_id ON public.schools(admin_id);

-- School admins mapping table (supports co-admin model)
CREATE TABLE IF NOT EXISTS public.school_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_school_admins_admin_id ON public.school_admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON public.school_admins(school_id);

-- Profiles role updates + school relationship
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student'));

-- Classrooms must belong to schools in new hierarchy
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_classrooms_school_id ON public.classrooms(school_id);

-- Keep district_id for reporting compatibility and backfill where possible
UPDATE public.classrooms c
SET district_id = s.district_id
FROM public.schools s
WHERE c.school_id = s.id
  AND c.district_id IS DISTINCT FROM s.district_id;
