-- Schema/code alignment patch for production readiness
-- Safe to run multiple times

BEGIN;

-- -------------------------------------------------------------------
-- 1) deletion_audit_log entity_type compatibility
-- App RPCs use 'user'; older schema/check may only allow 'profile'.
-- -------------------------------------------------------------------
ALTER TABLE public.deletion_audit_log
  DROP CONSTRAINT IF EXISTS deletion_audit_log_entity_type_check;

ALTER TABLE public.deletion_audit_log
  ADD CONSTRAINT deletion_audit_log_entity_type_check
  CHECK (
    entity_type = ANY (ARRAY[
      'district'::text,
      'school'::text,
      'classroom'::text,
      'user'::text,
      'profile'::text
    ])
  );

-- -------------------------------------------------------------------
-- 2) lesson assignment system required by app/api/assignments/*
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  instructions TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  points_possible INTEGER NOT NULL DEFAULT 100,
  UNIQUE (classroom_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_assignments_classroom ON public.lesson_assignments(classroom_id, due_date);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson ON public.lesson_assignments(lesson_id);

-- -------------------------------------------------------------------
-- 3) student_lesson_progress columns expected by app routes
-- -------------------------------------------------------------------
ALTER TABLE public.student_lesson_progress
  ADD COLUMN IF NOT EXISTS assignment_id UUID,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_lesson_progress_assignment_id_fkey'
      AND conrelid = 'public.student_lesson_progress'::regclass
  ) THEN
    ALTER TABLE public.student_lesson_progress
      ADD CONSTRAINT student_lesson_progress_assignment_id_fkey
      FOREIGN KEY (assignment_id)
      REFERENCES public.lesson_assignments(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_assignment_id
  ON public.student_lesson_progress(assignment_id);

-- -------------------------------------------------------------------
-- 4) messaging tables used by /api/messages/*
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  encrypted_content TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_created
  ON public.messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON public.messages(sender_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select_own ON public.messages;
CREATE POLICY messages_select_own
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS messages_insert_sender ON public.messages;
CREATE POLICY messages_insert_sender
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS messages_update_recipient ON public.messages;
CREATE POLICY messages_update_recipient
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- -------------------------------------------------------------------
-- 5) announcement table used by /api/announcements/*
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_announcements_classroom_created
  ON public.class_announcements(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_announcements_active
  ON public.class_announcements(classroom_id, is_active, expires_at);

ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_announcements_select_allowed ON public.class_announcements;
CREATE POLICY class_announcements_select_allowed
  ON public.class_announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = class_announcements.classroom_id
        AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.classroom_id = class_announcements.classroom_id
        AND e.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('full_admin', 'district_admin', 'school_admin')
    )
  );

DROP POLICY IF EXISTS class_announcements_insert_teacher_admin ON public.class_announcements;
CREATE POLICY class_announcements_insert_teacher_admin
  ON public.class_announcements FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.classrooms c
        WHERE c.id = class_announcements.classroom_id
          AND c.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('full_admin', 'district_admin', 'school_admin')
      )
    )
  );

COMMIT;
