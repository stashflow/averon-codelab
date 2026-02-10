-- Course Enrollment and Sample Data Migration
-- This creates the course_enrollments table and populates courses with placeholder data

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage NUMERIC DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_enrollments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_enrollments', r.policyname);
  END LOOP;
END $$;

-- RLS Policies for course_enrollments
CREATE POLICY "Students can view own enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own enrollments"
  ON public.course_enrollments
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);

-- Insert sample courses (Python, JavaScript, Java, C++)
INSERT INTO public.courses (id, name, description, language, level, difficulty_level, estimated_hours, is_trial_accessible, icon_name, color, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Python Fundamentals', 'Learn Python programming from scratch with hands-on coding exercises and real-world projects', 'python', 'beginner', 'beginner', 40, true, 'Code', 'cyan', true),
  ('00000000-0000-0000-0000-000000000002', 'JavaScript Essentials', 'Master JavaScript fundamentals including ES6+, DOM manipulation, and async programming', 'javascript', 'beginner', 'beginner', 35, true, 'Code', 'yellow', true),
  ('00000000-0000-0000-0000-000000000003', 'Java Programming', 'Comprehensive Java course covering OOP, data structures, and application development', 'java', 'intermediate', 'intermediate', 50, false, 'Code', 'orange', true),
  ('00000000-0000-0000-0000-000000000004', 'C++ Mastery', 'Deep dive into C++ including memory management, STL, and advanced programming concepts', 'cpp', 'advanced', 'advanced', 60, false, 'Code', 'blue', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_trial_accessible = EXCLUDED.is_trial_accessible;

-- Insert Units for Python Fundamentals
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Getting Started with Python', 'Introduction to Python syntax, variables, and basic operations', 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Control Flow', 'Learn conditionals, loops, and program flow control', 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Functions and Modules', 'Create reusable code with functions and organize code with modules', 3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Data Structures', 'Master lists, dictionaries, sets, and tuples', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert Lessons for Python Unit 1
INSERT INTO public.lessons (id, unit_id, title, description, content_body, order_index, duration_minutes, content_type)
VALUES 
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Hello Python', 'Your first Python program', 'Learn how to write and run your first Python program using print statements.', 1, 15, 'text'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Variables and Types', 'Understanding data types', 'Explore Python variables, integers, floats, strings, and booleans.', 2, 20, 'text'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Basic Operations', 'Math and string operations', 'Perform arithmetic operations and string manipulations in Python.', 3, 25, 'text'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'User Input', 'Interactive programs', 'Create programs that accept and process user input.', 4, 20, 'text')
ON CONFLICT (id) DO NOTHING;

-- Insert Lessons for Python Unit 2
INSERT INTO public.lessons (id, unit_id, title, description, content_body, order_index, duration_minutes, content_type)
VALUES 
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'If Statements', 'Making decisions in code', 'Learn conditional logic with if, elif, and else statements.', 1, 20, 'text'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'While Loops', 'Repeating code with while', 'Use while loops to repeat code based on conditions.', 2, 25, 'text'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'For Loops', 'Iterating with for loops', 'Master for loops and the range function for iteration.', 3, 25, 'text')
ON CONFLICT (id) DO NOTHING;

-- Insert Checkpoints for Lesson 1
INSERT INTO public.checkpoints (id, lesson_id, title, problem_description, starter_code, solution_code, test_cases, order_index, points, difficulty, concept_tags)
VALUES 
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Print Hello World', 'Write a program that prints "Hello, World!" to the console', '# Write your code here\n', 'print("Hello, World!")', '[{"input": "", "expected": "Hello, World!", "description": "Should print Hello, World!"}]'::jsonb, 1, 10, 'easy', ARRAY['print', 'basics']),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Print Your Name', 'Create a program that prints your name', '# Print your name\n', 'print("Student Name")', '[{"input": "", "expected": "Student Name", "description": "Should print a name"}]'::jsonb, 2, 10, 'easy', ARRAY['print', 'strings'])
ON CONFLICT (id) DO NOTHING;

-- Insert Checkpoints for Lesson 2
INSERT INTO public.checkpoints (id, lesson_id, title, problem_description, starter_code, solution_code, test_cases, order_index, points, difficulty, concept_tags)
VALUES 
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Create Variables', 'Create variables for your name, age, and favorite color', '# Create three variables\nname = \nage = \ncolor = \n', 'name = "John"\nage = 25\ncolor = "blue"', '[{"input": "", "expected": "Variables created", "description": "Create name, age, and color variables"}]'::jsonb, 1, 15, 'easy', ARRAY['variables', 'types']),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Math Operations', 'Calculate the sum of two numbers', '# Calculate sum\na = 5\nb = 10\nresult = \nprint(result)', 'a = 5\nb = 10\nresult = a + b\nprint(result)', '[{"input": "", "expected": "15", "description": "Should print 15"}]'::jsonb, 2, 15, 'easy', ARRAY['math', 'operations'])
ON CONFLICT (id) DO NOTHING;

-- Insert Units for JavaScript
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'JavaScript Basics', 'Variables, data types, and operators', 1),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Functions and Scope', 'Creating and using functions', 2),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000002', 'DOM Manipulation', 'Working with HTML elements', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert Units for Java
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'Java Fundamentals', 'Syntax, variables, and data types', 1),
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000003', 'Object-Oriented Programming', 'Classes, objects, and inheritance', 2),
  ('10000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000003', 'Collections Framework', 'Lists, sets, and maps', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert Units for C++
INSERT INTO public.units (id, course_id, title, description, order_index)
VALUES 
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000004', 'C++ Basics', 'Syntax, variables, and control flow', 1),
  ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000004', 'Pointers and Memory', 'Memory management and pointers', 2),
  ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000004', 'STL and Templates', 'Standard Template Library', 3)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
