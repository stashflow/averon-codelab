-- Averon Code Lab V2 Schema
-- Enhanced platform with trials, mastery tracking, and monetization

-- ============================================
-- PART 1: EXTEND EXISTING TABLES
-- ============================================

-- Add trial mode and licensing fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teacher_mode TEXT DEFAULT 'trial' CHECK (teacher_mode IN ('trial', 'district'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_student_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add plan and licensing to districts
ALTER TABLE districts ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'enterprise'));
ALTER TABLE districts ADD COLUMN IF NOT EXISTS teacher_limit INTEGER DEFAULT 10;
ALTER TABLE districts ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 500;
ALTER TABLE districts ADD COLUMN IF NOT EXISTS license_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE districts ADD COLUMN IF NOT EXISTS license_end TIMESTAMPTZ;
ALTER TABLE districts ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- ============================================
-- PART 2: LEARNING CONTENT STRUCTURE
-- ============================================

-- Courses table (already exists, extend it)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 40;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_trial_accessible BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS color TEXT;

-- Units within courses
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    learning_objectives TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons within units
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'interactive')),
    content_url TEXT,
    content_body TEXT,
    duration_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkpoints (practice problems within lessons)
CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    starter_code TEXT,
    solution_code TEXT,
    test_cases JSONB NOT NULL DEFAULT '[]',
    difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points INTEGER DEFAULT 10,
    order_index INTEGER NOT NULL,
    concept_tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: STUDENT PROGRESS TRACKING
-- ============================================

-- Student progress per lesson
CREATE TABLE IF NOT EXISTS student_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score NUMERIC(5,2),
    attempts INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    mastery_level TEXT DEFAULT 'learning' CHECK (mastery_level IN ('learning', 'proficient', 'mastered')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- Checkpoint submissions
CREATE TABLE IF NOT EXISTS checkpoint_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    test_results JSONB,
    score NUMERIC(5,2),
    is_correct BOOLEAN DEFAULT false,
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept mastery tracking
CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    concept_name TEXT NOT NULL,
    mastery_score NUMERIC(5,2) DEFAULT 0,
    practice_count INTEGER DEFAULT 0,
    last_practiced TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, concept_name)
);

-- ============================================
-- PART 4: MOTIVATION & ENGAGEMENT
-- ============================================

-- Badges and achievements
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Student streaks
CREATE TABLE IF NOT EXISTS student_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)
);

-- ============================================
-- PART 5: TEACHER EFFICIENCY
-- ============================================

-- Assignment templates (reusable)
CREATE TABLE IF NOT EXISTS assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT,
    starter_code TEXT,
    test_cases JSONB,
    rubric JSONB,
    points INTEGER DEFAULT 100,
    difficulty TEXT,
    concept_tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback templates
CREATE TABLE IF NOT EXISTS feedback_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 6: COMPLIANCE & AUDIT
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Data export requests
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID REFERENCES profiles(id),
    district_id UUID REFERENCES districts(id),
    export_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- PART 7: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_lesson ON checkpoints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_lesson ON student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_submissions_student ON checkpoint_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_submissions_checkpoint ON checkpoint_submissions(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student ON concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_badges_student ON badges(student_id);

-- ============================================
-- PART 8: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'units','lessons','checkpoints','student_lesson_progress',
        'checkpoint_submissions','concept_mastery','badges','student_streaks',
        'assignment_templates','feedback_templates','audit_logs','data_exports'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Units: Everyone can read
CREATE POLICY "Units are viewable by everyone" ON units FOR SELECT USING (true);

-- Lessons: Everyone can read
CREATE POLICY "Lessons are viewable by everyone" ON lessons FOR SELECT USING (true);

-- Checkpoints: Everyone can read
CREATE POLICY "Checkpoints are viewable by everyone" ON checkpoints FOR SELECT USING (true);

-- Student progress: Students see own, teachers see their students
CREATE POLICY "Students can view own progress" ON student_lesson_progress
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own progress" ON student_lesson_progress
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can modify own progress" ON student_lesson_progress
    FOR UPDATE USING (auth.uid() = student_id);

-- Checkpoint submissions: Students own, teachers can view
CREATE POLICY "Students can submit checkpoints" ON checkpoint_submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own submissions" ON checkpoint_submissions
    FOR SELECT USING (auth.uid() = student_id);

-- Concept mastery: Students own data
CREATE POLICY "Students can view own mastery" ON concept_mastery
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own mastery" ON concept_mastery
    FOR ALL USING (auth.uid() = student_id);

-- Badges: Students view own
CREATE POLICY "Students can view own badges" ON badges
    FOR SELECT USING (auth.uid() = student_id);

-- Streaks: Students own
CREATE POLICY "Students can view own streak" ON student_streaks
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update own streak" ON student_streaks
    FOR ALL USING (auth.uid() = student_id);

-- Assignment templates: Teachers manage own
CREATE POLICY "Teachers can manage own templates" ON assignment_templates
    FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Public templates viewable by all" ON assignment_templates
    FOR SELECT USING (is_public = true);

-- Feedback templates: Teachers manage own
CREATE POLICY "Teachers can manage own feedback templates" ON feedback_templates
    FOR ALL USING (auth.uid() = teacher_id);

-- Audit logs: Admins only
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'full_admin', 'district_admin')
        )
    );

-- Data exports: Requesters and admins
CREATE POLICY "Users can view own export requests" ON data_exports
    FOR SELECT USING (auth.uid() = requested_by);

-- ============================================
-- PART 9: SEED DATA - SAMPLE COURSE
-- ============================================

-- Insert Python Basics course (trial-accessible)
INSERT INTO courses (id, name, description, language, level, difficulty_level, estimated_hours, is_trial_accessible, icon_name, color)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Python Fundamentals', 'Learn Python programming from scratch with hands-on practice', 'python', 'beginner', 'beginner', 30, true, 'Code', 'cyan')
ON CONFLICT (id) DO UPDATE SET
    is_trial_accessible = true,
    difficulty_level = 'beginner',
    estimated_hours = 30;

-- Insert sample units for Python Fundamentals
INSERT INTO units (course_id, title, description, order_index, learning_objectives) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Getting Started', 'Introduction to Python and basic concepts', 1, ARRAY['Understand what Python is', 'Write your first program', 'Use variables and data types']),
    ('00000000-0000-0000-0000-000000000001', 'Control Flow', 'Conditionals and loops', 2, ARRAY['Use if/else statements', 'Create for and while loops', 'Understand boolean logic']),
    ('00000000-0000-0000-0000-000000000001', 'Functions', 'Creating reusable code', 3, ARRAY['Define and call functions', 'Use parameters and return values', 'Understand scope'])
ON CONFLICT DO NOTHING;

-- Insert sample lessons (just first unit for now)
INSERT INTO lessons (unit_id, title, description, order_index, content_type, duration_minutes)
SELECT 
    u.id,
    'Variables and Data Types',
    'Learn how to store and work with different types of data in Python',
    1,
    'text',
    15
FROM units u WHERE u.title = 'Getting Started'
ON CONFLICT DO NOTHING;

INSERT INTO lessons (unit_id, title, description, order_index, content_type, duration_minutes)
SELECT 
    u.id,
    'Operators and Expressions',
    'Perform calculations and comparisons in Python',
    2,
    'text',
    20
FROM units u WHERE u.title = 'Getting Started'
ON CONFLICT DO NOTHING;

-- Insert sample checkpoints
INSERT INTO checkpoints (lesson_id, title, problem_description, starter_code, test_cases, points, order_index, concept_tags)
SELECT 
    l.id,
    'Create Your First Variable',
    'Create a variable called "name" and assign it your name as a string.',
    '# Write your code below\n',
    '[{"input": "", "expected_output": "name should be a string", "test_type": "variable_exists"}]'::jsonb,
    10,
    1,
    ARRAY['variables', 'strings']
FROM lessons l WHERE l.title = 'Variables and Data Types'
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 10: HELPER FUNCTIONS
-- ============================================

-- Function to check trial expiration
CREATE OR REPLACE FUNCTION is_trial_expired(teacher_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = teacher_id
        AND teacher_mode = 'trial'
        AND trial_end_date < NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trial days remaining
CREATE OR REPLACE FUNCTION trial_days_remaining(teacher_id UUID)
RETURNS INTEGER AS $$
DECLARE
    days INTEGER;
BEGIN
    SELECT EXTRACT(DAY FROM (trial_end_date - NOW()))::INTEGER
    INTO days
    FROM profiles
    WHERE id = teacher_id AND teacher_mode = 'trial';
    
    RETURN COALESCE(days, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate student mastery for a concept
CREATE OR REPLACE FUNCTION calculate_concept_mastery(
    p_student_id UUID,
    p_concept_name TEXT,
    p_course_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    avg_score NUMERIC;
BEGIN
    SELECT AVG(cs.score)
    INTO avg_score
    FROM checkpoint_submissions cs
    JOIN checkpoints c ON c.id = cs.checkpoint_id
    WHERE cs.student_id = p_student_id
    AND p_concept_name = ANY(c.concept_tags);
    
    RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award badge
CREATE OR REPLACE FUNCTION award_badge(
    p_student_id UUID,
    p_badge_type TEXT,
    p_badge_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_badge_id UUID;
BEGIN
    -- Check if already earned
    IF EXISTS (
        SELECT 1 FROM badges
        WHERE student_id = p_student_id AND badge_type = p_badge_type
    ) THEN
        RETURN NULL;
    END IF;
    
    INSERT INTO badges (student_id, badge_type, badge_name, badge_description)
    VALUES (p_student_id, p_badge_type, p_badge_name, p_description)
    RETURNING id INTO new_badge_id;
    
    RETURN new_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_student_streak(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
    today DATE := CURRENT_DATE;
    last_date DATE;
    current_streak_val INTEGER;
BEGIN
    SELECT last_activity_date, current_streak
    INTO last_date, current_streak_val
    FROM student_streaks
    WHERE student_id = p_student_id;
    
    IF NOT FOUND THEN
        -- Create new streak record
        INSERT INTO student_streaks (student_id, current_streak, longest_streak, last_activity_date)
        VALUES (p_student_id, 1, 1, today);
        RETURN;
    END IF;
    
    IF last_date = today THEN
        -- Already counted today
        RETURN;
    ELSIF last_date = today - INTERVAL '1 day' THEN
        -- Consecutive day
        UPDATE student_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = today
        WHERE student_id = p_student_id;
    ELSE
        -- Streak broken
        UPDATE student_streaks
        SET current_streak = 1,
            last_activity_date = today
        WHERE student_id = p_student_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE units IS 'Course units containing multiple lessons';
COMMENT ON TABLE lessons IS 'Individual lessons with content and learning materials';
COMMENT ON TABLE checkpoints IS 'Practice problems within lessons for immediate feedback';
COMMENT ON TABLE student_lesson_progress IS 'Tracks student progress through lessons';
COMMENT ON TABLE checkpoint_submissions IS 'Student submissions for checkpoint problems';
COMMENT ON TABLE concept_mastery IS 'Tracks student mastery level per programming concept';
COMMENT ON TABLE badges IS 'Achievement badges earned by students';
COMMENT ON TABLE student_streaks IS 'Tracks consecutive days of student activity';
COMMENT ON TABLE assignment_templates IS 'Reusable assignment templates for teachers';
COMMENT ON TABLE feedback_templates IS 'Quick feedback templates for grading';
COMMENT ON TABLE audit_logs IS 'Compliance and security audit trail';
COMMENT ON TABLE data_exports IS 'Tracks data export requests for compliance';
