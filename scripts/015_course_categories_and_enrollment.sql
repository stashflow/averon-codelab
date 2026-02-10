-- Course Categories and Enhanced Enrollment System
-- Adds course categories, payment gating, and advanced progress tracking

-- =====================================================================
-- PART 1: COURSE CATEGORIES
-- =====================================================================

-- Create course categories table
CREATE TABLE IF NOT EXISTS public.course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_type TEXT NOT NULL CHECK (category_type IN ('self_paced', 'class_based')),
  icon_name TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT 'cyan',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.course_categories (name, slug, description, category_type, icon_name, color, order_index)
VALUES 
  ('Self-Paced Courses', 'self-paced', 'Learn at your own pace with our comprehensive self-study courses. Complete lessons and checkpoints on your schedule.', 'self_paced', 'BookOpen', 'cyan', 1),
  ('Class-Based Courses', 'class-based', 'Structured courses designed for classroom instruction with teacher guidance and peer collaboration.', 'class_based', 'Users', 'blue', 2)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  color = EXCLUDED.color;

-- Add category_id to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.course_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_classroom_enrollment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS prerequisite_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Update existing courses to be in self-paced category
UPDATE public.courses
SET category_id = (SELECT id FROM public.course_categories WHERE slug = 'self-paced' LIMIT 1),
    requires_payment = true,
    requires_classroom_enrollment = true
WHERE category_id IS NULL;

-- Insert placeholder AP and specialized courses into class-based category
INSERT INTO public.courses (
  id, 
  name, 
  description, 
  language, 
  level, 
  difficulty_level, 
  estimated_hours, 
  is_trial_accessible, 
  icon_name, 
  color, 
  is_active, 
  category_id,
  requires_payment,
  requires_classroom_enrollment
)
VALUES 
  (
    'ap-cs-principles-001',
    'AP Computer Science Principles',
    'College Board approved AP Computer Science Principles curriculum covering computational thinking, programming fundamentals, and the impact of computing.',
    'python',
    'intermediate',
    'intermediate',
    120,
    false,
    'GraduationCap',
    'purple',
    true,
    (SELECT id FROM public.course_categories WHERE slug = 'class-based' LIMIT 1),
    true,
    true
  ),
  (
    'ap-cs-a-001',
    'AP Computer Science A',
    'College Board approved AP Computer Science A curriculum focusing on Java programming, object-oriented design, data structures, and algorithms.',
    'java',
    'advanced',
    'advanced',
    150,
    false,
    'GraduationCap',
    'orange',
    true,
    (SELECT id FROM public.course_categories WHERE slug = 'class-based' LIMIT 1),
    true,
    true
  ),
  (
    'foundational-cs-001',
    'Foundational Computer Science',
    'Comprehensive introduction to computer science principles, covering programming basics, problem-solving, and computational thinking.',
    'python',
    'beginner',
    'beginner',
    80,
    false,
    'Code',
    'green',
    true,
    (SELECT id FROM public.course_categories WHERE slug = 'class-based' LIMIT 1),
    true,
    true
  ),
  (
    'ist-course-001',
    'Information Systems Technology (IST)',
    'Explore information systems, database management, web development, and technology applications in modern organizations.',
    'javascript',
    'intermediate',
    'intermediate',
    100,
    false,
    'Database',
    'blue',
    true,
    (SELECT id FROM public.course_categories WHERE slug = 'class-based' LIMIT 1),
    true,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id;

-- =====================================================================
-- PART 2: ENHANCED COURSE ENROLLMENTS
-- =====================================================================

-- Extend course_enrollments with payment and progress tracking
ALTER TABLE public.course_enrollments
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'free', 'trial')),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrollment_source TEXT DEFAULT 'direct' CHECK (enrollment_source IN ('direct', 'classroom', 'district', 'admin')),
ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'suspended')),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS checkpoints_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_payment ON public.course_enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_classroom ON public.course_enrollments(classroom_id);

-- =====================================================================
-- PART 3: PAYMENT AND ACCESS CONTROL
-- =====================================================================

-- Student payment records (for future Stripe integration)
CREATE TABLE IF NOT EXISTS public.student_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT DEFAULT 'stripe',
  payment_intent_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link payments to enrollments (one payment can unlock multiple courses)
CREATE TABLE IF NOT EXISTS public.enrollment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.student_payments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, payment_id)
);

-- District/School subscriptions for bulk access
CREATE TABLE IF NOT EXISTS public.district_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('trial', 'monthly', 'annual', 'perpetual')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  seats_included INTEGER DEFAULT 100,
  seats_used INTEGER DEFAULT 0,
  amount_cents INTEGER,
  billing_cycle_start TIMESTAMPTZ,
  billing_cycle_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- PART 4: PROGRESS TRACKING ENHANCEMENTS
-- =====================================================================

-- Track individual lesson completion
CREATE TABLE IF NOT EXISTS public.student_lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE(student_id, lesson_id, course_enrollment_id)
);

-- Track checkpoint attempts and completions
CREATE TABLE IF NOT EXISTS public.checkpoint_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  course_enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  code_submitted TEXT NOT NULL,
  passed BOOLEAN DEFAULT false,
  score NUMERIC DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_total INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  error_message TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lesson_completions_student ON public.student_lesson_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_enrollment ON public.student_lesson_completions(course_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_attempts_student ON public.checkpoint_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_attempts_checkpoint ON public.checkpoint_attempts(checkpoint_id);

-- =====================================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'course_categories', 'student_payments', 'enrollment_payments',
        'district_subscriptions', 'student_lesson_completions', 'checkpoint_attempts'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Course Categories: Everyone can read
CREATE POLICY "course_categories_select_all" 
  ON public.course_categories FOR SELECT 
  USING (true);

CREATE POLICY "course_categories_modify_admin" 
  ON public.course_categories FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('full_admin')));

-- Student Payments: Students see own, admins see all
CREATE POLICY "student_payments_select_own" 
  ON public.student_payments FOR SELECT 
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('full_admin', 'district_admin'))
  );

CREATE POLICY "student_payments_insert_own" 
  ON public.student_payments FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

-- Enrollment Payments: Students see own enrollments
CREATE POLICY "enrollment_payments_select_own" 
  ON public.enrollment_payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments 
      WHERE id = enrollment_id AND student_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('full_admin', 'district_admin'))
  );

-- District Subscriptions: District admins and full admins
CREATE POLICY "district_subscriptions_select" 
  ON public.district_subscriptions FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.district_admins WHERE admin_id = auth.uid() AND district_id = district_subscriptions.district_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'full_admin')
  );

CREATE POLICY "district_subscriptions_modify_admin" 
  ON public.district_subscriptions FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'full_admin'));

-- Student Lesson Completions: Students manage own
CREATE POLICY "lesson_completions_select_own" 
  ON public.student_lesson_completions FOR SELECT 
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'full_admin'))
  );

CREATE POLICY "lesson_completions_insert_own" 
  ON public.student_lesson_completions FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "lesson_completions_update_own" 
  ON public.student_lesson_completions FOR UPDATE 
  USING (auth.uid() = student_id);

-- Checkpoint Attempts: Students manage own, teachers can view
CREATE POLICY "checkpoint_attempts_select" 
  ON public.checkpoint_attempts FOR SELECT 
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'full_admin'))
  );

CREATE POLICY "checkpoint_attempts_insert_own" 
  ON public.checkpoint_attempts FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

-- =====================================================================
-- PART 6: HELPER FUNCTIONS
-- =====================================================================

-- Function to check if student has access to a course
CREATE OR REPLACE FUNCTION public.student_has_course_access(
  p_student_id UUID,
  p_course_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enrollment_count INTEGER;
  v_classroom_enrolled BOOLEAN;
  v_district_subscription_active BOOLEAN;
BEGIN
  -- Check if student has active enrollment with paid status
  SELECT COUNT(*) INTO v_enrollment_count
  FROM public.course_enrollments
  WHERE student_id = p_student_id
    AND course_id = p_course_id
    AND is_active = true
    AND payment_status IN ('paid', 'free', 'trial')
    AND status = 'active';
  
  IF v_enrollment_count > 0 THEN
    RETURN true;
  END IF;
  
  -- Check if student is in a classroom that provides access
  SELECT EXISTS(
    SELECT 1
    FROM public.enrollments e
    INNER JOIN public.classrooms c ON e.classroom_id = c.id
    WHERE e.student_id = p_student_id
      AND c.is_active = true
  ) INTO v_classroom_enrolled;
  
  IF v_classroom_enrolled THEN
    RETURN true;
  END IF;
  
  -- Check district subscription
  SELECT EXISTS(
    SELECT 1
    FROM public.enrollments e
    INNER JOIN public.classrooms c ON e.classroom_id = c.id
    INNER JOIN public.district_subscriptions ds ON c.district_id = ds.district_id
    WHERE e.student_id = p_student_id
      AND ds.status = 'active'
      AND (ds.end_date IS NULL OR ds.end_date > NOW())
  ) INTO v_district_subscription_active;
  
  RETURN v_district_subscription_active;
END;
$$;

-- Function to calculate course progress percentage
CREATE OR REPLACE FUNCTION public.calculate_course_progress(
  p_student_id UUID,
  p_course_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_progress NUMERIC;
BEGIN
  -- Count total lessons in course
  SELECT COUNT(DISTINCT l.id) INTO v_total_lessons
  FROM public.lessons l
  INNER JOIN public.units u ON l.unit_id = u.id
  WHERE u.course_id = p_course_id;
  
  IF v_total_lessons = 0 THEN
    RETURN 0;
  END IF;
  
  -- Count completed lessons
  SELECT COUNT(DISTINCT slc.lesson_id) INTO v_completed_lessons
  FROM public.student_lesson_completions slc
  INNER JOIN public.lessons l ON slc.lesson_id = l.id
  INNER JOIN public.units u ON l.unit_id = u.id
  WHERE slc.student_id = p_student_id
    AND u.course_id = p_course_id;
  
  v_progress := (v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100;
  
  RETURN ROUND(v_progress, 2);
END;
$$;

-- =====================================================================
-- PART 7: GRANT PERMISSIONS
-- =====================================================================

GRANT ALL ON public.course_categories TO authenticated;
GRANT ALL ON public.student_payments TO authenticated;
GRANT ALL ON public.enrollment_payments TO authenticated;
GRANT ALL ON public.district_subscriptions TO authenticated;
GRANT ALL ON public.student_lesson_completions TO authenticated;
GRANT ALL ON public.checkpoint_attempts TO authenticated;

GRANT ALL ON public.course_categories TO service_role;
GRANT ALL ON public.student_payments TO service_role;
GRANT ALL ON public.enrollment_payments TO service_role;
GRANT ALL ON public.district_subscriptions TO service_role;
GRANT ALL ON public.student_lesson_completions TO service_role;
GRANT ALL ON public.checkpoint_attempts TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.student_has_course_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_course_progress TO authenticated;
