-- Remove legacy trial mode

ALTER TABLE public.profiles DROP COLUMN IF EXISTS teacher_mode;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_start_date;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_end_date;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_student_count;

ALTER TABLE public.courses DROP COLUMN IF EXISTS is_trial_accessible;

DROP FUNCTION IF EXISTS is_trial_expired(uuid);
DROP FUNCTION IF EXISTS trial_days_remaining(uuid);
