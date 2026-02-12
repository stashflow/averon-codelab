-- AP CSP Depth Upgrade + Enrollment Schema Compatibility
-- Safe to run multiple times

BEGIN;

-- -------------------------------------------------------------------
-- 1) course_enrollments compatibility (fix schema cache drift errors)
-- -------------------------------------------------------------------
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS enrollment_source TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS current_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkpoints_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_enrollments_enrollment_source_check'
      AND conrelid = 'public.course_enrollments'::regclass
  ) THEN
    ALTER TABLE public.course_enrollments
      ADD CONSTRAINT course_enrollments_enrollment_source_check
      CHECK (enrollment_source IN ('direct', 'classroom', 'district', 'admin', 'teacher_grant'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_enrollments_status_check'
      AND conrelid = 'public.course_enrollments'::regclass
  ) THEN
    ALTER TABLE public.course_enrollments
      ADD CONSTRAINT course_enrollments_status_check
      CHECK (status IN ('active', 'paused', 'completed', 'dropped'));
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 2) schema compatibility for richer AP CSP content
-- -------------------------------------------------------------------
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS icon_name TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'high-school';

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS unit_number INTEGER,
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[],
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_number INTEGER,
  ADD COLUMN IF NOT EXISTS content_body TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'coding',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS problem_description TEXT,
  ADD COLUMN IF NOT EXISTS starter_code TEXT,
  ADD COLUMN IF NOT EXISTS solution_code TEXT,
  ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS concept_tags TEXT[];

-- -------------------------------------------------------------------
-- 3) canonical AP CSP course + full content reset for that course only
-- -------------------------------------------------------------------
INSERT INTO public.courses (
  id,
  name,
  description,
  language,
  difficulty_level,
  estimated_hours,
  is_active,
  level,
  icon_name,
  color,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'AP Computer Science Principles',
  'Comprehensive AP CSP pathway with rigorous programming, data systems, networking, cybersecurity, ethics, and Create Task preparation. Includes explicit spaced repetition, active recall, interleaving, and deliberate practice across every unit.',
  'python',
  'intermediate',
  180,
  true,
  'high-school',
  'GraduationCap',
  'from-cyan-500 to-blue-600',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  difficulty_level = EXCLUDED.difficulty_level,
  estimated_hours = EXCLUDED.estimated_hours,
  is_active = EXCLUDED.is_active,
  level = EXCLUDED.level,
  icon_name = EXCLUDED.icon_name,
  color = EXCLUDED.color;

DELETE FROM public.checkpoints c
USING public.lessons l, public.units u
WHERE c.lesson_id = l.id
  AND l.unit_id = u.id
  AND u.course_id = '00000000-0000-0000-0000-000000000010';

DELETE FROM public.lessons l
USING public.units u
WHERE l.unit_id = u.id
  AND u.course_id = '00000000-0000-0000-0000-000000000010';

DELETE FROM public.units
WHERE course_id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.units (
  id,
  course_id,
  unit_number,
  title,
  description,
  order_index,
  learning_objectives,
  is_published,
  created_at,
  updated_at
)
VALUES
(
  '71000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  1,
  'Unit 1: Computational Thinking and Program Design',
  'Build strong AP CSP foundations with decomposition, algorithm tracing, abstraction, and design tradeoffs.',
  1,
  ARRAY[
    'Break complex problems into structured components',
    'Trace and reason about algorithm behavior',
    'Design reusable abstractions',
    'Communicate algorithmic decisions clearly'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000010',
  2,
  'Unit 2: Data, Representation, and Privacy',
  'Move from raw bits to meaningful insights and ethical data practice.',
  2,
  ARRAY[
    'Interpret binary and data representation choices',
    'Evaluate data compression and storage tradeoffs',
    'Analyze privacy risk in data systems',
    'Use evidence-based reasoning with datasets'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000010',
  3,
  'Unit 3: Algorithms and Programming Patterns',
  'Develop rigorous coding fluency with variables, control flow, iteration, and list processing.',
  3,
  ARRAY[
    'Write clear procedural code',
    'Use conditionals and loops intentionally',
    'Apply list-based processing patterns',
    'Validate logic with tests and edge cases'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000010',
  4,
  'Unit 4: Networks, Reliability, and Cybersecurity',
  'Understand Internet systems, packet-based communication, resilience, and security fundamentals.',
  4,
  ARRAY[
    'Explain packet routing and Internet architecture',
    'Model reliability and fault tolerance strategies',
    'Apply practical cybersecurity habits',
    'Reason about tradeoffs in networked systems'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000010',
  5,
  'Unit 5: Responsible Computing and Societal Impact',
  'Study bias, fairness, governance, and the human impact of modern computing systems.',
  5,
  ARRAY[
    'Evaluate fairness and bias in algorithmic systems',
    'Make responsible design recommendations',
    'Analyze stakeholder impact and policy constraints',
    'Communicate technical decisions ethically'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000010',
  6,
  'Unit 6: AP Create Performance Task Studio',
  'Build, test, document, and refine a full Create Task with explicit rubric alignment.',
  6,
  ARRAY[
    'Scope a feasible project plan',
    'Iterate with measurable checkpoints',
    'Produce evidence for AP rubric rows',
    'Write concise and accurate written responses'
  ],
  true,
  NOW(),
  NOW()
);

WITH lesson_seed AS (
  SELECT *
  FROM (VALUES
    (1, 1, 'Computational Thinking and Decomposition', 'Map a problem into solvable parts and justify decomposition choices.', 'Spaced Repetition', 'python', 'Decomposition lets teams split complexity into independent components that can be implemented and tested in parallel.', E'def split_problem(problem):\n    parts = [p.strip() for p in problem.split(";") if p.strip()]\n    return parts\n', 'Implement split_problem(problem) so it returns trimmed non-empty task parts split by semicolons.', E'def split_problem(problem):\n    # TODO\n    return []\n', E'def split_problem(problem):\n    return [p.strip() for p in problem.split(";") if p.strip()]\n', '"login;profile;dashboard"', '["login", "profile", "dashboard"]', '"one;;two; three"', '["one", "two", "three"]', 'easy', ARRAY['decomposition','strings','abstraction']),
    (1, 2, 'Algorithm Tracing and Dry Runs', 'Trace conditional branches and predict outcomes before execution.', 'Active Recall', 'python', 'Algorithm tracing builds confidence by predicting results step by step before the program runs.', E'def classify_temp(temp):\n    if temp < 50:\n        return "cold"\n    if temp < 75:\n        return "warm"\n    return "hot"\n', 'Implement classify_temp(temp) using the described branch logic.', E'def classify_temp(temp):\n    # TODO\n    return ""\n', E'def classify_temp(temp):\n    if temp < 50:\n        return "cold"\n    if temp < 75:\n        return "warm"\n    return "hot"\n', '49', '"cold"', '75', '"hot"', 'easy', ARRAY['conditionals','tracing','control_flow']),
    (1, 3, 'Abstraction Through Reusable Functions', 'Design reusable helpers and explain why abstraction reduces errors.', 'Deliberate Practice', 'python', 'Abstraction standardizes repeated logic and reduces duplication across large programs.', E'def normalize_name(name):\n    return " ".join(name.strip().split()).title()\n', 'Implement normalize_name(name) to trim spacing and return title case output.', E'def normalize_name(name):\n    # TODO\n    return ""\n', E'def normalize_name(name):\n    return " ".join(name.strip().split()).title()\n', '"  aLEx   johnSON  "', '"Alex Johnson"', '"maria"', '"Maria"', 'medium', ARRAY['abstraction','functions','strings']),

    (2, 1, 'Binary Representation and Capacity', 'Reason about bit limits and storage capacity in realistic contexts.', 'Spaced Repetition', 'python', 'Binary capacity analysis helps engineers choose correct storage strategies early in design.', E'def bits_needed(max_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_value:\n        bits += 1\n    return bits\n', 'Implement bits_needed(max_value) to return minimal bits to store values from 0..max_value.', E'def bits_needed(max_value):\n    # TODO\n    return 0\n', E'def bits_needed(max_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_value:\n        bits += 1\n    return bits\n', '255', '8', '31', '5', 'medium', ARRAY['binary','data_representation','loops']),
    (2, 2, 'Compression Tradeoff Analysis', 'Compute compression ratios and evaluate whether quality tradeoffs are acceptable.', 'Interleaving', 'python', 'Compression strategy should combine mathematical reasoning with practical quality constraints.', E'def compression_ratio(original_kb, compressed_kb):\n    if original_kb == 0:\n        return 0\n    return round(compressed_kb / original_kb, 2)\n', 'Implement compression_ratio(original_kb, compressed_kb) rounded to 2 decimals.', E'def compression_ratio(original_kb, compressed_kb):\n    # TODO\n    return 0\n', E'def compression_ratio(original_kb, compressed_kb):\n    if original_kb == 0:\n        return 0\n    return round(compressed_kb / original_kb, 2)\n', '100,40', '0.4', '250,200', '0.8', 'medium', ARRAY['data_compression','math','tradeoffs']),
    (2, 3, 'Privacy Risk Scoring', 'Classify data-sharing scenarios by privacy risk.', 'Active Recall', 'python', 'Privacy analysis requires both numeric reasoning and ethical interpretation of sensitive data exposure.', E'def privacy_risk(shared_fields, sensitive_fields):\n    ratio = sensitive_fields / shared_fields if shared_fields else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', 'Implement privacy_risk(shared_fields, sensitive_fields) with low/medium/high classification.', E'def privacy_risk(shared_fields, sensitive_fields):\n    # TODO\n    return ""\n', E'def privacy_risk(shared_fields, sensitive_fields):\n    ratio = sensitive_fields / shared_fields if shared_fields else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', '10,1', '"low"', '10,6', '"high"', 'medium', ARRAY['privacy','ethics','classification']),

    (3, 1, 'Variables, Expressions, and State', 'Model evolving state with variables and clear expressions.', 'Spaced Repetition', 'python', 'State tracking helps you reason about how programs change over time.', E'def compute_total(price, tax_rate, discount):\n    subtotal = price - discount\n    total = subtotal + (subtotal * tax_rate)\n    return round(total, 2)\n', 'Implement compute_total(price, tax_rate, discount) and return rounded total.', E'def compute_total(price, tax_rate, discount):\n    # TODO\n    return 0\n', E'def compute_total(price, tax_rate, discount):\n    subtotal = price - discount\n    total = subtotal + (subtotal * tax_rate)\n    return round(total, 2)\n', '100,0.07,10', '96.3', '50,0.1,5', '49.5', 'easy', ARRAY['variables','expressions','state']),
    (3, 2, 'Selection and Iteration Lab', 'Use loops and branch logic together to evaluate lists of records.', 'Deliberate Practice', 'python', 'Combining iteration and selection is core to AP CSP algorithm design.', E'def count_passing(scores):\n    count = 0\n    for score in scores:\n        if score >= 70:\n            count += 1\n    return count\n', 'Implement count_passing(scores) where passing is >= 70.', E'def count_passing(scores):\n    # TODO\n    return 0\n', E'def count_passing(scores):\n    count = 0\n    for score in scores:\n        if score >= 70:\n            count += 1\n    return count\n', '[65,70,100,40]', '2', '[90,88,72]', '3', 'medium', ARRAY['selection','iteration','lists']),
    (3, 3, 'List Aggregation Patterns', 'Aggregate list data to produce concise summaries and metrics.', 'Interleaving', 'python', 'Aggregation patterns reappear throughout analytics, ML, and system monitoring.', E'def average_score(scores):\n    if not scores:\n        return 0\n    return round(sum(scores) / len(scores), 2)\n', 'Implement average_score(scores) returning rounded mean or 0 for empty input.', E'def average_score(scores):\n    # TODO\n    return 0\n', E'def average_score(scores):\n    if not scores:\n        return 0\n    return round(sum(scores) / len(scores), 2)\n', '[80,90,100]', '90.0', '[]', '0', 'medium', ARRAY['lists','aggregation','analytics']),

    (4, 1, 'Packet Routing Fundamentals', 'Model address classification and route decisions in a network context.', 'Active Recall', 'javascript', 'Packet routing depends on addressing rules and consistent decision logic at each hop.', E'function isLocalAddress(address) {\n  return address.startsWith("192.168.") || address.startsWith("10.");\n}\n', 'Implement isLocalAddress(address) for private network prefixes.', E'function isLocalAddress(address) {\n  // TODO\n  return false;\n}\n', E'function isLocalAddress(address) {\n  return address.startsWith("192.168.") || address.startsWith("10.");\n}\n', '"192.168.1.9"', 'true', '"8.8.8.8"', 'false', 'medium', ARRAY['networks','routing','javascript']),
    (4, 2, 'Reliability and Retry Strategy', 'Design retry behavior based on measured latency and failure risk.', 'Interleaving', 'javascript', 'Resilient systems pair retry logic with bounded limits to avoid cascading failures.', E'function retryCount(latencyMs) {\n  if (latencyMs < 100) return 1;\n  if (latencyMs < 300) return 2;\n  return 3;\n}\n', 'Implement retryCount(latencyMs) with 1/2/3 retry tiers.', E'function retryCount(latencyMs) {\n  // TODO\n  return 0;\n}\n', E'function retryCount(latencyMs) {\n  if (latencyMs < 100) return 1;\n  if (latencyMs < 300) return 2;\n  return 3;\n}\n', '80', '1', '350', '3', 'medium', ARRAY['reliability','fault_tolerance','javascript']),
    (4, 3, 'Cybersecurity Baseline Practices', 'Implement basic credential masking and explain why least exposure matters.', 'Deliberate Practice', 'python', 'Security-by-default starts with minimizing exposure of sensitive credentials and identifiers.', E'def mask_api_key(key):\n    if len(key) <= 6:\n        return "***"\n    return key[:4] + "***" + key[-2:]\n', 'Implement mask_api_key(key) to hide sensitive middle characters.', E'def mask_api_key(key):\n    # TODO\n    return ""\n', E'def mask_api_key(key):\n    if len(key) <= 6:\n        return "***"\n    return key[:4] + "***" + key[-2:]\n', '"ABCD123456ZZ"', '"ABCD***ZZ"', '"ABC"', '"***"', 'medium', ARRAY['cybersecurity','strings','privacy']),

    (5, 1, 'Fairness Metrics and Bias Signals', 'Translate fairness expectations into measurable checks.', 'Spaced Repetition', 'python', 'Responsible AI requires measurable criteria rather than intuition alone.', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', 'Implement fairness_flag(disparity) based on disparity threshold 0.2.', E'def fairness_flag(disparity):\n    # TODO\n    return ""\n', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', '0.1', '"acceptable"', '0.25', '"needs_review"', 'hard', ARRAY['fairness','bias','ethics']),
    (5, 2, 'Content Moderation Decision Rules', 'Build transparent rule-based moderation logic.', 'Active Recall', 'python', 'Transparent policies improve auditability and reduce inconsistent moderation outcomes.', E'def moderation_decision(flags, confidence):\n    if flags >= 3 and confidence >= 0.8:\n        return "block"\n    if flags >= 1:\n        return "review"\n    return "allow"\n', 'Implement moderation_decision(flags, confidence) for block/review/allow outcomes.', E'def moderation_decision(flags, confidence):\n    # TODO\n    return ""\n', E'def moderation_decision(flags, confidence):\n    if flags >= 3 and confidence >= 0.8:\n        return "block"\n    if flags >= 1:\n        return "review"\n    return "allow"\n', '0,0.5', '"allow"', '3,0.9', '"block"', 'hard', ARRAY['policy','ethics','decision_rules']),
    (5, 3, 'Open Source Collaboration Health', 'Compute collaboration quality from contribution metrics.', 'Interleaving', 'javascript', 'Sustainable software depends on maintainability signals and shared team ownership.', E'function collaborationScore(contributors, issuesClosed) {\n  return contributors * 2 + issuesClosed;\n}\n', 'Implement collaborationScore(contributors, issuesClosed).', E'function collaborationScore(contributors, issuesClosed) {\n  // TODO\n  return 0;\n}\n', E'function collaborationScore(contributors, issuesClosed) {\n  return contributors * 2 + issuesClosed;\n}\n', '4,10', '18', '1,2', '4', 'medium', ARRAY['open_source','collaboration','metrics']),

    (6, 1, 'Create Task Proposal and Scope', 'Transform broad ideas into a scoped AP Create Task plan.', 'Deliberate Practice', 'python', 'Project scope discipline keeps implementation realistic and rubric-aligned.', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return int(has_data) + int(has_algorithm) + int(has_testing)\n', 'Implement plan_checklist(has_data, has_algorithm, has_testing) returning completed criteria count.', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    # TODO\n    return 0\n', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return int(has_data) + int(has_algorithm) + int(has_testing)\n', 'true,true,false', '2', 'true,true,true', '3', 'medium', ARRAY['create_task','planning','rubric']),
    (6, 2, 'Iterative Build and Quality Gates', 'Use explicit quality gates while iterating on feature delivery.', 'Spaced Repetition', 'python', 'Iteration quality improves when each cycle has a measurable test and reflection target.', E'def iteration_grade(test_pass_rate, reflection_words):\n    if test_pass_rate >= 0.9 and reflection_words >= 80:\n        return "ready"\n    return "revise"\n', 'Implement iteration_grade(test_pass_rate, reflection_words) returning ready or revise.', E'def iteration_grade(test_pass_rate, reflection_words):\n    # TODO\n    return ""\n', E'def iteration_grade(test_pass_rate, reflection_words):\n    if test_pass_rate >= 0.9 and reflection_words >= 80:\n        return "ready"\n    return "revise"\n', '0.95,100', '"ready"', '0.7,120', '"revise"', 'hard', ARRAY['iteration','testing','quality']),
    (6, 3, 'Written Response Precision', 'Generate concise technical responses aligned to AP CSP rubric prompts.', 'Active Recall', 'python', 'Clear written explanation is part of technical mastery and AP scoring success.', E'def response_word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', 'Implement response_word_count(text) for AP written response draft checks.', E'def response_word_count(text):\n    # TODO\n    return 0\n', E'def response_word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', '"algorithm explains output"', '3', '""', '0', 'medium', ARRAY['communication','create_task','reflection'])
  ) AS t(
    unit_number,
    lesson_number,
    title,
    description,
    primary_method,
    language,
    concept_review,
    example_code,
    objective,
    starter_code,
    solution_code,
    test_input_1,
    expected_1,
    test_input_2,
    expected_2,
    difficulty,
    concept_tags
  )
),
lesson_rows AS (
  SELECT
    (
      '72000000-0000-' || lpad(unit_number::text, 4, '0') || '-' || lpad(lesson_number::text, 4, '0') || '-' || lpad((unit_number * 100 + lesson_number)::text, 12, '0')
    )::uuid AS lesson_id,
    (
      '71000000-0000-0000-0000-' || lpad(unit_number::text, 12, '0')
    )::uuid AS unit_id,
    unit_number,
    lesson_number,
    title,
    description,
    primary_method,
    language,
    concept_review,
    example_code,
    objective,
    starter_code,
    solution_code,
    test_input_1,
    expected_1,
    test_input_2,
    expected_2,
    difficulty,
    concept_tags
  FROM lesson_seed
)
INSERT INTO public.lessons (
  id,
  unit_id,
  lesson_number,
  order_index,
  title,
  description,
  content_type,
  content_body,
  duration_minutes,
  lesson_type,
  is_published,
  created_at,
  updated_at
)
SELECT
  lesson_id,
  unit_id,
  lesson_number,
  lesson_number,
  title,
  description,
  'text',
  format(
$md$
# %1$s

## Lesson Outcomes
- Explain and apply: %2$s
- Connect this concept to earlier AP CSP topics
- Produce a tested implementation with clear logic

## Four-Method Learning Loop
- **Primary Method:** %3$s
- **Spaced Repetition:** begin by restating one prior concept this lesson depends on
- **Active Recall:** predict output before running any code
- **Interleaving:** relate this task to a previous unit and explain the connection
- **Deliberate Practice:** revise after feedback and improve one measurable quality metric

## Concept Walkthrough
%4$s

## Worked Example (`%5$s`)
```%5$s
%6$s
```

## Reflection Prompt
What design tradeoff did you make and how would you justify it to a reviewer?

> [!NOTE]
> A submission is complete only when behavior is correct, readable, and test-validated.
$md$,
    title,
    description,
    primary_method,
    concept_review,
    language,
    example_code
  ),
  55,
  'coding',
  true,
  NOW(),
  NOW()
FROM lesson_rows;

WITH lesson_seed AS (
  SELECT *
  FROM (VALUES
    (1, 1, 'Implement split_problem(problem) so it returns trimmed non-empty task parts split by semicolons.', E'def split_problem(problem):\n    # TODO\n    return []\n', E'def split_problem(problem):\n    return [p.strip() for p in problem.split(";") if p.strip()]\n', '"login;profile;dashboard"', '["login", "profile", "dashboard"]', '"one;;two; three"', '["one", "two", "three"]', 'easy', ARRAY['decomposition','strings','abstraction']),
    (1, 2, 'Implement classify_temp(temp) using the described branch logic.', E'def classify_temp(temp):\n    # TODO\n    return ""\n', E'def classify_temp(temp):\n    if temp < 50:\n        return "cold"\n    if temp < 75:\n        return "warm"\n    return "hot"\n', '49', '"cold"', '75', '"hot"', 'easy', ARRAY['conditionals','tracing','control_flow']),
    (1, 3, 'Implement normalize_name(name) to trim spacing and return title case output.', E'def normalize_name(name):\n    # TODO\n    return ""\n', E'def normalize_name(name):\n    return " ".join(name.strip().split()).title()\n', '"  aLEx   johnSON  "', '"Alex Johnson"', '"maria"', '"Maria"', 'medium', ARRAY['abstraction','functions','strings']),
    (2, 1, 'Implement bits_needed(max_value) to return minimal bits to store values from 0..max_value.', E'def bits_needed(max_value):\n    # TODO\n    return 0\n', E'def bits_needed(max_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_value:\n        bits += 1\n    return bits\n', '255', '8', '31', '5', 'medium', ARRAY['binary','data_representation','loops']),
    (2, 2, 'Implement compression_ratio(original_kb, compressed_kb) rounded to 2 decimals.', E'def compression_ratio(original_kb, compressed_kb):\n    # TODO\n    return 0\n', E'def compression_ratio(original_kb, compressed_kb):\n    if original_kb == 0:\n        return 0\n    return round(compressed_kb / original_kb, 2)\n', '100,40', '0.4', '250,200', '0.8', 'medium', ARRAY['data_compression','math','tradeoffs']),
    (2, 3, 'Implement privacy_risk(shared_fields, sensitive_fields) with low/medium/high classification.', E'def privacy_risk(shared_fields, sensitive_fields):\n    # TODO\n    return ""\n', E'def privacy_risk(shared_fields, sensitive_fields):\n    ratio = sensitive_fields / shared_fields if shared_fields else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', '10,1', '"low"', '10,6', '"high"', 'medium', ARRAY['privacy','ethics','classification']),
    (3, 1, 'Implement compute_total(price, tax_rate, discount) and return rounded total.', E'def compute_total(price, tax_rate, discount):\n    # TODO\n    return 0\n', E'def compute_total(price, tax_rate, discount):\n    subtotal = price - discount\n    total = subtotal + (subtotal * tax_rate)\n    return round(total, 2)\n', '100,0.07,10', '96.3', '50,0.1,5', '49.5', 'easy', ARRAY['variables','expressions','state']),
    (3, 2, 'Implement count_passing(scores) where passing is >= 70.', E'def count_passing(scores):\n    # TODO\n    return 0\n', E'def count_passing(scores):\n    count = 0\n    for score in scores:\n        if score >= 70:\n            count += 1\n    return count\n', '[65,70,100,40]', '2', '[90,88,72]', '3', 'medium', ARRAY['selection','iteration','lists']),
    (3, 3, 'Implement average_score(scores) returning rounded mean or 0 for empty input.', E'def average_score(scores):\n    # TODO\n    return 0\n', E'def average_score(scores):\n    if not scores:\n        return 0\n    return round(sum(scores) / len(scores), 2)\n', '[80,90,100]', '90.0', '[]', '0', 'medium', ARRAY['lists','aggregation','analytics']),
    (4, 1, 'Implement isLocalAddress(address) for private network prefixes.', E'function isLocalAddress(address) {\n  // TODO\n  return false;\n}\n', E'function isLocalAddress(address) {\n  return address.startsWith("192.168.") || address.startsWith("10.");\n}\n', '"192.168.1.9"', 'true', '"8.8.8.8"', 'false', 'medium', ARRAY['networks','routing','javascript']),
    (4, 2, 'Implement retryCount(latencyMs) with 1/2/3 retry tiers.', E'function retryCount(latencyMs) {\n  // TODO\n  return 0;\n}\n', E'function retryCount(latencyMs) {\n  if (latencyMs < 100) return 1;\n  if (latencyMs < 300) return 2;\n  return 3;\n}\n', '80', '1', '350', '3', 'medium', ARRAY['reliability','fault_tolerance','javascript']),
    (4, 3, 'Implement mask_api_key(key) to hide sensitive middle characters.', E'def mask_api_key(key):\n    # TODO\n    return ""\n', E'def mask_api_key(key):\n    if len(key) <= 6:\n        return "***"\n    return key[:4] + "***" + key[-2:]\n', '"ABCD123456ZZ"', '"ABCD***ZZ"', '"ABC"', '"***"', 'medium', ARRAY['cybersecurity','strings','privacy']),
    (5, 1, 'Implement fairness_flag(disparity) based on disparity threshold 0.2.', E'def fairness_flag(disparity):\n    # TODO\n    return ""\n', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', '0.1', '"acceptable"', '0.25', '"needs_review"', 'hard', ARRAY['fairness','bias','ethics']),
    (5, 2, 'Implement moderation_decision(flags, confidence) for block/review/allow outcomes.', E'def moderation_decision(flags, confidence):\n    # TODO\n    return ""\n', E'def moderation_decision(flags, confidence):\n    if flags >= 3 and confidence >= 0.8:\n        return "block"\n    if flags >= 1:\n        return "review"\n    return "allow"\n', '0,0.5', '"allow"', '3,0.9', '"block"', 'hard', ARRAY['policy','ethics','decision_rules']),
    (5, 3, 'Implement collaborationScore(contributors, issuesClosed).', E'function collaborationScore(contributors, issuesClosed) {\n  // TODO\n  return 0;\n}\n', E'function collaborationScore(contributors, issuesClosed) {\n  return contributors * 2 + issuesClosed;\n}\n', '4,10', '18', '1,2', '4', 'medium', ARRAY['open_source','collaboration','metrics']),
    (6, 1, 'Implement plan_checklist(has_data, has_algorithm, has_testing) returning completed criteria count.', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    # TODO\n    return 0\n', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return int(has_data) + int(has_algorithm) + int(has_testing)\n', 'true,true,false', '2', 'true,true,true', '3', 'medium', ARRAY['create_task','planning','rubric']),
    (6, 2, 'Implement iteration_grade(test_pass_rate, reflection_words) returning ready or revise.', E'def iteration_grade(test_pass_rate, reflection_words):\n    # TODO\n    return ""\n', E'def iteration_grade(test_pass_rate, reflection_words):\n    if test_pass_rate >= 0.9 and reflection_words >= 80:\n        return "ready"\n    return "revise"\n', '0.95,100', '"ready"', '0.7,120', '"revise"', 'hard', ARRAY['iteration','testing','quality']),
    (6, 3, 'Implement response_word_count(text) for AP written response draft checks.', E'def response_word_count(text):\n    # TODO\n    return 0\n', E'def response_word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', '"algorithm explains output"', '3', '""', '0', 'medium', ARRAY['communication','create_task','reflection'])
  ) AS t(
    unit_number,
    lesson_number,
    objective,
    starter_code,
    solution_code,
    test_input_1,
    expected_1,
    test_input_2,
    expected_2,
    difficulty,
    concept_tags
  )
)
INSERT INTO public.checkpoints (
  id,
  lesson_id,
  title,
  problem_description,
  starter_code,
  solution_code,
  test_cases,
  points,
  order_index,
  difficulty,
  concept_tags,
  created_at
)
SELECT
  (
    '73000000-0000-' || lpad(unit_number::text, 4, '0') || '-' || lpad(lesson_number::text, 4, '0') || '-' || lpad((unit_number * 100 + lesson_number)::text, 12, '0')
  )::uuid,
  (
    '72000000-0000-' || lpad(unit_number::text, 4, '0') || '-' || lpad(lesson_number::text, 4, '0') || '-' || lpad((unit_number * 100 + lesson_number)::text, 12, '0')
  )::uuid,
  format('Checkpoint %s.%s', unit_number, lesson_number),
  format(
$task$
## Objective
%1$s

## Task
Use the provided starter code to implement the required behavior.

## Requirements
1. Keep the function signature unchanged.
2. Handle both standard and edge-case inputs.
3. Keep code readable and intentional.

## Success Criteria
- All visible tests pass.
- Hidden validation test also passes.
- Output matches expected format exactly.

## Validation
Run tests after each change. Improve clarity if tests pass but code is hard to follow.
$task$,
    objective
  ),
  starter_code,
  solution_code,
  jsonb_build_array(
    jsonb_build_object('input', test_input_1, 'expected', expected_1, 'name', 'Visible test 1'),
    jsonb_build_object('input', test_input_2, 'expected', expected_2, 'name', 'Hidden test', 'hidden', true)
  ),
  20 + (unit_number * 2) + lesson_number,
  1,
  difficulty,
  concept_tags,
  NOW()
FROM lesson_seed;

COMMIT;
