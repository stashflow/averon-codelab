-- Admin Delete Functions
-- Adds safe delete capabilities for full admins to manage organizations and accounts

-- Add soft delete columns to main tables (if not exists)
ALTER TABLE districts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create deletion audit log table
CREATE TABLE IF NOT EXISTS deletion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('district', 'school', 'classroom', 'profile')),
  entity_id UUID NOT NULL,
  entity_data JSONB NOT NULL,
  deletion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on deletion_audit_log
ALTER TABLE deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Only full admins can view deletion audit log
CREATE POLICY "Full admins view deletion log"
  ON deletion_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'full_admin'
    )
  );

-- Only full admins can insert into deletion audit log
CREATE POLICY "Full admins insert deletion log"
  ON deletion_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'full_admin'
    )
  );

-- Create function to soft delete a district
CREATE OR REPLACE FUNCTION soft_delete_district(
  district_id_param UUID,
  reason_param TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  district_data JSONB;
  affected_schools INTEGER;
  affected_classrooms INTEGER;
  affected_users INTEGER;
BEGIN
  -- Only full admins can delete
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'full_admin'
  ) THEN
    RAISE EXCEPTION 'Only full admins can delete districts';
  END IF;

  -- Get district data for audit
  SELECT to_jsonb(districts.*) INTO district_data
  FROM districts
  WHERE id = district_id_param AND deleted_at IS NULL;

  IF district_data IS NULL THEN
    RAISE EXCEPTION 'District not found or already deleted';
  END IF;

  -- Soft delete district
  UPDATE districts
  SET deleted_at = now(), is_active = false
  WHERE id = district_id_param;

  -- Cascade soft delete to schools
  UPDATE schools
  SET deleted_at = now(), is_active = false
  WHERE district_id = district_id_param AND deleted_at IS NULL;
  GET DIAGNOSTICS affected_schools = ROW_COUNT;

  -- Cascade soft delete to classrooms
  UPDATE classrooms
  SET deleted_at = now(), is_active = false
  WHERE district_id = district_id_param AND deleted_at IS NULL;
  GET DIAGNOSTICS affected_classrooms = ROW_COUNT;

  -- Log the deletion
  INSERT INTO deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'district',
    district_id_param,
    jsonb_build_object(
      'district', district_data,
      'affected_schools', affected_schools,
      'affected_classrooms', affected_classrooms
    ),
    reason_param
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to soft delete a school
CREATE OR REPLACE FUNCTION soft_delete_school(
  school_id_param UUID,
  reason_param TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  school_data JSONB;
  affected_classrooms INTEGER;
BEGIN
  -- Only full admins can delete
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'full_admin'
  ) THEN
    RAISE EXCEPTION 'Only full admins can delete schools';
  END IF;

  -- Get school data for audit
  SELECT to_jsonb(schools.*) INTO school_data
  FROM schools
  WHERE id = school_id_param AND deleted_at IS NULL;

  IF school_data IS NULL THEN
    RAISE EXCEPTION 'School not found or already deleted';
  END IF;

  -- Soft delete school
  UPDATE schools
  SET deleted_at = now(), is_active = false
  WHERE id = school_id_param;

  -- Cascade soft delete to classrooms
  UPDATE classrooms
  SET deleted_at = now(), is_active = false
  WHERE school_id = school_id_param AND deleted_at IS NULL;
  GET DIAGNOSTICS affected_classrooms = ROW_COUNT;

  -- Log the deletion
  INSERT INTO deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'school',
    school_id_param,
    jsonb_build_object(
      'school', school_data,
      'affected_classrooms', affected_classrooms
    ),
    reason_param
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to soft delete a classroom
CREATE OR REPLACE FUNCTION soft_delete_classroom(
  classroom_id_param UUID,
  reason_param TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  classroom_data JSONB;
  affected_enrollments INTEGER;
BEGIN
  -- Full admins, district admins, and school admins can delete
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('full_admin', 'district_admin', 'school_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can delete classrooms';
  END IF;

  -- Get classroom data for audit
  SELECT to_jsonb(classrooms.*) INTO classroom_data
  FROM classrooms
  WHERE id = classroom_id_param AND deleted_at IS NULL;

  IF classroom_data IS NULL THEN
    RAISE EXCEPTION 'Classroom not found or already deleted';
  END IF;

  -- Soft delete classroom
  UPDATE classrooms
  SET deleted_at = now(), is_active = false
  WHERE id = classroom_id_param;

  -- Remove enrollments (or mark inactive)
  DELETE FROM enrollments WHERE classroom_id = classroom_id_param;
  GET DIAGNOSTICS affected_enrollments = ROW_COUNT;

  -- Log the deletion
  INSERT INTO deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'classroom',
    classroom_id_param,
    jsonb_build_object(
      'classroom', classroom_data,
      'affected_enrollments', affected_enrollments
    ),
    reason_param
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to soft delete a user account
CREATE OR REPLACE FUNCTION soft_delete_user(
  user_id_param UUID,
  reason_param TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  user_data JSONB;
BEGIN
  -- Only full admins can delete users
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'full_admin'
  ) THEN
    RAISE EXCEPTION 'Only full admins can delete users';
  END IF;

  -- Prevent self-deletion
  IF user_id_param = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Get user data for audit
  SELECT to_jsonb(profiles.*) INTO user_data
  FROM profiles
  WHERE id = user_id_param AND deleted_at IS NULL;

  IF user_data IS NULL THEN
    RAISE EXCEPTION 'User not found or already deleted';
  END IF;

  -- Soft delete profile
  UPDATE profiles
  SET deleted_at = now(), is_active = false
  WHERE id = user_id_param;

  -- Remove from all admin roles
  DELETE FROM district_admins WHERE admin_id = user_id_param;
  DELETE FROM school_admins WHERE admin_id = user_id_param;

  -- Remove classroom assignments
  UPDATE classrooms SET teacher_id = NULL WHERE teacher_id = user_id_param;

  -- Remove student enrollments
  DELETE FROM enrollments WHERE student_id = user_id_param;
  DELETE FROM course_enrollments WHERE student_id = user_id_param;

  -- Log the deletion
  INSERT INTO deletion_audit_log (deleted_by, entity_type, entity_id, entity_data, deletion_reason)
  VALUES (
    auth.uid(),
    'profile',
    user_id_param,
    user_data,
    reason_param
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update queries to exclude deleted items (add WHERE deleted_at IS NULL to existing queries)
-- This will be handled in the application layer

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION soft_delete_district TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_school TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_classroom TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;

COMMENT ON FUNCTION soft_delete_district IS 'Soft delete a district and cascade to schools/classrooms (full admin only)';
COMMENT ON FUNCTION soft_delete_school IS 'Soft delete a school and cascade to classrooms (full admin only)';
COMMENT ON FUNCTION soft_delete_classroom IS 'Soft delete a classroom and remove enrollments (admin only)';
COMMENT ON FUNCTION soft_delete_user IS 'Soft delete a user account and clean up associations (full admin only)';
