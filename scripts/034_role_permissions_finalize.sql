-- Final role-action matrix hardening for remaining role-critical tables.
-- Complements scripts/033_role_permissions_hardening.sql.

BEGIN;

-- -------------------------------------------------------------------
-- 0) Bootstrap missing curriculum catalog objects for older databases
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_type TEXT NOT NULL DEFAULT 'self_paced'
    CHECK (category_type IN ('self_paced', 'class_based')),
  icon_name TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT 'cyan',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_classroom_enrollment BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_category_id_fkey'
      AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES public.course_categories(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 1) Canonical status/role constraints for request and invite flows
-- -------------------------------------------------------------------
ALTER TABLE public.class_requests
  DROP CONSTRAINT IF EXISTS class_requests_status_check;

ALTER TABLE public.class_requests
  ADD CONSTRAINT class_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.teacher_requests
  DROP CONSTRAINT IF EXISTS teacher_requests_status_check;

ALTER TABLE public.teacher_requests
  ADD CONSTRAINT teacher_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.magic_links
  DROP CONSTRAINT IF EXISTS magic_links_role_check;

ALTER TABLE public.magic_links
  ADD CONSTRAINT magic_links_role_check
  CHECK (role IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student'));

-- -------------------------------------------------------------------
-- 2) Security-definer helpers and mutation guards
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_can_create_magic_link(
  invite_role text,
  invite_district_id uuid,
  invite_school_id uuid,
  actor_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
  actor_school_id uuid;
  school_district_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RETURN false;
  END IF;

  actor_role := public.app_user_role(actor_id);
  IF actor_role IS NULL THEN
    RETURN false;
  END IF;

  IF invite_role NOT IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student') THEN
    RETURN false;
  END IF;

  IF invite_school_id IS NOT NULL THEN
    SELECT s.district_id
    INTO school_district_id
    FROM public.schools s
    WHERE s.id = invite_school_id
    LIMIT 1;

    IF school_district_id IS NULL THEN
      RETURN false;
    END IF;

    IF invite_district_id IS NOT NULL AND school_district_id <> invite_district_id THEN
      RETURN false;
    END IF;
  END IF;

  IF actor_role = 'full_admin' THEN
    IF invite_role = 'district_admin' AND invite_district_id IS NULL THEN
      RETURN false;
    END IF;

    IF invite_role IN ('school_admin', 'teacher', 'student') AND invite_school_id IS NULL THEN
      RETURN false;
    END IF;

    RETURN true;
  END IF;

  IF actor_role = 'district_admin' THEN
    IF invite_role NOT IN ('school_admin', 'teacher', 'student') THEN
      RETURN false;
    END IF;

    IF invite_school_id IS NOT NULL THEN
      RETURN public.app_user_manages_district(school_district_id, actor_id);
    END IF;

    IF invite_district_id IS NULL THEN
      RETURN false;
    END IF;

    RETURN public.app_user_manages_district(invite_district_id, actor_id);
  END IF;

  IF actor_role = 'school_admin' THEN
    IF invite_role NOT IN ('teacher', 'student') THEN
      RETURN false;
    END IF;

    actor_school_id := public.app_user_school_id(actor_id);
    IF actor_school_id IS NULL OR invite_school_id IS NULL THEN
      RETURN false;
    END IF;

    RETURN actor_school_id = invite_school_id;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_can_send_message(
  target_sender_id uuid,
  target_recipient_id uuid,
  target_parent_message_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_role text;
  recipient_role text;
BEGIN
  IF target_sender_id IS NULL OR target_recipient_id IS NULL THEN
    RETURN false;
  END IF;

  IF target_sender_id = target_recipient_id THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> target_sender_id THEN
    RETURN false;
  END IF;

  sender_role := public.app_user_role(target_sender_id);
  recipient_role := public.app_user_role(target_recipient_id);

  IF sender_role IS NULL OR recipient_role IS NULL THEN
    RETURN false;
  END IF;

  IF sender_role = 'student' THEN
    IF recipient_role NOT IN ('teacher', 'school_admin', 'district_admin', 'full_admin') THEN
      RETURN false;
    END IF;

    IF target_parent_message_id IS NULL THEN
      RETURN false;
    END IF;

    RETURN EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.profiles p
        ON p.id = m.sender_id
      WHERE m.id = target_parent_message_id
        AND m.sender_id = target_recipient_id
        AND m.recipient_id = target_sender_id
        AND p.role IN ('teacher', 'school_admin', 'district_admin', 'full_admin')
    );
  END IF;

  IF sender_role = 'teacher' THEN
    IF recipient_role <> 'student' THEN
      RETURN false;
    END IF;

    RETURN EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.classrooms c
        ON c.id = e.classroom_id
      WHERE e.student_id = target_recipient_id
        AND public.app_can_manage_classroom(c.id, target_sender_id)
    );
  END IF;

  IF sender_role IN ('school_admin', 'district_admin', 'full_admin') THEN
    RETURN public.app_is_profile_in_admin_scope(target_recipient_id, target_sender_id);
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_message_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR actor <> OLD.recipient_id THEN
    RAISE EXCEPTION 'Only the recipient can update this message';
  END IF;

  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
    OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
    OR NEW.subject IS DISTINCT FROM OLD.subject
    OR NEW.encrypted_content IS DISTINCT FROM OLD.encrypted_content
    OR NEW.encryption_iv IS DISTINCT FROM OLD.encryption_iv
    OR NEW.parent_message_id IS DISTINCT FROM OLD.parent_message_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Message metadata/content cannot be modified';
  END IF;

  IF NEW.is_read = false THEN
    RAISE EXCEPTION 'Messages can only be marked as read';
  END IF;

  IF NEW.read_at IS NULL THEN
    NEW.read_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Add a secure bypass channel for controlled profile role/school updates
-- (used by redeem_magic_link security-definer RPC only).
CREATE OR REPLACE FUNCTION public.enforce_profile_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_role text;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF current_setting('app.bypass_profile_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  actor_role := public.app_user_role(actor);

  -- Self-service profile updates: allow onboarding school assignment only; block escalation.
  IF actor = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT (
        OLD.role = 'student'
        AND NEW.role = 'teacher'
        AND OLD.school_id IS NULL
        AND NEW.school_id IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'Role changes require admin action';
      END IF;
    END IF;

    IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      IF NOT (
        OLD.school_id IS NULL
        AND NEW.school_id IS NOT NULL
        AND NEW.role = 'teacher'
        AND OLD.role IN ('student', 'teacher')
      ) THEN
        RAISE EXCEPTION 'School reassignment requires admin action';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Only full_admin can grant/modify full_admin or district_admin.
  IF actor_role <> 'full_admin'
    AND (
      (NEW.role IN ('full_admin', 'district_admin') AND NEW.role IS DISTINCT FROM OLD.role)
      OR (OLD.role IN ('full_admin', 'district_admin') AND NEW.role IS DISTINCT FROM OLD.role)
    )
  THEN
    RAISE EXCEPTION 'Only full admin can modify full/district admin roles';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_magic_link(raw_token text)
RETURNS TABLE (
  role text,
  school_id uuid,
  district_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_email text;
  token_hash text;
  link_row public.magic_links%ROWTYPE;
  resolved_school_district uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF raw_token IS NULL OR btrim(raw_token) = '' THEN
    RAISE EXCEPTION 'Token is required';
  END IF;

  SELECT u.email
  INTO actor_email
  FROM auth.users u
  WHERE u.id = actor
  LIMIT 1;

  IF actor_email IS NULL THEN
    RAISE EXCEPTION 'Email missing from account';
  END IF;

  token_hash := encode(digest(btrim(raw_token), 'sha256'), 'hex');

  SELECT *
  INTO link_row
  FROM public.magic_links ml
  WHERE ml.token_hash = token_hash
    AND ml.used_at IS NULL
    AND ml.revoked_at IS NULL
  ORDER BY ml.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;

  IF link_row.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation token has expired';
  END IF;

  IF lower(actor_email) <> lower(link_row.email) THEN
    RAISE EXCEPTION 'This invite is for a different email address';
  END IF;

  IF link_row.role IN ('school_admin', 'teacher', 'student') AND link_row.school_id IS NULL THEN
    RAISE EXCEPTION 'Invite is missing school assignment for role %', link_row.role;
  END IF;

  IF link_row.role = 'district_admin' AND link_row.district_id IS NULL THEN
    RAISE EXCEPTION 'Invite is missing district assignment for role district_admin';
  END IF;

  IF link_row.school_id IS NOT NULL THEN
    SELECT s.district_id
    INTO resolved_school_district
    FROM public.schools s
    WHERE s.id = link_row.school_id
    LIMIT 1;

    IF resolved_school_district IS NULL THEN
      RAISE EXCEPTION 'Invite references an unknown school';
    END IF;

    IF link_row.district_id IS NOT NULL AND link_row.district_id <> resolved_school_district THEN
      RAISE EXCEPTION 'Invite school/district mismatch';
    END IF;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', '1', true);

  UPDATE public.profiles p
  SET
    role = link_row.role,
    school_id = CASE
      WHEN link_row.role IN ('teacher', 'student', 'school_admin') THEN link_row.school_id
      ELSE NULL
    END
  WHERE p.id = actor;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for current user';
  END IF;

  IF link_row.role = 'school_admin' THEN
    INSERT INTO public.school_admins (admin_id, school_id, assigned_by)
    VALUES (actor, link_row.school_id, link_row.invited_by)
    ON CONFLICT (admin_id, school_id)
    DO UPDATE SET assigned_by = EXCLUDED.assigned_by;
  END IF;

  IF link_row.role = 'district_admin' THEN
    INSERT INTO public.district_admins (admin_id, district_id, assigned_by)
    VALUES (actor, link_row.district_id, link_row.invited_by)
    ON CONFLICT (district_id, admin_id)
    DO UPDATE SET assigned_by = EXCLUDED.assigned_by;
  END IF;

  UPDATE public.magic_links
  SET used_at = now()
  WHERE id = link_row.id;

  RETURN QUERY
  SELECT link_row.role, link_row.school_id, link_row.district_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_mutation ON public.messages;
CREATE TRIGGER trg_enforce_message_mutation
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_mutation();

REVOKE ALL ON FUNCTION public.app_can_create_magic_link(text, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_send_message(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_message_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_magic_link(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_profile_mutation() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_can_create_magic_link(text, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_send_message(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_magic_link(text) TO authenticated;

-- -------------------------------------------------------------------
-- 3) Reset + rebuild policies for remaining role-sensitive tables
-- -------------------------------------------------------------------
ALTER TABLE public.class_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'class_requests',
        'teacher_requests',
        'messages',
        'magic_links',
        'courses',
        'course_categories'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- class_requests
CREATE POLICY class_requests_select_scoped
ON public.class_requests
FOR SELECT
USING (
  class_requests.requested_by = auth.uid()
  OR public.app_is_full_admin(auth.uid())
  OR public.app_user_manages_district(class_requests.district_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = class_requests.classroom_id
      AND public.app_can_manage_school(c.school_id, auth.uid())
  )
);

CREATE POLICY class_requests_insert_scoped
ON public.class_requests
FOR INSERT
WITH CHECK (
  class_requests.requested_by = auth.uid()
  AND class_requests.status = 'pending'
  AND class_requests.reviewed_by IS NULL
  AND class_requests.reviewed_at IS NULL
  AND public.app_user_manages_district(class_requests.district_id, auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.classrooms c
    JOIN public.schools s
      ON s.id = c.school_id
    WHERE c.id = class_requests.classroom_id
      AND s.district_id = class_requests.district_id
      AND public.app_can_manage_school(c.school_id, auth.uid())
  )
);

CREATE POLICY class_requests_update_full_admin
ON public.class_requests
FOR UPDATE
USING (public.app_is_full_admin(auth.uid()))
WITH CHECK (
  public.app_is_full_admin(auth.uid())
  AND class_requests.status IN ('pending', 'approved', 'rejected')
  AND (class_requests.reviewed_by IS NULL OR class_requests.reviewed_by = auth.uid())
);

CREATE POLICY class_requests_delete_scoped
ON public.class_requests
FOR DELETE
USING (
  public.app_is_full_admin(auth.uid())
  OR (
    class_requests.requested_by = auth.uid()
    AND class_requests.status = 'pending'
  )
);

-- teacher_requests
CREATE POLICY teacher_requests_select_scoped
ON public.teacher_requests
FOR SELECT
USING (
  teacher_requests.teacher_id = auth.uid()
  OR public.app_can_manage_classroom(teacher_requests.classroom_id, auth.uid())
  OR public.app_is_full_admin(auth.uid())
);

CREATE POLICY teacher_requests_insert_teacher
ON public.teacher_requests
FOR INSERT
WITH CHECK (
  teacher_requests.teacher_id = auth.uid()
  AND public.app_is_teacher(auth.uid())
  AND teacher_requests.status = 'pending'
  AND teacher_requests.reviewed_by IS NULL
  AND teacher_requests.reviewed_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = teacher_requests.classroom_id
      AND COALESCE(c.created_by_admin, false)
      AND COALESCE(c.is_active, true)
  )
);

CREATE POLICY teacher_requests_update_scoped_admin
ON public.teacher_requests
FOR UPDATE
USING (
  public.app_can_manage_classroom(teacher_requests.classroom_id, auth.uid())
  OR public.app_is_full_admin(auth.uid())
)
WITH CHECK (
  (
    public.app_can_manage_classroom(teacher_requests.classroom_id, auth.uid())
    OR public.app_is_full_admin(auth.uid())
  )
  AND teacher_requests.status IN ('pending', 'approved', 'rejected')
  AND (teacher_requests.reviewed_by IS NULL OR teacher_requests.reviewed_by = auth.uid())
);

CREATE POLICY teacher_requests_delete_scoped
ON public.teacher_requests
FOR DELETE
USING (
  public.app_is_full_admin(auth.uid())
  OR (
    teacher_requests.teacher_id = auth.uid()
    AND teacher_requests.status = 'pending'
  )
);

-- messages
CREATE POLICY messages_select_own
ON public.messages
FOR SELECT
USING (
  messages.sender_id = auth.uid()
  OR messages.recipient_id = auth.uid()
);

CREATE POLICY messages_insert_authorized
ON public.messages
FOR INSERT
WITH CHECK (
  messages.sender_id = auth.uid()
  AND public.app_can_send_message(messages.sender_id, messages.recipient_id, messages.parent_message_id)
);

CREATE POLICY messages_update_recipient_mark_read
ON public.messages
FOR UPDATE
USING (messages.recipient_id = auth.uid())
WITH CHECK (
  messages.recipient_id = auth.uid()
  AND messages.is_read = true
);

-- magic_links
CREATE POLICY magic_links_select_scoped
ON public.magic_links
FOR SELECT
USING (
  public.app_is_full_admin(auth.uid())
  OR (
    public.app_is_district_admin(auth.uid())
    AND (
      (magic_links.district_id IS NOT NULL AND public.app_user_manages_district(magic_links.district_id, auth.uid()))
      OR (magic_links.school_id IS NOT NULL AND public.app_can_manage_school(magic_links.school_id, auth.uid()))
    )
  )
  OR (
    public.app_is_school_admin(auth.uid())
    AND magic_links.school_id = public.app_user_school_id(auth.uid())
  )
  OR magic_links.invited_by = auth.uid()
);

CREATE POLICY magic_links_insert_scoped
ON public.magic_links
FOR INSERT
WITH CHECK (
  magic_links.invited_by = auth.uid()
  AND public.app_can_create_magic_link(magic_links.role, magic_links.district_id, magic_links.school_id, auth.uid())
);

CREATE POLICY magic_links_update_scoped
ON public.magic_links
FOR UPDATE
USING (
  public.app_is_full_admin(auth.uid())
  OR (
    public.app_is_district_admin(auth.uid())
    AND (
      (magic_links.district_id IS NOT NULL AND public.app_user_manages_district(magic_links.district_id, auth.uid()))
      OR (magic_links.school_id IS NOT NULL AND public.app_can_manage_school(magic_links.school_id, auth.uid()))
    )
  )
  OR (
    public.app_is_school_admin(auth.uid())
    AND magic_links.school_id = public.app_user_school_id(auth.uid())
  )
  OR magic_links.invited_by = auth.uid()
)
WITH CHECK (
  public.app_is_full_admin(auth.uid())
  OR public.app_can_create_magic_link(magic_links.role, magic_links.district_id, magic_links.school_id, auth.uid())
);

CREATE POLICY magic_links_delete_full_admin
ON public.magic_links
FOR DELETE
USING (public.app_is_full_admin(auth.uid()));

-- courses
CREATE POLICY courses_select_authenticated_roles
ON public.courses
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.app_user_role(auth.uid()) IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student')
);

CREATE POLICY courses_modify_curriculum_scoped
ON public.courses
FOR ALL
USING (public.app_can_edit_curriculum(auth.uid()))
WITH CHECK (public.app_can_edit_curriculum(auth.uid()));

-- course_categories
CREATE POLICY course_categories_select_authenticated_roles
ON public.course_categories
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.app_user_role(auth.uid()) IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student')
);

CREATE POLICY course_categories_modify_curriculum_scoped
ON public.course_categories
FOR ALL
USING (public.app_can_edit_curriculum(auth.uid()))
WITH CHECK (public.app_can_edit_curriculum(auth.uid()));

COMMIT;
