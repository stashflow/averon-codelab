-- Lesson experience foundation:
-- 1) Typed checkpoint metadata for safer starter/template alignment.
-- 2) Beginner mode preference at profile level.
-- 3) Synced lesson note responses (cross-device).
-- 4) Lightweight lesson engagement analytics events.

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS beginner_mode boolean NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.checkpoints
  ADD COLUMN IF NOT EXISTS checkpoint_type text,
  ADD COLUMN IF NOT EXISTS starter_templates jsonb,
  ADD COLUMN IF NOT EXISTS required_function_name text,
  ADD COLUMN IF NOT EXISTS required_signature text;

ALTER TABLE IF EXISTS public.lessons
  ADD COLUMN IF NOT EXISTS lesson_type text;

-- Normalize legacy values before constraints so migration is re-runnable on existing data.
UPDATE public.checkpoints
SET checkpoint_type = lower(trim(checkpoint_type))
WHERE checkpoint_type IS NOT NULL;

UPDATE public.checkpoints
SET checkpoint_type = NULL
WHERE checkpoint_type IS NOT NULL
  AND checkpoint_type NOT IN ('hello_world', 'function', 'loops', 'conditionals', 'data');

UPDATE public.lessons
SET lesson_type = lower(trim(lesson_type))
WHERE lesson_type IS NOT NULL;

UPDATE public.lessons
SET lesson_type = NULL
WHERE lesson_type IS NOT NULL
  AND lesson_type NOT IN ('intro', 'hello_world', 'function', 'loops', 'conditionals', 'data', 'project');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checkpoints_checkpoint_type_valid'
      AND conrelid = 'public.checkpoints'::regclass
  ) THEN
    ALTER TABLE public.checkpoints
      ADD CONSTRAINT checkpoints_checkpoint_type_valid
      CHECK (
        checkpoint_type IS NULL
        OR checkpoint_type IN ('hello_world', 'function', 'loops', 'conditionals', 'data')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lessons_lesson_type_valid'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_lesson_type_valid
      CHECK (
        lesson_type IS NULL
        OR lesson_type IN ('intro', 'hello_world', 'function', 'loops', 'conditionals', 'data', 'project')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lesson_note_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_key text NOT NULL,
  response_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id, response_key)
);

CREATE INDEX IF NOT EXISTS idx_lesson_note_responses_student_lesson
  ON public.lesson_note_responses(student_id, lesson_id);

ALTER TABLE IF EXISTS public.lesson_note_responses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lesson_note_responses'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lesson_note_responses', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Students can manage own lesson note responses"
  ON public.lesson_note_responses
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE TABLE IF NOT EXISTS public.lesson_engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_engagement_events_lesson_created
  ON public.lesson_engagement_events(lesson_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_engagement_events_student_created
  ON public.lesson_engagement_events(student_id, created_at DESC);

ALTER TABLE IF EXISTS public.lesson_engagement_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lesson_engagement_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lesson_engagement_events', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Students can insert own lesson engagement events"
  ON public.lesson_engagement_events
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own lesson engagement events"
  ON public.lesson_engagement_events
  FOR SELECT
  USING (auth.uid() = student_id);
