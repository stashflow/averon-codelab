-- Admin Support RPC hardening
-- Ensures support center APIs map to real, secure, idempotent database RPCs.

-- Soft delete fields used by support operations
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Delete/audit trail for admin support actions
CREATE TABLE IF NOT EXISTS public.deletion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('district', 'school', 'classroom', 'user')),
  entity_id UUID NOT NULL,
  entity_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  deletion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_entity ON public.deletion_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_log_created_at ON public.deletion_audit_log(created_at DESC);

ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full admins view deletion log" ON public.deletion_audit_log;
CREATE POLICY "Full admins view deletion log"
  ON public.deletion_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'full_admin'
    )
  );

DROP POLICY IF EXISTS "Full admins insert deletion log" ON public.deletion_audit_log;
CREATE POLICY "Full admins insert deletion log"
  ON public.deletion_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'full_admin'
    )
  );

CREATE OR REPLACE FUNCTION public.admin_delete_classroom(
  p_classroom_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classroom JSONB;
  v_removed_enrollments INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized admin context';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  ) THEN
    RAISE EXCEPTION 'Only full_admin can delete classrooms';
  END IF;

  SELECT to_jsonb(c.*)
  INTO v_classroom
  FROM public.classrooms c
  WHERE c.id = p_classroom_id
    AND c.deleted_at IS NULL;

  IF v_classroom IS NULL THEN
    RAISE EXCEPTION 'Classroom not found or already deleted';
  END IF;

  UPDATE public.classrooms
  SET deleted_at = now(), is_active = false
  WHERE id = p_classroom_id;

  DELETE FROM public.enrollments
  WHERE classroom_id = p_classroom_id;
  GET DIAGNOSTICS v_removed_enrollments = ROW_COUNT;

  INSERT INTO public.deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'classroom',
    p_classroom_id,
    jsonb_build_object(
      'classroom', v_classroom,
      'removed_enrollments', v_removed_enrollments
    ),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'removed_enrollments', v_removed_enrollments
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_school(
  p_school_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school JSONB;
  v_removed_classrooms INTEGER := 0;
  v_removed_enrollments INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized admin context';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  ) THEN
    RAISE EXCEPTION 'Only full_admin can delete schools';
  END IF;

  SELECT to_jsonb(s.*)
  INTO v_school
  FROM public.schools s
  WHERE s.id = p_school_id
    AND s.deleted_at IS NULL;

  IF v_school IS NULL THEN
    RAISE EXCEPTION 'School not found or already deleted';
  END IF;

  UPDATE public.schools
  SET deleted_at = now(), is_active = false
  WHERE id = p_school_id;

  UPDATE public.classrooms
  SET deleted_at = now(), is_active = false
  WHERE school_id = p_school_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_removed_classrooms = ROW_COUNT;

  DELETE FROM public.enrollments e
  USING public.classrooms c
  WHERE e.classroom_id = c.id
    AND c.school_id = p_school_id;
  GET DIAGNOSTICS v_removed_enrollments = ROW_COUNT;

  INSERT INTO public.deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'school',
    p_school_id,
    jsonb_build_object(
      'school', v_school,
      'removed_classrooms', v_removed_classrooms,
      'removed_enrollments', v_removed_enrollments
    ),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'removed_classrooms', v_removed_classrooms,
    'removed_enrollments', v_removed_enrollments
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_district(
  p_district_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_district JSONB;
  v_removed_schools INTEGER := 0;
  v_removed_classrooms INTEGER := 0;
  v_removed_enrollments INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized admin context';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  ) THEN
    RAISE EXCEPTION 'Only full_admin can delete districts';
  END IF;

  SELECT to_jsonb(d.*)
  INTO v_district
  FROM public.districts d
  WHERE d.id = p_district_id
    AND d.deleted_at IS NULL;

  IF v_district IS NULL THEN
    RAISE EXCEPTION 'District not found or already deleted';
  END IF;

  UPDATE public.districts
  SET deleted_at = now(), is_active = false
  WHERE id = p_district_id;

  UPDATE public.schools
  SET deleted_at = now(), is_active = false
  WHERE district_id = p_district_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_removed_schools = ROW_COUNT;

  UPDATE public.classrooms
  SET deleted_at = now(), is_active = false
  WHERE district_id = p_district_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_removed_classrooms = ROW_COUNT;

  DELETE FROM public.enrollments e
  USING public.classrooms c
  WHERE e.classroom_id = c.id
    AND c.district_id = p_district_id;
  GET DIAGNOSTICS v_removed_enrollments = ROW_COUNT;

  INSERT INTO public.deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'district',
    p_district_id,
    jsonb_build_object(
      'district', v_district,
      'removed_schools', v_removed_schools,
      'removed_classrooms', v_removed_classrooms,
      'removed_enrollments', v_removed_enrollments
    ),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'removed_schools', v_removed_schools,
    'removed_classrooms', v_removed_classrooms,
    'removed_enrollments', v_removed_enrollments
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_account(
  p_target_user_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user JSONB;
  v_removed_enrollments INTEGER := 0;
  v_removed_teaching_classes INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_admin_id THEN
    RAISE EXCEPTION 'Unauthorized admin context';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'full_admin'
  ) THEN
    RAISE EXCEPTION 'Only full_admin can delete user accounts';
  END IF;

  SELECT to_jsonb(p.*)
  INTO v_user
  FROM public.profiles p
  WHERE p.id = p_target_user_id
    AND p.deleted_at IS NULL;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not found or already deleted';
  END IF;

  UPDATE public.profiles
  SET deleted_at = now(), is_active = false
  WHERE id = p_target_user_id;

  DELETE FROM public.district_admins WHERE admin_id = p_target_user_id;
  DELETE FROM public.school_admins WHERE admin_id = p_target_user_id;
  DELETE FROM public.enrollments WHERE student_id = p_target_user_id;
  GET DIAGNOSTICS v_removed_enrollments = ROW_COUNT;

  UPDATE public.classrooms
  SET deleted_at = now(), is_active = false
  WHERE teacher_id = p_target_user_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_removed_teaching_classes = ROW_COUNT;

  DELETE FROM public.enrollments e
  USING public.classrooms c
  WHERE e.classroom_id = c.id
    AND c.teacher_id = p_target_user_id;

  IF to_regclass('public.course_enrollments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.course_enrollments WHERE student_id = $1' USING p_target_user_id;
  END IF;

  INSERT INTO public.deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'user',
    p_target_user_id,
    jsonb_build_object(
      'user', v_user,
      'removed_enrollments', v_removed_enrollments,
      'removed_teaching_classes', v_removed_teaching_classes
    ),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'removed_enrollments', v_removed_enrollments,
    'removed_teaching_classes', v_removed_teaching_classes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_classroom(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_school(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_district(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(UUID, UUID, TEXT) TO authenticated;
