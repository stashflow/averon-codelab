-- Allow teachers to exist without a school assignment during onboarding.
-- Keep school assignment mandatory for school admins.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_teacher_school_required;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_teacher_school_required
  CHECK (
    role <> 'school_admin'
    OR school_id IS NOT NULL
  );
