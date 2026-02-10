-- Add legal acceptance tracking
-- This migration adds a table to track user acceptance of ToS and Privacy Policy

-- Create legal_acceptances table
CREATE TABLE IF NOT EXISTS legal_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    privacy_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    terms_version TEXT NOT NULL DEFAULT 'v1.0',
    privacy_version TEXT NOT NULL DEFAULT 'v1.0',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_id ON legal_acceptances(user_id);

-- Enable RLS
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'legal_acceptances'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.legal_acceptances', r.policyname);
  END LOOP;
END $$;

-- Policy: Users can view their own acceptance record
CREATE POLICY "Users can view own legal acceptance"
    ON legal_acceptances
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own acceptance (during signup)
CREATE POLICY "Users can create own legal acceptance"
    ON legal_acceptances
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Full admins can view all acceptances for compliance
CREATE POLICY "Full admins can view all legal acceptances"
    ON legal_acceptances
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'full_admin'
        )
    );

-- Add comment for documentation
COMMENT ON TABLE legal_acceptances IS 'Tracks user acceptance of Terms of Service and Privacy Policy for compliance';
