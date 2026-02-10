-- Expand magic links to support all account types and role-aware invitation permissions

ALTER TABLE public.magic_links
  DROP CONSTRAINT IF EXISTS magic_links_role_check;

ALTER TABLE public.magic_links
  ADD CONSTRAINT magic_links_role_check
  CHECK (role IN ('full_admin', 'district_admin', 'school_admin', 'teacher', 'student'));

-- Allow school_admin visibility for invites related to their school
DROP POLICY IF EXISTS "magic_links_select_admin" ON public.magic_links;
CREATE POLICY "magic_links_select_admin"
ON public.magic_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = magic_links.school_id
  )
);

-- Allow school_admin inserts scoped to own school
DROP POLICY IF EXISTS "magic_links_insert_admin" ON public.magic_links;
CREATE POLICY "magic_links_insert_admin"
ON public.magic_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = magic_links.school_id
  )
);

DROP POLICY IF EXISTS "magic_links_update_admin" ON public.magic_links;
CREATE POLICY "magic_links_update_admin"
ON public.magic_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('full_admin', 'district_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.school_admins sa
    WHERE sa.admin_id = auth.uid()
      AND sa.school_id = magic_links.school_id
  )
);
