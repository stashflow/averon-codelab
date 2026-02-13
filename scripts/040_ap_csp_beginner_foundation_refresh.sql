-- AP CSP beginner-first refresh for Unit 1
-- Safe to run multiple times

BEGIN;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS content_body TEXT,
  ADD COLUMN IF NOT EXISTS lesson_number INTEGER,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS lesson_type TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS problem_description TEXT,
  ADD COLUMN IF NOT EXISTS starter_code TEXT,
  ADD COLUMN IF NOT EXISTS solution_code TEXT,
  ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS concept_tags TEXT[];

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
  description = 'AP Computer Science Principles with a beginner-first on-ramp, rigorous progression, and explicit practice loops (Spaced Repetition, Active Recall, Interleaving, Deliberate Practice).'
FROM ap_course
WHERE c.id = ap_course.id;

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
)
UPDATE public.units u
SET
  title = 'Unit 1: Beginner Foundations and Computational Thinking',
  description = 'Start from zero: writing your first function, tracing outcomes, and building confidence with decomposition and abstraction.',
  learning_objectives = ARRAY[
    'Write and run your first function with confidence',
    'Trace simple conditionals before running code',
    'Break a bigger task into smaller algorithmic steps',
    'Use a repeatable four-method learning loop for retention'
  ],
  is_published = true
FROM ap_course
WHERE u.course_id = ap_course.id
  AND COALESCE(u.unit_number, u.order_index) = 1;

WITH target AS (
  SELECT l.id
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN public.courses c ON c.id = u.course_id
  WHERE (c.id = '00000000-0000-0000-0000-000000000010' OR lower(c.name) = 'ap computer science principles')
    AND COALESCE(u.unit_number, u.order_index) = 1
    AND COALESCE(l.lesson_number, l.order_index) = 1
)
UPDATE public.lessons l
SET
  title = 'Lesson 1.1: Your First Function (Complete Beginner Start)',
  description = 'Start coding from zero: understand function input/output and return a clear greeting.',
  content_body = E'# Lesson 1.1: Your First Function\n\n## Start Here (No Experience Required)\nYou do not need prior coding experience for this lesson.\n\n- A **function** is a named set of instructions.\n- An **input** is information given to the function.\n- An **output** is what the function returns.\n\n## Lesson Outcomes\n- Explain input and output in plain language\n- Read a small Python function\n- Complete a starter function and pass tests\n\n## Four-Method Learning Loop\n- **Spaced Repetition:** restate one key idea after every section\n- **Active Recall:** predict the output before running tests\n- **Interleaving:** compare this function to one real-world process you know\n- **Deliberate Practice:** improve variable naming after tests pass\n\n## Worked Example (python)\n```python\ndef greet_student(name):\n    return f"Hello, {name}!"\n```\n\n## Example Inputs and Outputs\n- Input: `"Ava"` -> Output: `"Hello, Ava!"`\n- Input: `"Noah"` -> Output: `"Hello, Noah!"`\n\n## Reflection Prompt\nIn one sentence: what is the difference between a function\'s input and output?',
  duration_minutes = 40,
  lesson_type = 'coding',
  is_published = true
WHERE l.id IN (SELECT id FROM target);

WITH target_lesson AS (
  SELECT l.id
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN public.courses c ON c.id = u.course_id
  WHERE (c.id = '00000000-0000-0000-0000-000000000010' OR lower(c.name) = 'ap computer science principles')
    AND COALESCE(u.unit_number, u.order_index) = 1
    AND COALESCE(l.lesson_number, l.order_index) = 1
)
UPDATE public.checkpoints c
SET
  title = 'Checkpoint 1.1: Build Your First Function',
  problem_description = E'## Objective\nWrite your first Python function and return the expected greeting string.\n\n## Task\nComplete `greet_student(name)` so it returns exactly `"Hello, <name>!"`.\n\n## Requirements\n1. Keep the function name and parameter unchanged.\n2. Return a string (do not print).\n3. Match spacing and punctuation exactly.\n\n## Success Criteria\n- Visible test passes\n- Hidden test passes\n- Output format is exact',
  starter_code = E'def greet_student(name):\n    # TODO: return a greeting string\n    return ""\n',
  solution_code = E'def greet_student(name):\n    return f"Hello, {name}!"\n',
  test_cases = jsonb_build_array(
    jsonb_build_object('name', 'Visible test 1', 'input', '"Ava"', 'expected', '"Hello, Ava!"'),
    jsonb_build_object('name', 'Hidden test', 'input', '"Noah"', 'expected', '"Hello, Noah!"', 'hidden', true)
  ),
  difficulty = 'easy',
  concept_tags = ARRAY['functions','input_output','strings']
WHERE c.lesson_id IN (SELECT id FROM target_lesson);

WITH target AS (
  SELECT l.id
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN public.courses c ON c.id = u.course_id
  WHERE (c.id = '00000000-0000-0000-0000-000000000010' OR lower(c.name) = 'ap computer science principles')
    AND COALESCE(u.unit_number, u.order_index) = 1
    AND COALESCE(l.lesson_number, l.order_index) = 2
)
UPDATE public.lessons l
SET
  title = 'Lesson 1.2: Predict Program Output with Conditionals',
  description = 'Build confidence by tracing if/else logic before execution.',
  content_body = E'# Lesson 1.2: Predict Program Output\n\n## Beginner Check-In\nBefore coding, explain what this branch does in your own words: `if temp < 50`.\n\n## Lesson Outcomes\n- Read an if/elif/else chain\n- Predict output before running tests\n- Implement branch logic correctly\n\n## Four-Method Learning Loop\n- **Spaced Repetition:** review function input/output from Lesson 1.1\n- **Active Recall:** predict `classify_temp(75)` before running\n- **Interleaving:** compare this branching logic to a grading rubric\n- **Deliberate Practice:** improve one line for readability after passing tests\n\n## Worked Example (python)\n```python\ndef classify_temp(temp):\n    if temp < 50:\n        return "cold"\n    if temp < 75:\n        return "warm"\n    return "hot"\n```\n\n## Reflection Prompt\nWhy does `75` return `"hot"` in this algorithm?',
  duration_minutes = 45,
  lesson_type = 'coding',
  is_published = true
WHERE l.id IN (SELECT id FROM target);

WITH target_lesson AS (
  SELECT l.id
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN public.courses c ON c.id = u.course_id
  WHERE (c.id = '00000000-0000-0000-0000-000000000010' OR lower(c.name) = 'ap computer science principles')
    AND COALESCE(u.unit_number, u.order_index) = 1
    AND COALESCE(l.lesson_number, l.order_index) = 2
)
UPDATE public.checkpoints c
SET
  title = 'Checkpoint 1.2: Conditional Classification',
  problem_description = E'## Objective\nImplement a simple conditional classifier for temperature labels.\n\n## Task\nComplete `classify_temp(temp)` with the exact logic below:\n- `< 50` -> `"cold"`\n- `< 75` -> `"warm"`\n- otherwise -> `"hot"`\n\n## Success Criteria\n- Uses ordered conditional checks\n- Produces exact expected strings\n- Passes visible and hidden tests',
  starter_code = E'def classify_temp(temp):\n    # TODO\n    return ""\n',
  solution_code = E'def classify_temp(temp):\n    if temp < 50:\n        return "cold"\n    if temp < 75:\n        return "warm"\n    return "hot"\n',
  test_cases = jsonb_build_array(
    jsonb_build_object('name', 'Visible test 1', 'input', '49', 'expected', '"cold"'),
    jsonb_build_object('name', 'Hidden test', 'input', '75', 'expected', '"hot"', 'hidden', true)
  ),
  difficulty = 'easy',
  concept_tags = ARRAY['conditionals','algorithm_tracing','control_flow']
WHERE c.lesson_id IN (SELECT id FROM target_lesson);

WITH target AS (
  SELECT l.id
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN public.courses c ON c.id = u.course_id
  WHERE (c.id = '00000000-0000-0000-0000-000000000010' OR lower(c.name) = 'ap computer science principles')
    AND COALESCE(u.unit_number, u.order_index) = 1
    AND COALESCE(l.lesson_number, l.order_index) = 3
)
UPDATE public.lessons l
SET
  title = 'Lesson 1.3: Reusable Functions and Clean Inputs',
  description = 'Use abstraction to clean input text and produce consistent output.',
  content_body = E'# Lesson 1.3: Reusable Functions\n\n## Lesson Outcomes\n- Explain why reusable helpers reduce bugs\n- Normalize user input into a standard format\n- Apply the four-method workflow independently\n\n## Four-Method Learning Loop\n- **Spaced Repetition:** restate one rule from Lesson 1.2\n- **Active Recall:** predict output for one messy name input\n- **Interleaving:** relate this cleanup pattern to form validation\n- **Deliberate Practice:** refactor for clarity without changing behavior\n\n## Worked Example (python)\n```python\ndef normalize_name(name):\n    return " ".join(name.strip().split()).title()\n```\n\n## Reflection Prompt\nWhy is normalization useful before storing data in a system?',
  duration_minutes = 50,
  lesson_type = 'coding',
  is_published = true
WHERE l.id IN (SELECT id FROM target);

WITH target_lesson AS (
  SELECT l.id
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN public.courses c ON c.id = u.course_id
  WHERE (c.id = '00000000-0000-0000-0000-000000000010' OR lower(c.name) = 'ap computer science principles')
    AND COALESCE(u.unit_number, u.order_index) = 1
    AND COALESCE(l.lesson_number, l.order_index) = 3
)
UPDATE public.checkpoints c
SET
  title = 'Checkpoint 1.3: Normalize Names',
  problem_description = E'## Objective\nCreate a reusable helper that cleans inconsistent user name input.\n\n## Task\nImplement `normalize_name(name)` to:\n1. Remove extra spaces at the beginning/end\n2. Collapse repeated spaces between words\n3. Return title case formatting\n\n## Success Criteria\n- Handles extra spaces\n- Handles mixed capitalization\n- Returns exact expected strings',
  starter_code = E'def normalize_name(name):\n    # TODO\n    return ""\n',
  solution_code = E'def normalize_name(name):\n    return " ".join(name.strip().split()).title()\n',
  test_cases = jsonb_build_array(
    jsonb_build_object('name', 'Visible test 1', 'input', '"  aLEx   johnSON  "', 'expected', '"Alex Johnson"'),
    jsonb_build_object('name', 'Hidden test', 'input', '"maria"', 'expected', '"Maria"', 'hidden', true)
  ),
  difficulty = 'easy',
  concept_tags = ARRAY['abstraction','functions','data_cleaning']
WHERE c.lesson_id IN (SELECT id FROM target_lesson);

COMMIT;
