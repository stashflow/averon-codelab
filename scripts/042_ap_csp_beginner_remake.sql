-- AP CSP beginner-first full remake
-- Adds notion (graded MCQ) infrastructure and rewrites AP CSP sequence to be notes-first, pseudocode-first.

BEGIN;

ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS grade_notions BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notion_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  rationale TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notion_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.notion_questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  selected_index INTEGER,
  is_correct BOOLEAN,
  score INTEGER,
  teacher_score INTEGER,
  teacher_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'auto_graded',
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notion_submissions_unique
  ON public.notion_submissions(question_id, student_id, classroom_id);
CREATE INDEX IF NOT EXISTS idx_notion_questions_lesson ON public.notion_questions(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_notion_submissions_student ON public.notion_submissions(student_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_notion_submissions_classroom ON public.notion_submissions(classroom_id, answered_at DESC);

ALTER TABLE public.notion_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notion_questions_select_all ON public.notion_questions;
CREATE POLICY notion_questions_select_all
ON public.notion_questions FOR SELECT
USING (true);

DROP POLICY IF EXISTS notion_questions_manage_staff ON public.notion_questions;
CREATE POLICY notion_questions_manage_staff
ON public.notion_questions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'school_admin', 'district_admin', 'full_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'school_admin', 'district_admin', 'full_admin')
  )
);

DROP POLICY IF EXISTS notion_submissions_student_select ON public.notion_submissions;
CREATE POLICY notion_submissions_student_select
ON public.notion_submissions FOR SELECT
USING (student_id = auth.uid());

DROP POLICY IF EXISTS notion_submissions_student_upsert ON public.notion_submissions;
CREATE POLICY notion_submissions_student_upsert
ON public.notion_submissions FOR INSERT
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS notion_submissions_student_update ON public.notion_submissions;
CREATE POLICY notion_submissions_student_update
ON public.notion_submissions FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS notion_submissions_teacher_select ON public.notion_submissions;
CREATE POLICY notion_submissions_teacher_select
ON public.notion_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = notion_submissions.classroom_id
      AND c.teacher_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('school_admin', 'district_admin', 'full_admin')
  )
);

DROP POLICY IF EXISTS notion_submissions_teacher_grade ON public.notion_submissions;
CREATE POLICY notion_submissions_teacher_grade
ON public.notion_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = notion_submissions.classroom_id
      AND c.teacher_id = auth.uid()
      AND c.grade_notions = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('school_admin', 'district_admin', 'full_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = notion_submissions.classroom_id
      AND c.teacher_id = auth.uid()
      AND c.grade_notions = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('school_admin', 'district_admin', 'full_admin')
  )
);

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
)
UPDATE public.courses c
SET
  difficulty_level = 'beginner',
  language = 'python',
  description = 'AP CSP made beginner-friendly: notes first, pseudocode first, then Python. Includes short graded notions and gradual challenge growth.'
FROM ap_course
WHERE c.id = ap_course.id;

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
unit_seed AS (
  SELECT * FROM (VALUES
    (1, 'Unit 1: Intro to AP CSP and Problem Solving', 'Start from zero: vocabulary, pseudocode, and clear problem statements.'),
    (2, 'Unit 2: Algorithms and Basic Python', 'Move from pseudocode into Python with conditionals and loops.'),
    (3, 'Unit 3: Data and Lists', 'Learn how programs store and use data in lists.'),
    (4, 'Unit 4: Internet and Networks', 'Understand the internet in plain language and simple models.'),
    (5, 'Unit 5: Impact, Ethics, and Final Build', 'Connect computing to people, ethics, and a beginner capstone.')
  ) AS t(unit_number, title, description)
),
existing_units AS (
  SELECT u.id, u.unit_number
  FROM public.units u
  JOIN ap_course ac ON ac.id = u.course_id
)
UPDATE public.units u
SET
  title = s.title,
  description = s.description,
  is_published = true,
  order_index = s.unit_number
FROM unit_seed s
JOIN existing_units eu ON eu.unit_number = s.unit_number
WHERE u.id = eu.id;

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
unit_seed AS (
  SELECT * FROM (VALUES
    (1, 'Unit 1: Intro to AP CSP and Problem Solving', 'Start from zero: vocabulary, pseudocode, and clear problem statements.'),
    (2, 'Unit 2: Algorithms and Basic Python', 'Move from pseudocode into Python with conditionals and loops.'),
    (3, 'Unit 3: Data and Lists', 'Learn how programs store and use data in lists.'),
    (4, 'Unit 4: Internet and Networks', 'Understand the internet in plain language and simple models.'),
    (5, 'Unit 5: Impact, Ethics, and Final Build', 'Connect computing to people, ethics, and a beginner capstone.')
  ) AS t(unit_number, title, description)
)
INSERT INTO public.units (id, course_id, unit_number, order_index, title, description, is_published)
SELECT
  (
    substr(md5(ac.id::text || ':unit:' || s.unit_number::text), 1, 8) || '-' ||
    substr(md5(ac.id::text || ':unit:' || s.unit_number::text), 9, 4) || '-' ||
    substr(md5(ac.id::text || ':unit:' || s.unit_number::text), 13, 4) || '-' ||
    substr(md5(ac.id::text || ':unit:' || s.unit_number::text), 17, 4) || '-' ||
    substr(md5(ac.id::text || ':unit:' || s.unit_number::text), 21, 12)
  )::uuid,
  ac.id,
  s.unit_number,
  s.unit_number,
  s.title,
  s.description,
  true
FROM unit_seed s
CROSS JOIN ap_course ac
WHERE NOT EXISTS (
  SELECT 1 FROM public.units u
  WHERE u.course_id = ac.id
    AND u.unit_number = s.unit_number
);

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_seed AS (
  SELECT * FROM (VALUES
    (1, 0, 0, 'Lesson 1.0: AP CSP Course Intro Notes', 'reading', 25, 'Course intro and confidence-building start.', E'# 1.0 AP CSP Course Intro\n\nWelcome. You are supposed to be new here.\n\n## What You Will Learn\n- Think in steps\n- Write pseudocode\n- Move into Python slowly\n\n## Quote\n> “The most important property of a program is whether it accomplishes the intention of its user.” — C.A.R. Hoare\n\n## Notion\nWhy do we plan before coding?'),
    (1, 1, 1, 'Lesson 1.1: Problem Statements and Constraints', 'reading', 35, 'Define a problem clearly before writing code.', E'# 1.1 Problem Statements and Constraints\n\nA problem statement tells us what needs to be solved.\nA constraint tells us what rules we must follow.\n\n## Example\nProblem: Greet a student by name.\nConstraint: Output must be `Hello, <name>!` exactly.\n\n## Pseudocode\n1. Read name\n2. Build greeting string\n3. Return greeting'),
    (1, 2, 2, 'Lesson 1.2: Pseudocode First', 'reading', 35, 'Use pseudocode to design before coding.', E'# 1.2 Pseudocode First\n\nPseudocode is a plan in plain language.\n\n## Example\n1. If temperature < 50 return cold\n2. Else if < 75 return warm\n3. Else return hot\n\nThen convert to Python.'),
    (1, 3, 3, 'Lesson 1.3: Python Output with print()', 'coding', 40, 'Write simple Python output statements.', E'# 1.3 Python Output\n\nNow we move into Python gently.\n\n`print()` displays output.\n\n## Goal\nMake output match exactly.'),
    (1, 4, 4, 'Lesson 1.4: First Function in Python', 'coding', 45, 'Create a basic function with input and output.', E'# 1.4 First Function\n\nA function is a named set of steps.\n\n## Goal\nWrite `greet_student(name)` and return exact output.'),

    (2, 0, 0, 'Lesson 2.0: Unit 2 Intro Notes', 'reading', 20, 'Transition from pseudocode to core Python control flow.', E'# 2.0 Unit Intro\n\nThis unit turns plans into working Python logic.'),
    (2, 1, 1, 'Lesson 2.1: If/Else in Pseudocode', 'reading', 30, 'Understand decision branches before syntax.', E'# 2.1 If/Else in Pseudocode\n\nBranching means choosing between paths based on a condition.'),
    (2, 2, 2, 'Lesson 2.2: If/Else in Python', 'coding', 45, 'Implement branch logic in Python.', E'# 2.2 If/Else in Python\n\nTranslate branch pseudocode into Python syntax.'),
    (2, 3, 3, 'Lesson 2.3: Intro to Loops', 'coding', 45, 'Repeat steps with for loops.', E'# 2.3 Intro to Loops\n\nLoops repeat instructions for each item or count.'),

    (3, 0, 0, 'Lesson 3.0: Unit 3 Intro Notes', 'reading', 20, 'Data is how programs remember information.', E'# 3.0 Unit Intro\n\nPrograms are useful because they store and process data.'),
    (3, 1, 1, 'Lesson 3.1: Lists and Indexed Data', 'reading', 35, 'Learn what lists are and how indexing works.', E'# 3.1 Lists\n\nA list stores multiple values in order.'),
    (3, 2, 2, 'Lesson 3.2: Traversing Lists in Python', 'coding', 45, 'Use loops to read list values.', E'# 3.2 Traversing Lists\n\nUse loops to process every item once.'),
    (3, 3, 3, 'Lesson 3.3: Data Questions and Patterns', 'reading', 35, 'Use data to answer simple questions.', E'# 3.3 Data Questions\n\nData helps us answer measurable questions.'),

    (4, 0, 0, 'Lesson 4.0: Unit 4 Intro Notes', 'reading', 20, 'Internet and network basics in plain language.', E'# 4.0 Unit Intro\n\nYou use the internet daily; now you will understand it.'),
    (4, 1, 1, 'Lesson 4.1: Internet Basics', 'reading', 35, 'Understand clients, servers, and requests.', E'# 4.1 Internet Basics\n\nA client asks, a server responds.'),
    (4, 2, 2, 'Lesson 4.2: Packets and Reliability', 'reading', 35, 'How data is split, sent, and reassembled.', E'# 4.2 Packets\n\nLarge messages are split into packets.'),
    (4, 3, 3, 'Lesson 4.3: Simple Network Classifier', 'coding', 45, 'Classify network quality from input values.', E'# 4.3 Network Classifier\n\nUse simple thresholds to classify network quality.'),

    (5, 0, 0, 'Lesson 5.0: Unit 5 Intro Notes', 'reading', 20, 'Computing impact and responsible choices.', E'# 5.0 Unit Intro\n\nComputing affects real people and real decisions.'),
    (5, 1, 1, 'Lesson 5.1: Positive and Negative Impacts', 'reading', 35, 'Evaluate computing benefits and tradeoffs.', E'# 5.1 Impacts\n\nEvery innovation has benefits and costs.'),
    (5, 2, 2, 'Lesson 5.2: Data Ethics Basics', 'reading', 35, 'Understand fairness and bias in systems.', E'# 5.2 Data Ethics\n\nFair systems require careful data decisions.'),
    (5, 3, 3, 'Lesson 5.3: Capstone Planning', 'reading', 40, 'Plan a small project with pseudocode + Python steps.', E'# 5.3 Capstone Planning\n\nDefine goal, constraints, pseudocode, and test cases first.')
  ) AS t(unit_number, lesson_number, order_index, title, lesson_type, duration_minutes, description, content_body)
),
unit_lookup AS (
  SELECT u.id AS unit_id, u.unit_number
  FROM public.units u
  JOIN ap_course ac ON ac.id = u.course_id
),
target AS (
  SELECT s.*, ul.unit_id
  FROM lesson_seed s
  JOIN unit_lookup ul ON ul.unit_number = s.unit_number
)
UPDATE public.lessons l
SET
  title = t.title,
  description = t.description,
  lesson_type = t.lesson_type,
  duration_minutes = t.duration_minutes,
  content_body = t.content_body,
  is_published = true,
  order_index = t.order_index,
  lesson_number = t.lesson_number
FROM target t
WHERE l.unit_id = t.unit_id
  AND COALESCE(l.lesson_number, l.order_index) = t.lesson_number;

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_seed AS (
  SELECT * FROM (VALUES
    (1, 0, 0, 'Lesson 1.0: AP CSP Course Intro Notes', 'reading', 25, 'Course intro and confidence-building start.', E'# 1.0 AP CSP Course Intro\n\nWelcome. You are supposed to be new here.'),
    (1, 1, 1, 'Lesson 1.1: Problem Statements and Constraints', 'reading', 35, 'Define a problem clearly before writing code.', E'# 1.1 Problem Statements and Constraints\n\nProblem first, then code.'),
    (1, 2, 2, 'Lesson 1.2: Pseudocode First', 'reading', 35, 'Use pseudocode to design before coding.', E'# 1.2 Pseudocode First\n\nPlan in words, then code.'),
    (1, 3, 3, 'Lesson 1.3: Python Output with print()', 'coding', 40, 'Write simple Python output statements.', E'# 1.3 Python Output\n\nUse print for output.'),
    (1, 4, 4, 'Lesson 1.4: First Function in Python', 'coding', 45, 'Create a basic function with input and output.', E'# 1.4 First Function\n\nInput in, output out.'),
    (2, 0, 0, 'Lesson 2.0: Unit 2 Intro Notes', 'reading', 20, 'Transition from pseudocode to core Python control flow.', E'# 2.0 Unit Intro'),
    (2, 1, 1, 'Lesson 2.1: If/Else in Pseudocode', 'reading', 30, 'Understand decision branches before syntax.', E'# 2.1 If/Else in Pseudocode'),
    (2, 2, 2, 'Lesson 2.2: If/Else in Python', 'coding', 45, 'Implement branch logic in Python.', E'# 2.2 If/Else in Python'),
    (2, 3, 3, 'Lesson 2.3: Intro to Loops', 'coding', 45, 'Repeat steps with for loops.', E'# 2.3 Intro to Loops'),
    (3, 0, 0, 'Lesson 3.0: Unit 3 Intro Notes', 'reading', 20, 'Data is how programs remember information.', E'# 3.0 Unit Intro'),
    (3, 1, 1, 'Lesson 3.1: Lists and Indexed Data', 'reading', 35, 'Learn what lists are and how indexing works.', E'# 3.1 Lists and Indexed Data'),
    (3, 2, 2, 'Lesson 3.2: Traversing Lists in Python', 'coding', 45, 'Use loops to read list values.', E'# 3.2 Traversing Lists in Python'),
    (3, 3, 3, 'Lesson 3.3: Data Questions and Patterns', 'reading', 35, 'Use data to answer simple questions.', E'# 3.3 Data Questions and Patterns'),
    (4, 0, 0, 'Lesson 4.0: Unit 4 Intro Notes', 'reading', 20, 'Internet and network basics in plain language.', E'# 4.0 Unit Intro'),
    (4, 1, 1, 'Lesson 4.1: Internet Basics', 'reading', 35, 'Understand clients, servers, and requests.', E'# 4.1 Internet Basics'),
    (4, 2, 2, 'Lesson 4.2: Packets and Reliability', 'reading', 35, 'How data is split, sent, and reassembled.', E'# 4.2 Packets and Reliability'),
    (4, 3, 3, 'Lesson 4.3: Simple Network Classifier', 'coding', 45, 'Classify network quality from input values.', E'# 4.3 Simple Network Classifier'),
    (5, 0, 0, 'Lesson 5.0: Unit 5 Intro Notes', 'reading', 20, 'Computing impact and responsible choices.', E'# 5.0 Unit Intro'),
    (5, 1, 1, 'Lesson 5.1: Positive and Negative Impacts', 'reading', 35, 'Evaluate computing benefits and tradeoffs.', E'# 5.1 Positive and Negative Impacts'),
    (5, 2, 2, 'Lesson 5.2: Data Ethics Basics', 'reading', 35, 'Understand fairness and bias in systems.', E'# 5.2 Data Ethics Basics'),
    (5, 3, 3, 'Lesson 5.3: Capstone Planning', 'reading', 40, 'Plan a small project with pseudocode + Python steps.', E'# 5.3 Capstone Planning')
  ) AS t(unit_number, lesson_number, order_index, title, lesson_type, duration_minutes, description, content_body)
),
unit_lookup AS (
  SELECT u.id AS unit_id, u.unit_number, ac.id AS course_id
  FROM public.units u
  JOIN ap_course ac ON ac.id = u.course_id
),
missing AS (
  SELECT s.*, ul.unit_id, ul.course_id
  FROM lesson_seed s
  JOIN unit_lookup ul ON ul.unit_number = s.unit_number
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.unit_id = ul.unit_id
      AND COALESCE(l.lesson_number, l.order_index) = s.lesson_number
  )
)
INSERT INTO public.lessons (
  id, unit_id, lesson_number, order_index, title, description,
  lesson_type, duration_minutes, content_body, is_published
)
SELECT
  (
    substr(md5(m.course_id::text || ':lesson:' || m.unit_number::text || ':' || m.lesson_number::text), 1, 8) || '-' ||
    substr(md5(m.course_id::text || ':lesson:' || m.unit_number::text || ':' || m.lesson_number::text), 9, 4) || '-' ||
    substr(md5(m.course_id::text || ':lesson:' || m.unit_number::text || ':' || m.lesson_number::text), 13, 4) || '-' ||
    substr(md5(m.course_id::text || ':lesson:' || m.unit_number::text || ':' || m.lesson_number::text), 17, 4) || '-' ||
    substr(md5(m.course_id::text || ':lesson:' || m.unit_number::text || ':' || m.lesson_number::text), 21, 12)
  )::uuid,
  m.unit_id,
  m.lesson_number,
  m.order_index,
  m.title,
  m.description,
  m.lesson_type,
  m.duration_minutes,
  m.content_body,
  true
FROM missing m;

-- Coding checkpoints (easy and exact format)
WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_lookup AS (
  SELECT l.id AS lesson_id, u.unit_number, COALESCE(l.lesson_number, l.order_index) AS lesson_number
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN ap_course ac ON ac.id = u.course_id
),
coding_seed AS (
  SELECT * FROM (VALUES
    (1, 3, 'Checkpoint 1.3: Print a Welcome', E'Use print to output exactly: Welcome to AP CSP!', E'print("Welcome to AP CSP!")\n', E'print("Welcome to AP CSP!")\n', '""', '"Welcome to AP CSP!"'),
    (1, 4, 'Checkpoint 1.4: Greeting Function', E'Implement greet_student(name) and return exact format.', E'def greet_student(name):\n    # TODO\n    return ""\n', E'def greet_student(name):\n    return f"Hello, {name}!"\n', '"Ava"', '"Hello, Ava!"'),
    (2, 2, 'Checkpoint 2.2: Temperature Labels', E'Implement classify_temp(temp) with cold/warm/hot rules.', E'def classify_temp(temp):\n    # TODO\n    return ""\n', E'def classify_temp(temp):\n    if temp < 50:\n        return "cold"\n    if temp < 75:\n        return "warm"\n    return "hot"\n', '49', '"cold"'),
    (2, 3, 'Checkpoint 2.3: Count Loop', E'Return sum of numbers from 1 to n.', E'def sum_to_n(n):\n    # TODO\n    return 0\n', E'def sum_to_n(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n', '4', '10'),
    (3, 2, 'Checkpoint 3.2: Count Passing Scores', E'Return how many scores are >= 70.', E'def count_passing(scores):\n    # TODO\n    return 0\n', E'def count_passing(scores):\n    count = 0\n    for score in scores:\n        if score >= 70:\n            count += 1\n    return count\n', '[65, 70, 90]', '2'),
    (4, 3, 'Checkpoint 4.3: Network Quality', E'Classify quality by latency: <=50 good, <=120 okay, else slow.', E'def network_quality(latency):\n    # TODO\n    return ""\n', E'def network_quality(latency):\n    if latency <= 50:\n        return "good"\n    if latency <= 120:\n        return "okay"\n    return "slow"\n', '40', '"good"')
  ) AS t(unit_number, lesson_number, title, problem_description, starter_code, solution_code, input_1, expected_1)
),
target AS (
  SELECT cs.*, ll.lesson_id
  FROM coding_seed cs
  JOIN lesson_lookup ll
    ON ll.unit_number = cs.unit_number
   AND ll.lesson_number = cs.lesson_number
)
DELETE FROM public.checkpoints c
USING target t
WHERE c.lesson_id = t.lesson_id;

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_lookup AS (
  SELECT l.id AS lesson_id, u.unit_number, COALESCE(l.lesson_number, l.order_index) AS lesson_number
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN ap_course ac ON ac.id = u.course_id
),
coding_seed AS (
  SELECT * FROM (VALUES
    (1, 3, 'Checkpoint 1.3: Print a Welcome', E'Use print to output exactly: Welcome to AP CSP!', E'print("Welcome to AP CSP!")\n', E'print("Welcome to AP CSP!")\n', '""', '"Welcome to AP CSP!"'),
    (1, 4, 'Checkpoint 1.4: Greeting Function', E'Implement greet_student(name) and return exact format.', E'def greet_student(name):\n    # TODO\n    return ""\n', E'def greet_student(name):\n    return f"Hello, {name}!"\n', '"Ava"', '"Hello, Ava!"'),
    (2, 2, 'Checkpoint 2.2: Temperature Labels', E'Implement classify_temp(temp) with cold/warm/hot rules.', E'def classify_temp(temp):\n    # TODO\n    return ""\n', E'def classify_temp(temp):\n    if temp < 50:\n        return "cold"\n    if temp < 75:\n        return "warm"\n    return "hot"\n', '49', '"cold"'),
    (2, 3, 'Checkpoint 2.3: Count Loop', E'Return sum of numbers from 1 to n.', E'def sum_to_n(n):\n    # TODO\n    return 0\n', E'def sum_to_n(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n', '4', '10'),
    (3, 2, 'Checkpoint 3.2: Count Passing Scores', E'Return how many scores are >= 70.', E'def count_passing(scores):\n    # TODO\n    return 0\n', E'def count_passing(scores):\n    count = 0\n    for score in scores:\n        if score >= 70:\n            count += 1\n    return count\n', '[65, 70, 90]', '2'),
    (4, 3, 'Checkpoint 4.3: Network Quality', E'Classify quality by latency: <=50 good, <=120 okay, else slow.', E'def network_quality(latency):\n    # TODO\n    return ""\n', E'def network_quality(latency):\n    if latency <= 50:\n        return "good"\n    if latency <= 120:\n        return "okay"\n    return "slow"\n', '40', '"good"')
  ) AS t(unit_number, lesson_number, title, problem_description, starter_code, solution_code, input_1, expected_1)
),
target AS (
  SELECT cs.*, ll.lesson_id
  FROM coding_seed cs
  JOIN lesson_lookup ll
    ON ll.unit_number = cs.unit_number
   AND ll.lesson_number = cs.lesson_number
)
INSERT INTO public.checkpoints (
  id, lesson_id, title, problem_description, starter_code, solution_code,
  test_cases, points, order_index, difficulty, concept_tags
)
SELECT
  (
    substr(md5(t.lesson_id::text || ':checkpoint:1'), 1, 8) || '-' ||
    substr(md5(t.lesson_id::text || ':checkpoint:1'), 9, 4) || '-' ||
    substr(md5(t.lesson_id::text || ':checkpoint:1'), 13, 4) || '-' ||
    substr(md5(t.lesson_id::text || ':checkpoint:1'), 17, 4) || '-' ||
    substr(md5(t.lesson_id::text || ':checkpoint:1'), 21, 12)
  )::uuid,
  t.lesson_id,
  t.title,
  t.problem_description,
  t.starter_code,
  t.solution_code,
  jsonb_build_array(
    jsonb_build_object('name', 'Visible test', 'input', t.input_1, 'expected', t.expected_1),
    jsonb_build_object('name', 'Hidden test', 'input', t.input_1, 'expected', t.expected_1, 'hidden', true)
  ),
  20,
  1,
  'easy',
  ARRAY['ap_csp','beginner']
FROM target t;

-- Notion questions (MCQ + graded)
WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_lookup AS (
  SELECT l.id AS lesson_id, u.unit_number, COALESCE(l.lesson_number, l.order_index) AS lesson_number
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN ap_course ac ON ac.id = u.course_id
),
notion_seed AS (
  SELECT * FROM (VALUES
    (1, 0, 1, 'What is pseudocode?', ARRAY['A plain-language plan for code steps','A compiled language','A database','A network protocol'], 0, 'Pseudocode helps you plan before syntax.'),
    (1, 0, 2, 'What does IDE stand for?', ARRAY['Integrated Development Environment','Internet Data Engine','Input Design Environment','Internal Debug Engine'], 0, 'IDE is your coding workspace.'),
    (1, 1, 1, 'A constraint is:', ARRAY['A required limit','An optional comment','A variable name','A code editor'], 0, 'Constraints are required limits.'),
    (1, 1, 2, 'Best first step for a new problem?', ARRAY['Write pseudocode','Guess code quickly','Skip requirements','Rename everything'], 0, 'Plan before coding.'),
    (1, 2, 1, 'Pseudocode should be:', ARRAY['Clear and step-by-step','Perfect Python syntax','As short as possible only','Hidden from teammates'], 0, 'Pseudocode is a clear algorithm plan.'),
    (1, 3, 1, 'What does print() do?', ARRAY['Displays output','Reads files','Creates variables','Sorts lists'], 0, 'print() shows output.'),
    (1, 4, 1, 'What does return do in a function?', ARRAY['Sends a result back','Prints output only','Stops internet access','Declares a class'], 0, 'return sends function output.'),
    (2, 1, 1, 'If/else helps with:', ARRAY['Decision paths','Only math','Only loops','Only comments'], 0, 'Conditionals choose between branches.'),
    (2, 2, 1, 'In `if temp < 50`, true means:', ARRAY['Code inside if runs','Program crashes','Else runs first','Nothing happens'], 0, 'True condition runs its block.'),
    (2, 3, 1, 'A loop is used to:', ARRAY['Repeat steps','Create only strings','Avoid testing','Rename files'], 0, 'Loops repeat operations.'),
    (3, 1, 1, 'A list is:', ARRAY['An ordered collection','A network packet','A grading score','A policy rule'], 0, 'Lists hold ordered values.'),
    (3, 2, 1, 'Traversing a list means:', ARRAY['Going through each item','Deleting the list','Printing only first item','Sorting by default'], 0, 'Traversal processes items one-by-one.'),
    (4, 1, 1, 'On the web, a client usually:', ARRAY['Sends requests','Stores all routers','Writes hardware drivers','Builds packets manually'], 0, 'Client asks, server responds.'),
    (4, 2, 1, 'Packets are used to:', ARRAY['Split data into smaller pieces','Encrypt every message automatically','Remove all delays','Store passwords'], 0, 'Packets break data into chunks.'),
    (5, 1, 1, 'Computing impact can be:', ARRAY['Both helpful and harmful','Only helpful','Only harmful','Never measurable'], 0, 'Real impact includes tradeoffs.'),
    (5, 2, 1, 'Data ethics focuses on:', ARRAY['Fairness and responsible use','Fast typing','Color themes','Hardware cooling'], 0, 'Ethics is about responsible and fair use.')
  ) AS t(unit_number, lesson_number, order_index, prompt, options, correct_index, rationale)
),
target AS (
  SELECT ns.*, ll.lesson_id
  FROM notion_seed ns
  JOIN lesson_lookup ll
    ON ll.unit_number = ns.unit_number
   AND ll.lesson_number = ns.lesson_number
)
DELETE FROM public.notion_questions q
USING target t
WHERE q.lesson_id = t.lesson_id;

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_lookup AS (
  SELECT l.id AS lesson_id, u.unit_number, COALESCE(l.lesson_number, l.order_index) AS lesson_number
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN ap_course ac ON ac.id = u.course_id
),
notion_seed AS (
  SELECT * FROM (VALUES
    (1, 0, 1, 'What is pseudocode?', ARRAY['A plain-language plan for code steps','A compiled language','A database','A network protocol'], 0, 'Pseudocode helps you plan before syntax.'),
    (1, 0, 2, 'What does IDE stand for?', ARRAY['Integrated Development Environment','Internet Data Engine','Input Design Environment','Internal Debug Engine'], 0, 'IDE is your coding workspace.'),
    (1, 1, 1, 'A constraint is:', ARRAY['A required limit','An optional comment','A variable name','A code editor'], 0, 'Constraints are required limits.'),
    (1, 1, 2, 'Best first step for a new problem?', ARRAY['Write pseudocode','Guess code quickly','Skip requirements','Rename everything'], 0, 'Plan before coding.'),
    (1, 2, 1, 'Pseudocode should be:', ARRAY['Clear and step-by-step','Perfect Python syntax','As short as possible only','Hidden from teammates'], 0, 'Pseudocode is a clear algorithm plan.'),
    (1, 3, 1, 'What does print() do?', ARRAY['Displays output','Reads files','Creates variables','Sorts lists'], 0, 'print() shows output.'),
    (1, 4, 1, 'What does return do in a function?', ARRAY['Sends a result back','Prints output only','Stops internet access','Declares a class'], 0, 'return sends function output.'),
    (2, 1, 1, 'If/else helps with:', ARRAY['Decision paths','Only math','Only loops','Only comments'], 0, 'Conditionals choose between branches.'),
    (2, 2, 1, 'In `if temp < 50`, true means:', ARRAY['Code inside if runs','Program crashes','Else runs first','Nothing happens'], 0, 'True condition runs its block.'),
    (2, 3, 1, 'A loop is used to:', ARRAY['Repeat steps','Create only strings','Avoid testing','Rename files'], 0, 'Loops repeat operations.'),
    (3, 1, 1, 'A list is:', ARRAY['An ordered collection','A network packet','A grading score','A policy rule'], 0, 'Lists hold ordered values.'),
    (3, 2, 1, 'Traversing a list means:', ARRAY['Going through each item','Deleting the list','Printing only first item','Sorting by default'], 0, 'Traversal processes items one-by-one.'),
    (4, 1, 1, 'On the web, a client usually:', ARRAY['Sends requests','Stores all routers','Writes hardware drivers','Builds packets manually'], 0, 'Client asks, server responds.'),
    (4, 2, 1, 'Packets are used to:', ARRAY['Split data into smaller pieces','Encrypt every message automatically','Remove all delays','Store passwords'], 0, 'Packets break data into chunks.'),
    (5, 1, 1, 'Computing impact can be:', ARRAY['Both helpful and harmful','Only helpful','Only harmful','Never measurable'], 0, 'Real impact includes tradeoffs.'),
    (5, 2, 1, 'Data ethics focuses on:', ARRAY['Fairness and responsible use','Fast typing','Color themes','Hardware cooling'], 0, 'Ethics is about responsible and fair use.')
  ) AS t(unit_number, lesson_number, order_index, prompt, options, correct_index, rationale)
),
target AS (
  SELECT ns.*, ll.lesson_id
  FROM notion_seed ns
  JOIN lesson_lookup ll
    ON ll.unit_number = ns.unit_number
   AND ll.lesson_number = ns.lesson_number
)
INSERT INTO public.notion_questions (
  id, lesson_id, prompt, options, correct_index, rationale, points, order_index
)
SELECT
  (
    substr(md5(t.lesson_id::text || ':notion:' || t.order_index::text), 1, 8) || '-' ||
    substr(md5(t.lesson_id::text || ':notion:' || t.order_index::text), 9, 4) || '-' ||
    substr(md5(t.lesson_id::text || ':notion:' || t.order_index::text), 13, 4) || '-' ||
    substr(md5(t.lesson_id::text || ':notion:' || t.order_index::text), 17, 4) || '-' ||
    substr(md5(t.lesson_id::text || ':notion:' || t.order_index::text), 21, 12)
  )::uuid,
  t.lesson_id,
  t.prompt,
  to_jsonb(t.options),
  t.correct_index,
  t.rationale,
  5,
  t.order_index
FROM target t;

COMMIT;
