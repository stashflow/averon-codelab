-- Legacy compatibility cleanup after school hierarchy rollout

-- Ensure all teachers have school_id before enforcing NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.role IN ('teacher', 'school_admin')
      AND p.school_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot finalize migration: some teacher/school_admin profiles still have NULL school_id';
  END IF;
END $$;

-- Optional hardening: apply NOT NULL once data is clean
-- ALTER TABLE public.profiles ALTER COLUMN school_id SET NOT NULL;

-- Trial dashboard route is deprecated at app layer; keep no DB dependency.
