-- Course Assignment System
-- Teachers can assign specific lessons/quizzes from courses with due dates
-- Supports assigning multiple lessons at once (e.g., 3.1, 3.2, 3.3)
-- Ready for when course content is implemented

-- Course structure (ready for implementation)
-- courses (already exists)
-- units -> lessons -> content/quizzes

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, unit_number)
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL, -- e.g., 1, 2, 3 (for 3.1, 3.2, 3.3)
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'reading', 'coding', 'quiz'
  content_data JSONB, -- Flexible storage for different lesson types
  estimated_minutes INTEGER DEFAULT 30,
  is_published BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(unit_id, lesson_number)
);

-- Lesson assignments (teachers assign lessons to classrooms)
CREATE TABLE IF NOT EXISTS public.lesson_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  instructions TEXT, -- Custom instructions from teacher
  is_required BOOLEAN DEFAULT TRUE,
  points_possible INTEGER DEFAULT 100,
  UNIQUE(classroom_id, lesson_id) -- Can't assign same lesson twice to same class
);

-- Student progress on assigned lessons
CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.lesson_assignments(id) ON DELETE SET NULL, -- Optional: links to specific assignment
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'submitted'
  progress_percentage INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  score INTEGER, -- For quizzes/coding challenges
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  work_data JSONB, -- Store student's work (quiz answers, code, notes)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- Teacher feedback on student lesson work
CREATE TABLE IF NOT EXISTS public.lesson_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES public.student_lesson_progress(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  grade INTEGER, -- Override/adjust score
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_feedback ENABLE ROW LEVEL SECURITY;

-- Units Policies (part of course structure)
CREATE POLICY "units_select_all" ON public.units 
  FOR SELECT USING (
    is_published = true OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "units_modify_admins" ON public.units 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'school_admin', 'full_admin'))
  );

-- Lessons Policies
CREATE POLICY "lessons_select_students" ON public.lessons 
  FOR SELECT USING (
    is_published = true OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "lessons_modify_educators" ON public.lessons 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'school_admin', 'full_admin'))
  );

-- Lesson Assignments Policies
CREATE POLICY "lesson_assignments_select" ON public.lesson_assignments 
  FOR SELECT USING (
    -- Students in the classroom
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE classroom_id = lesson_assignments.classroom_id 
        AND student_id = auth.uid()
    ) OR
    -- Teacher of the classroom
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = lesson_assignments.classroom_id 
        AND teacher_id = auth.uid()
    ) OR
    -- Admins
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "lesson_assignments_insert_teachers" ON public.lesson_assignments 
  FOR INSERT WITH CHECK (
    auth.uid() = assigned_by AND (
      EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_id AND teacher_id = auth.uid()
      ) OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
    )
  );

CREATE POLICY "lesson_assignments_update_teachers" ON public.lesson_assignments 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = classroom_id AND teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "lesson_assignments_delete_teachers" ON public.lesson_assignments 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = classroom_id AND teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
  );

-- Student Lesson Progress Policies
CREATE POLICY "progress_select" ON public.student_lesson_progress 
  FOR SELECT USING (
    auth.uid() = student_id OR
    -- Teachers can see progress of students in their classes
    EXISTS (
      SELECT 1 FROM public.lesson_assignments la
      JOIN public.classrooms c ON c.id = la.classroom_id
      WHERE la.lesson_id = student_lesson_progress.lesson_id
        AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "progress_insert_students" ON public.student_lesson_progress 
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
  );

CREATE POLICY "progress_update_students" ON public.student_lesson_progress 
  FOR UPDATE USING (
    auth.uid() = student_id
  );

-- Lesson Feedback Policies
CREATE POLICY "feedback_select" ON public.lesson_feedback 
  FOR SELECT USING (
    auth.uid() = teacher_id OR
    EXISTS (
      SELECT 1 FROM public.student_lesson_progress 
      WHERE id = progress_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "feedback_insert_teachers" ON public.lesson_feedback 
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "feedback_update_teachers" ON public.lesson_feedback 
  FOR UPDATE USING (
    auth.uid() = teacher_id
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_course ON public.units(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON public.lessons(unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_classroom ON public.lesson_assignments(classroom_id, due_date);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson ON public.lesson_assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_student ON public.student_lesson_progress(student_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON public.student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_assignment ON public.student_lesson_progress(assignment_id);
