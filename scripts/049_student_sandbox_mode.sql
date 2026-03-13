CREATE TABLE IF NOT EXISTS public.student_sandboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'python',
  entry_filename text NOT NULL DEFAULT 'main.py',
  code text NOT NULL DEFAULT '',
  stdin text NOT NULL DEFAULT '',
  last_run_status text,
  last_run_output text,
  last_run_error text,
  last_run_runtime text,
  last_run_duration_ms integer,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_sandboxes_student
  ON public.student_sandboxes(student_id, classroom_id);

ALTER TABLE public.student_sandboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_sandboxes_select_scoped ON public.student_sandboxes;
CREATE POLICY student_sandboxes_select_scoped
ON public.student_sandboxes
FOR SELECT
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = student_sandboxes.classroom_id
      AND c.teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS student_sandboxes_insert_student ON public.student_sandboxes;
CREATE POLICY student_sandboxes_insert_student
ON public.student_sandboxes
FOR INSERT
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.classroom_id = student_sandboxes.classroom_id
      AND e.student_id = student_sandboxes.student_id
  )
);

DROP POLICY IF EXISTS student_sandboxes_update_student ON public.student_sandboxes;
CREATE POLICY student_sandboxes_update_student
ON public.student_sandboxes
FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.classroom_id = student_sandboxes.classroom_id
      AND e.student_id = student_sandboxes.student_id
  )
);
