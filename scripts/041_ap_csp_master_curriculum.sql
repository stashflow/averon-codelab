-- AP CSP Master Curriculum Refresh
-- Full, standardized AP CSP path for all students
-- Safe to run multiple times

BEGIN;

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
  E'AP Computer Science Principles (AP CSP) is a broad, college-level introduction to modern computing.\n\nThis sequence aligns to Big Ideas 1-5 and repeatedly trains all six AP computational thinking practices through short notes pages, guided labs, independent practice, and AP-style checks.\n\nStudents begin as complete beginners, then progress toward AP Create Task readiness and final exam confidence through consistent use of Spaced Repetition, Active Recall, Interleaving, and Deliberate Practice.',
  'python',
  'beginner',
  160,
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
  '74000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  1,
  'Unit 1: Creative Development and Problem Solving',
  'Beginner-first onboarding into computational thinking, constraints, and iterative design.',
  1,
  ARRAY[
    'Write clear problem statements and constraints',
    'Design simple prototypes and revise with feedback',
    'Explain design choices using evidence',
    'Build confidence with short, low-pressure coding tasks'
  ],
  true,
  NOW(),
  NOW()
),
(
  '74000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000010',
  2,
  'Unit 2: Data - From Information to Insight',
  'Represent, clean, summarize, and reason with data while accounting for bias and privacy.',
  2,
  ARRAY[
    'Interpret simple data representations',
    'Summarize data with accurate metrics',
    'Make claim-evidence-reasoning statements',
    'Identify privacy and bias risks'
  ],
  true,
  NOW(),
  NOW()
),
(
  '74000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000010',
  3,
  'Unit 3: Algorithms and Programming - Core Patterns',
  'Develop algorithmic fluency through tracing, decomposition, and correctness checks.',
  3,
  ARRAY[
    'Trace and explain algorithm behavior',
    'Compare alternative solutions',
    'Use tests to validate correctness',
    'Reason about edge cases'
  ],
  true,
  NOW(),
  NOW()
),
(
  '74000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000010',
  4,
  'Unit 4: Programming Foundations',
  'Build with sequencing, selection, iteration, variables, and procedures.',
  4,
  ARRAY[
    'Write readable procedural programs',
    'Use conditionals and loops intentionally',
    'Handle input/output and state changes',
    'Debug with a repeatable method'
  ],
  true,
  NOW(),
  NOW()
),
(
  '74000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000010',
  5,
  'Unit 5: Abstraction, Lists, and Procedural Design',
  'Manage complexity through decomposition, lists, and reusable student-developed procedures.',
  5,
  ARRAY[
    'Use lists to manage collections of data',
    'Design reusable procedures with parameters',
    'Connect abstraction to maintainability',
    'Prepare for AP Create Task requirements'
  ],
  true,
  NOW(),
  NOW()
),
(
  '74000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000010',
  6,
  'Unit 6: Internet, Systems, and Networks',
  'Explain Internet architecture, reliability, and cybersecurity tradeoffs.',
  6,
  ARRAY[
    'Describe packets, routing, and protocols',
    'Evaluate reliability and fault tolerance',
    'Explain conceptual cybersecurity protections',
    'Analyze system design tradeoffs'
  ],
  true,
  NOW(),
  NOW()
),
(
  '74000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000010',
  7,
  'Unit 7: Impact of Computing and Innovation Analysis',
  'Evaluate computing innovations using stakeholder, ethics, and evidence frameworks.',
  7,
  ARRAY[
    'Assess benefits and harms of innovations',
    'Use evidence-based ethical reasoning',
    'Analyze accessibility and fairness concerns',
    'Communicate nuanced policy-aware positions'
  ],
  true,
  NOW(),
  NOW()
),
(
  '74000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000010',
  8,
  'Unit 8: Create Task Studio and Exam Prep',
  'Mini-create, full create workflow, written responses, and AP exam pacing practice.',
  8,
  ARRAY[
    'Build AP Create artifacts with rubric alignment',
    'Produce clear written algorithm explanations',
    'Run readiness checks before submission',
    'Practice AP-style time management'
  ],
  true,
  NOW(),
  NOW()
);

WITH lesson_seed AS (
  SELECT *
  FROM (VALUES
    (1, 1, 'Problem Statements and Constraints', 'Define solvable problems and non-negotiable constraints.', 'Big Idea 1: Creative Development', 'CTP 1: Computational Solution Design', 'Spaced Repetition', 'python', 'Good computing starts with a clear problem statement, measurable success criteria, and explicit constraints.', 'Convert a vague idea into a one-sentence problem statement and three constraints.', 'What is the user need?', 'What constraint matters most?', 'How will success be measured?', E'def summarize_problem(user_need, constraint):\n    return f"Need: {user_need} | Constraint: {constraint}"\n', 'Implement summarize_problem(user_need, constraint) with the exact output format.', E'def summarize_problem(user_need, constraint):\n    # TODO\n    return ""\n', E'def summarize_problem(user_need, constraint):\n    return f"Need: {user_need} | Constraint: {constraint}"\n', '"track homework","time"', '"Need: track homework | Constraint: time"', '"share notes","privacy"', '"Need: share notes | Constraint: privacy"', 'easy', ARRAY['problem_solving','constraints','strings']),
    (1, 2, 'User-Centered Design Basics', 'Prioritize user experience and clarity.', 'Big Idea 1: Creative Development', 'CTP 5: Computing Innovations', 'Active Recall', 'python', 'User-centered design means decisions are justified by user tasks, not developer preference.', 'Write criteria for a usable beginner interface and test against scenarios.', 'Who is the target learner?', 'What confusion could occur first?', 'How would you reduce one friction point?', E'def first_screen_message(audience):\n    return f"Welcome, {audience}! Let\'s build your first solution."\n', 'Implement first_screen_message(audience) with exact punctuation.', E'def first_screen_message(audience):\n    # TODO\n    return ""\n', E'def first_screen_message(audience):\n    return f"Welcome, {audience}! Let\'s build your first solution."\n', '"students"', '"Welcome, students! Let\'s build your first solution."', '"teachers"', '"Welcome, teachers! Let\'s build your first solution."', 'easy', ARRAY['design','users','strings']),
    (1, 3, 'Prototype and Feedback Loops', 'Use rapid iteration to improve ideas.', 'Big Idea 1: Creative Development', 'CTP 2: Algorithms and Program Development', 'Interleaving', 'python', 'Iteration quality improves when each cycle has one focused improvement target.', 'Track prototype revisions with concise notes and expected impact.', 'What changed this version?', 'Why is it better?', 'What evidence supports your revision?', E'def revision_note(version, change):\n    return f"v{version}: {change}"\n', 'Implement revision_note(version, change).', E'def revision_note(version, change):\n    # TODO\n    return ""\n', E'def revision_note(version, change):\n    return f"v{version}: {change}"\n', '2,"added clear labels"', '"v2: added clear labels"', '5,"reduced clicks"', '"v5: reduced clicks"', 'easy', ARRAY['iteration','feedback','formatting']),
    (1, 4, 'Revision Sprint and Communication', 'Communicate design decisions clearly.', 'Big Idea 1: Creative Development', 'CTP 6: Responsible Computing', 'Deliberate Practice', 'python', 'Communication quality is part of engineering quality; decisions should be understandable and defensible.', 'Write a concise decision summary with tradeoff language.', 'What tradeoff did you accept?', 'Who benefits most from this decision?', 'What risk remains?', E'def decision_summary(choice, tradeoff):\n    return f"Choice: {choice}; Tradeoff: {tradeoff}"\n', 'Implement decision_summary(choice, tradeoff).', E'def decision_summary(choice, tradeoff):\n    # TODO\n    return ""\n', E'def decision_summary(choice, tradeoff):\n    return f"Choice: {choice}; Tradeoff: {tradeoff}"\n', '"shorter form","less detail"', '"Choice: shorter form; Tradeoff: less detail"', '"strong password rules","more setup time"', '"Choice: strong password rules; Tradeoff: more setup time"', 'easy', ARRAY['communication','tradeoffs','design']),

    (2, 1, 'Data Representation Foundations', 'Connect raw representation choices to real outcomes.', 'Big Idea 2: Data', 'CTP 4: Code Analysis', 'Spaced Repetition', 'python', 'Representation decisions affect storage, interpretation, and downstream correctness.', 'Compare field formats and justify which is safer for reuse.', 'Why does format consistency matter?', 'What errors happen with inconsistent fields?', 'How can validation reduce risk?', E'def combine_fields(name, age):\n    return f"{name}:{age}"\n', 'Implement combine_fields(name, age).', E'def combine_fields(name, age):\n    # TODO\n    return ""\n', E'def combine_fields(name, age):\n    return f"{name}:{age}"\n', '"Ari",16', '"Ari:16"', '"Sam",18', '"Sam:18"', 'easy', ARRAY['data','representation','format']),
    (2, 2, 'Cleaning and Summarizing Data', 'Use simple transformations to improve reliability.', 'Big Idea 2: Data', 'CTP 2: Algorithms and Program Development', 'Active Recall', 'python', 'Data cleaning improves trustworthiness before any analysis step.', 'Normalize a small list of records and calculate a simple summary.', 'Which cleaning step is highest impact first?', 'What should happen for missing input?', 'How do you validate summary correctness?', E'def clean_score(score):\n    return max(0, min(100, score))\n', 'Implement clean_score(score) bounded to 0..100.', E'def clean_score(score):\n    # TODO\n    return 0\n', E'def clean_score(score):\n    return max(0, min(100, score))\n', '120', '100', '-8', '0', 'easy', ARRAY['data_cleaning','validation','bounds']),
    (2, 3, 'Claim-Evidence-Reasoning with Data', 'Support claims using explicit data evidence.', 'Big Idea 2: Data', 'CTP 1: Computational Solution Design', 'Interleaving', 'python', 'Reasoning quality depends on linking claims directly to measured evidence.', 'Generate a compact claim statement from two numeric inputs.', 'What is your claim sentence?', 'What evidence metric supports it?', 'What limitation should you disclose?', E'def claim_statement(metric, value):\n    return f"Claim: {metric} improved to {value}."\n', 'Implement claim_statement(metric, value).', E'def claim_statement(metric, value):\n    # TODO\n    return ""\n', E'def claim_statement(metric, value):\n    return f"Claim: {metric} improved to {value}."\n', '"attendance",92', '"Claim: attendance improved to 92."', '"completion",81', '"Claim: completion improved to 81."', 'medium', ARRAY['data_reasoning','claims','communication']),
    (2, 4, 'Bias and Privacy Risk Review', 'Evaluate ethical risks in dataset use.', 'Big Idea 2: Data', 'CTP 6: Responsible Computing', 'Deliberate Practice', 'python', 'Responsible data use includes bias checks and privacy-aware release decisions.', 'Rate risk level from simple exposure ratios.', 'Which field is sensitive?', 'What bias risk is present?', 'What mitigation could reduce harm?', E'def risk_label(exposed, total):\n    ratio = exposed / total if total else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', 'Implement risk_label(exposed, total).', E'def risk_label(exposed, total):\n    # TODO\n    return ""\n', E'def risk_label(exposed, total):\n    ratio = exposed / total if total else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', '1,10', '"low"', '6,10', '"high"', 'medium', ARRAY['ethics','privacy','bias']),

    (3, 1, 'Algorithm Design Patterns', 'Use sequencing and decomposition intentionally.', 'Big Idea 3: Algorithms and Programming', 'CTP 2: Algorithms and Program Development', 'Spaced Repetition', 'python', 'Algorithms become maintainable when each step has one clear purpose.', 'Break one multi-step task into named steps.', 'What step runs first?', 'Where might an edge case appear?', 'How do you verify each step?', E'def plan_steps(a, b):\n    return ["read", a, b, "return"]\n', 'Implement plan_steps(a, b).', E'def plan_steps(a, b):\n    # TODO\n    return []\n', E'def plan_steps(a, b):\n    return ["read", a, b, "return"]\n', '"x","y"', '["read", "x", "y", "return"]', '"n","m"', '["read", "n", "m", "return"]', 'easy', ARRAY['algorithms','decomposition','lists']),
    (3, 2, 'Tracing and Correctness Checks', 'Predict behavior before running programs.', 'Big Idea 3: Algorithms and Programming', 'CTP 4: Code Analysis', 'Active Recall', 'python', 'Tracing builds confidence and reduces random trial-and-error debugging.', 'Dry-run branch logic and confirm expected outputs.', 'Which branch is selected?', 'What value changes each step?', 'What input reveals a hidden bug?', E'def classify(value):\n    if value < 0:\n        return "neg"\n    if value == 0:\n        return "zero"\n    return "pos"\n', 'Implement classify(value).', E'def classify(value):\n    # TODO\n    return ""\n', E'def classify(value):\n    if value < 0:\n        return "neg"\n    if value == 0:\n        return "zero"\n    return "pos"\n', '-1', '"neg"', '0', '"zero"', 'easy', ARRAY['tracing','conditionals','analysis']),
    (3, 3, 'Comparing Solution Approaches', 'Evaluate algorithm tradeoffs.', 'Big Idea 3: Algorithms and Programming', 'CTP 1: Computational Solution Design', 'Interleaving', 'python', 'Multiple correct algorithms can differ in readability and maintainability.', 'Choose between two approaches and justify your choice.', 'Which solution is clearer?', 'Which is easier to test?', 'Which handles growth better?', E'def choose_shorter(a, b):\n    return a if len(a) <= len(b) else b\n', 'Implement choose_shorter(a, b).', E'def choose_shorter(a, b):\n    # TODO\n    return ""\n', E'def choose_shorter(a, b):\n    return a if len(a) <= len(b) else b\n', '"cat","mouse"', '"cat"', '"plane","car"', '"car"', 'medium', ARRAY['tradeoffs','strings','comparison']),
    (3, 4, 'Simulation Logic Basics', 'Model systems with simple iterative rules.', 'Big Idea 3: Algorithms and Programming', 'CTP 2: Algorithms and Program Development', 'Deliberate Practice', 'python', 'Simulation tasks develop algorithm fluency for AP-style problem contexts.', 'Update state variables over repeated steps.', 'Which variable stores state?', 'How many iterations run?', 'What stopping condition is safe?', E'def simulate_growth(value, steps):\n    for _ in range(steps):\n        value += 2\n    return value\n', 'Implement simulate_growth(value, steps).', E'def simulate_growth(value, steps):\n    # TODO\n    return 0\n', E'def simulate_growth(value, steps):\n    for _ in range(steps):\n        value += 2\n    return value\n', '1,3', '7', '5,0', '5', 'medium', ARRAY['simulation','loops','state']),

    (4, 1, 'Variables and Expressions', 'Track evolving program state safely.', 'Big Idea 3: Algorithms and Programming', 'CTP 2: Algorithms and Program Development', 'Spaced Repetition', 'python', 'Correct state updates are foundational for every larger programming task.', 'Compute derived values from multiple inputs.', 'Which value is intermediate?', 'Where should rounding happen?', 'How do you avoid side effects?', E'def net_price(price, discount):\n    return price - discount\n', 'Implement net_price(price, discount).', E'def net_price(price, discount):\n    # TODO\n    return 0\n', E'def net_price(price, discount):\n    return price - discount\n', '100,15', '85', '40,5', '35', 'easy', ARRAY['variables','expressions','state']),
    (4, 2, 'Selection with Conditionals', 'Apply branch logic intentionally.', 'Big Idea 3: Algorithms and Programming', 'CTP 4: Code Analysis', 'Active Recall', 'python', 'Conditionals should be explicit, readable, and exhaustive for expected cases.', 'Implement a deterministic decision rule.', 'What threshold defines each category?', 'Which case is default?', 'How can tests expose ordering mistakes?', E'def pass_fail(score):\n    return "pass" if score >= 70 else "fail"\n', 'Implement pass_fail(score).', E'def pass_fail(score):\n    # TODO\n    return ""\n', E'def pass_fail(score):\n    return "pass" if score >= 70 else "fail"\n', '70', '"pass"', '69', '"fail"', 'easy', ARRAY['conditionals','selection','logic']),
    (4, 3, 'Iteration with Loops', 'Repeat logic safely and clearly.', 'Big Idea 3: Algorithms and Programming', 'CTP 2: Algorithms and Program Development', 'Interleaving', 'python', 'Iteration is most effective with clear loop invariants and exit conditions.', 'Count qualifying values in a list.', 'What condition increments count?', 'What happens for empty lists?', 'How can off-by-one errors appear?', E'def count_even(values):\n    count = 0\n    for value in values:\n        if value % 2 == 0:\n            count += 1\n    return count\n', 'Implement count_even(values).', E'def count_even(values):\n    # TODO\n    return 0\n', E'def count_even(values):\n    count = 0\n    for value in values:\n        if value % 2 == 0:\n            count += 1\n    return count\n', '[1,2,3,4]', '2', '[]', '0', 'medium', ARRAY['loops','iteration','lists']),
    (4, 4, 'Procedures and Parameters', 'Build reusable procedures with clear inputs.', 'Big Idea 3: Algorithms and Programming', 'CTP 3: Abstraction in Program Development', 'Deliberate Practice', 'python', 'Procedures reduce duplication and improve maintainability when parameterized well.', 'Write a reusable helper with two parameters.', 'Why is parameter naming important?', 'How can one procedure serve many cases?', 'What makes a helper reusable?', E'def format_result(name, score):\n    return f"{name}: {score}"\n', 'Implement format_result(name, score).', E'def format_result(name, score):\n    # TODO\n    return ""\n', E'def format_result(name, score):\n    return f"{name}: {score}"\n', '"Ava",90', '"Ava: 90"', '"Noah",77', '"Noah: 77"', 'medium', ARRAY['procedures','parameters','abstraction']),

    (5, 1, 'List Operations and Purpose', 'Use lists to reduce repetitive state handling.', 'Big Idea 3: Algorithms and Programming', 'CTP 3: Abstraction in Program Development', 'Spaced Repetition', 'python', 'Lists enable scalable logic for groups of related values.', 'Extract the first item safely from an input list.', 'What should happen for empty lists?', 'Why is list access risky without checks?', 'What abstraction does a list provide?', E'def first_item(items):\n    return items[0] if items else None\n', 'Implement first_item(items).', E'def first_item(items):\n    # TODO\n    return None\n', E'def first_item(items):\n    return items[0] if items else None\n', '["a","b"]', '"a"', '[]', 'None', 'easy', ARRAY['lists','abstraction','safety']),
    (5, 2, 'Aggregating List Data', 'Compute useful summaries from collections.', 'Big Idea 3: Algorithms and Programming', 'CTP 2: Algorithms and Program Development', 'Active Recall', 'python', 'Aggregation patterns appear across analytics, simulations, and monitoring.', 'Compute average with empty-list protection.', 'What denominator is used?', 'How is empty input handled?', 'Where should rounding occur?', E'def avg(values):\n    if not values:\n        return 0\n    return round(sum(values) / len(values), 2)\n', 'Implement avg(values).', E'def avg(values):\n    # TODO\n    return 0\n', E'def avg(values):\n    if not values:\n        return 0\n    return round(sum(values) / len(values), 2)\n', '[80,90,100]', '90.0', '[]', '0', 'medium', ARRAY['lists','aggregation','math']),
    (5, 3, 'Student-Developed Procedure Design', 'Meet AP Create procedure expectations.', 'Big Idea 3: Algorithms and Programming', 'CTP 3: Abstraction in Program Development', 'Interleaving', 'python', 'A student-developed procedure should include sequencing, selection, and iteration in meaningful logic.', 'Implement bounded score adjustment with reusable procedure logic.', 'Where is sequencing visible?', 'Which selection rule applies?', 'Where does iteration appear?', E'def adjust_scores(scores, bonus, limit):\n    output = []\n    for score in scores:\n        updated = score + bonus\n        if updated > limit:\n            updated = limit\n        output.append(updated)\n    return output\n', 'Implement adjust_scores(scores, bonus, limit).', E'def adjust_scores(scores, bonus, limit):\n    # TODO\n    return []\n', E'def adjust_scores(scores, bonus, limit):\n    output = []\n    for score in scores:\n        updated = score + bonus\n        if updated > limit:\n            updated = limit\n        output.append(updated)\n    return output\n', '[70,98],5,100', '[75, 100]', '[50],10,55', '[55]', 'medium', ARRAY['create_task','procedures','lists']),
    (5, 4, 'Mini-Create Rehearsal', 'Integrate lists + procedure + explanation.', 'Big Idea 3: Algorithms and Programming', 'CTP 1: Computational Solution Design', 'Deliberate Practice', 'python', 'Mini-create rehearsals reduce pressure before official Create Task windows.', 'Build a small but complete feature and explain one design tradeoff.', 'Which requirement does your procedure satisfy?', 'How does list use manage complexity?', 'What would you improve next iteration?', E'def progress_label(completed, total):\n    if total == 0:\n        return "0%"\n    percent = round((completed / total) * 100)\n    return f"{percent}%"\n', 'Implement progress_label(completed, total).', E'def progress_label(completed, total):\n    # TODO\n    return ""\n', E'def progress_label(completed, total):\n    if total == 0:\n        return "0%"\n    percent = round((completed / total) * 100)\n    return f"{percent}%"\n', '3,4', '"75%"', '0,0', '"0%"', 'medium', ARRAY['create_task','procedures','communication']),

    (6, 1, 'Packets and Routing Concepts', 'Explain conceptual Internet data flow.', 'Big Idea 4: Computer Systems and Networks', 'CTP 5: Computing Innovations', 'Spaced Repetition', 'javascript', 'Internet communication breaks messages into packets routed across many devices.', 'Classify local/private addresses with deterministic rules.', 'What is a private address?', 'Why are packets routed in parts?', 'How does redundancy increase reliability?', E'function isPrivateAddress(address) {\n  return address.startsWith("192.168.") || address.startsWith("10.");\n}\n', 'Implement isPrivateAddress(address).', E'function isPrivateAddress(address) {\n  // TODO\n  return false;\n}\n', E'function isPrivateAddress(address) {\n  return address.startsWith("192.168.") || address.startsWith("10.");\n}\n', '"192.168.1.9"', 'true', '"8.8.8.8"', 'false', 'medium', ARRAY['networks','routing','javascript']),
    (6, 2, 'Protocol Reliability Decisions', 'Reason about protocol and reliability tradeoffs.', 'Big Idea 4: Computer Systems and Networks', 'CTP 1: Computational Solution Design', 'Active Recall', 'javascript', 'Reliability decisions depend on use case, latency tolerance, and loss handling.', 'Choose retry tier based on latency thresholds.', 'What latency tier is acceptable?', 'When should retries be capped?', 'Why avoid unbounded retries?', E'function retryTier(latencyMs) {\n  if (latencyMs < 100) return 1;\n  if (latencyMs < 300) return 2;\n  return 3;\n}\n', 'Implement retryTier(latencyMs).', E'function retryTier(latencyMs) {\n  // TODO\n  return 0;\n}\n', E'function retryTier(latencyMs) {\n  if (latencyMs < 100) return 1;\n  if (latencyMs < 300) return 2;\n  return 3;\n}\n', '80', '1', '350', '3', 'medium', ARRAY['reliability','protocols','javascript']),
    (6, 3, 'Cybersecurity Basics and Least Exposure', 'Apply conceptual security hygiene rules.', 'Big Idea 4: Computer Systems and Networks', 'CTP 6: Responsible Computing', 'Interleaving', 'python', 'Least exposure reduces risk by minimizing unnecessary data visibility.', 'Mask credentials while preserving short identifiers.', 'Which part of a secret can be safely shown?', 'Why does masking reduce breach impact?', 'What policy enforces least privilege?', E'def mask_token(token):\n    if len(token) <= 6:\n        return "***"\n    return token[:4] + "***" + token[-2:]\n', 'Implement mask_token(token).', E'def mask_token(token):\n    # TODO\n    return ""\n', E'def mask_token(token):\n    if len(token) <= 6:\n        return "***"\n    return token[:4] + "***" + token[-2:]\n', '"ABCD123456ZZ"', '"ABCD***ZZ"', '"ABC"', '"***"', 'medium', ARRAY['cybersecurity','privacy','strings']),
    (6, 4, 'Network Failure Scenario Analysis', 'Evaluate tradeoffs in system failure responses.', 'Big Idea 4: Computer Systems and Networks', 'CTP 4: Code Analysis', 'Deliberate Practice', 'python', 'Resilient designs plan for partial failure and graceful recovery.', 'Classify uptime category from service availability ratio.', 'What threshold is mission-critical?', 'How do you report degraded service?', 'What fallback behavior protects users?', E'def uptime_label(uptime):\n    if uptime >= 0.999:\n        return "excellent"\n    if uptime >= 0.99:\n        return "good"\n    return "review"\n', 'Implement uptime_label(uptime).', E'def uptime_label(uptime):\n    # TODO\n    return ""\n', E'def uptime_label(uptime):\n    if uptime >= 0.999:\n        return "excellent"\n    if uptime >= 0.99:\n        return "good"\n    return "review"\n', '0.999', '"excellent"', '0.95', '"review"', 'medium', ARRAY['networks','fault_tolerance','analysis']),

    (7, 1, 'Stakeholder Impact Mapping', 'Identify who benefits and who may be harmed.', 'Big Idea 5: Impact of Computing', 'CTP 6: Responsible Computing', 'Spaced Repetition', 'python', 'Impact analysis starts with identifying stakeholders and unequal risk distribution.', 'Generate a concise stakeholder impact statement.', 'Who receives direct benefit?', 'Who carries risk?', 'What mitigation is feasible?', E'def impact_statement(innovation, stakeholder):\n    return f"{innovation} affects {stakeholder}."\n', 'Implement impact_statement(innovation, stakeholder).', E'def impact_statement(innovation, stakeholder):\n    # TODO\n    return ""\n', E'def impact_statement(innovation, stakeholder):\n    return f"{innovation} affects {stakeholder}."\n', '"Facial recognition","students"', '"Facial recognition affects students."', '"Recommendation system","teachers"', '"Recommendation system affects teachers."', 'medium', ARRAY['stakeholders','ethics','impact']),
    (7, 2, 'Bias and Fairness Signals', 'Classify fairness risk from disparity values.', 'Big Idea 5: Impact of Computing', 'CTP 6: Responsible Computing', 'Active Recall', 'python', 'Fairness analysis must be measurable and revisitable over time.', 'Flag systems needing fairness review.', 'What disparity threshold triggers action?', 'What evidence supports your claim?', 'How often should fairness be re-evaluated?', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', 'Implement fairness_flag(disparity).', E'def fairness_flag(disparity):\n    # TODO\n    return ""\n', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', '0.1', '"acceptable"', '0.25', '"needs_review"', 'medium', ARRAY['fairness','bias','metrics']),
    (7, 3, 'Innovation Reading Passage Practice', 'Analyze AP-style innovation prompts.', 'Big Idea 5: Impact of Computing', 'CTP 5: Computing Innovations', 'Interleaving', 'python', 'AP innovation questions reward evidence-based reasoning, not opinion-only claims.', 'Classify recommendation from risk score and benefit score.', 'What claim is evidence-backed?', 'What limitation must be acknowledged?', 'How would policy change outcomes?', E'def recommendation(risk, benefit):\n    if benefit > risk:\n        return "pilot"\n    return "rework"\n', 'Implement recommendation(risk, benefit).', E'def recommendation(risk, benefit):\n    # TODO\n    return ""\n', E'def recommendation(risk, benefit):\n    if benefit > risk:\n        return "pilot"\n    return "rework"\n', '2,5', '"pilot"', '7,4', '"rework"', 'medium', ARRAY['innovation','evidence','decision_making']),
    (7, 4, 'Ethical Tradeoff Argument Writing', 'Write concise, balanced ethical arguments.', 'Big Idea 5: Impact of Computing', 'CTP 6: Responsible Computing', 'Deliberate Practice', 'python', 'Strong ethical arguments include tradeoffs, affected groups, and practical mitigations.', 'Build concise argument templates with explicit tradeoff language.', 'What is the strongest counterargument?', 'Which mitigation is realistic now?', 'How do you communicate uncertainty clearly?', E'def tradeoff_argument(benefit, harm):\n    return f"Benefit: {benefit}; Harm: {harm}"\n', 'Implement tradeoff_argument(benefit, harm).', E'def tradeoff_argument(benefit, harm):\n    # TODO\n    return ""\n', E'def tradeoff_argument(benefit, harm):\n    return f"Benefit: {benefit}; Harm: {harm}"\n', '"faster triage","privacy risk"', '"Benefit: faster triage; Harm: privacy risk"', '"better access","bias risk"', '"Benefit: better access; Harm: bias risk"', 'medium', ARRAY['ethics','writing','communication']),

    (8, 1, 'Create Task Scope and Planning', 'Select a feasible project and plan milestones.', 'Big Idea 1 + Big Idea 3 Integration', 'CTP 1: Computational Solution Design', 'Spaced Repetition', 'python', 'Create Task success starts with scope discipline and clear milestone planning.', 'Evaluate whether a proposal meets required create components.', 'Does the plan include a list?', 'Does it include a student-developed procedure?', 'Is testing evidence planned?', E'def create_checklist(has_list, has_procedure, has_testing):\n    return int(has_list) + int(has_procedure) + int(has_testing)\n', 'Implement create_checklist(has_list, has_procedure, has_testing).', E'def create_checklist(has_list, has_procedure, has_testing):\n    # TODO\n    return 0\n', E'def create_checklist(has_list, has_procedure, has_testing):\n    return int(has_list) + int(has_procedure) + int(has_testing)\n', 'true,true,false', '2', 'true,true,true', '3', 'medium', ARRAY['create_task','planning','rubric']),
    (8, 2, 'Artifact Quality Gates', 'Use quality gates before final submission.', 'Big Idea 3: Algorithms and Programming', 'CTP 4: Code Analysis', 'Active Recall', 'python', 'Quality gates reduce last-minute submission risk and improve artifact clarity.', 'Decide if submission is ready based on pass rate and explanation completeness.', 'What is the minimum pass threshold?', 'How many explanation words are needed?', 'What issue blocks readiness?', E'def ready_for_submit(pass_rate, words):\n    if pass_rate >= 0.9 and words >= 80:\n        return "ready"\n    return "revise"\n', 'Implement ready_for_submit(pass_rate, words).', E'def ready_for_submit(pass_rate, words):\n    # TODO\n    return ""\n', E'def ready_for_submit(pass_rate, words):\n    if pass_rate >= 0.9 and words >= 80:\n        return "ready"\n    return "revise"\n', '0.95,100', '"ready"', '0.7,120', '"revise"', 'medium', ARRAY['quality','create_task','testing']),
    (8, 3, 'Written Response Precision', 'Answer AP-style written prompts clearly.', 'Big Idea 3: Algorithms and Programming', 'CTP 4: Code Analysis', 'Interleaving', 'python', 'Written response clarity matters as much as code correctness for AP performance.', 'Check draft length and concise structure.', 'Does your response explain algorithm steps?', 'Did you reference your own procedure?', 'Where can wording be clearer?', E'def word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', 'Implement word_count(text).', E'def word_count(text):\n    # TODO\n    return 0\n', E'def word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', '"algorithm explains output"', '3', '""', '0', 'easy', ARRAY['create_task','writing','reflection']),
    (8, 4, 'Final AP Exam Pacing Drill', 'Practice AP format pacing and strategy.', 'All Big Ideas', 'CTP 4 + CTP 6 Integration', 'Deliberate Practice', 'python', 'Exam readiness improves when strategy is rehearsed under timed constraints.', 'Recommend strategy based on pace metrics and confidence.', 'Which section needs pacing improvement?', 'What strategy reduces panic?', 'What should be reviewed last?', E'def pacing_status(questions_done, minutes_used):\n    if minutes_used == 0:\n        return "start"\n    rate = questions_done / minutes_used\n    return "on_track" if rate >= 0.5 else "adjust"\n', 'Implement pacing_status(questions_done, minutes_used).', E'def pacing_status(questions_done, minutes_used):\n    # TODO\n    return ""\n', E'def pacing_status(questions_done, minutes_used):\n    if minutes_used == 0:\n        return "start"\n    rate = questions_done / minutes_used\n    return "on_track" if rate >= 0.5 else "adjust"\n', '40,60', '"on_track"', '10,40', '"adjust"', 'medium', ARRAY['exam_prep','strategy','pacing'])
  ) AS t(
    unit_number,
    lesson_number,
    title,
    description,
    big_idea,
    ct_practice,
    primary_method,
    language,
    notes_page_1,
    notes_page_2,
    question_1,
    question_2,
    question_3,
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
      '75000000-0000-' || lpad(unit_number::text, 4, '0') || '-' || lpad(lesson_number::text, 4, '0') || '-' || lpad((unit_number * 100 + lesson_number)::text, 12, '0')
    )::uuid AS lesson_id,
    (
      '74000000-0000-0000-0000-' || lpad(unit_number::text, 12, '0')
    )::uuid AS unit_id,
    *
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

## AP Alignment
- **%2$s**
- **%3$s**

## Notes Page 1: Core Notes
%4$s

## Notes Page 2: Practice Notes
%5$s

## Four-Method Learning Loop
- **Primary Method:** %6$s
- **Spaced Repetition:** Restate one key idea from the previous lesson before coding.
- **Active Recall:** Predict one output before running tests.
- **Interleaving:** Connect this lesson to one concept from a different unit.
- **Deliberate Practice:** Improve one quality metric (clarity, naming, structure) after feedback.

## Quick Questions
- Q: %7$s
- Q: %8$s
- Q: %9$s

## Guided Example (`%10$s`)
```%10$s
%11$s
```

## Lab Objective
%12$s

## Success Criteria
- Function signature remains unchanged.
- Visible tests pass.
- Hidden test passes.
- Output format matches exactly.
$md$,
    title,
    big_idea,
    ct_practice,
    notes_page_1,
    notes_page_2,
    primary_method,
    question_1,
    question_2,
    question_3,
    language,
    example_code,
    objective
  ),
  45,
  'coding',
  true,
  NOW(),
  NOW()
FROM lesson_rows;

WITH lesson_seed AS (
  SELECT *
  FROM lesson_rows
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
    '76000000-0000-' || lpad(unit_number::text, 4, '0') || '-' || lpad(lesson_number::text, 4, '0') || '-' || lpad((unit_number * 100 + lesson_number)::text, 12, '0')
  )::uuid,
  lesson_id,
  format('Checkpoint %s.%s', unit_number, lesson_number),
  format(
$task$
## Objective
%1$s

## Task
Use the starter code to produce the required behavior.

## Requirements
1. Keep the function name and parameter list unchanged.
2. Match output formatting exactly.
3. Handle both provided test scenarios.

## Method Quality Check
Use %2$s deliberately while solving:
- Plan before editing.
- Test after each meaningful change.
- Revise one readability issue after tests pass.
$task$,
    objective,
    primary_method
  ),
  starter_code,
  solution_code,
  jsonb_build_array(
    jsonb_build_object('input', test_input_1, 'expected', expected_1, 'name', 'Visible test 1'),
    jsonb_build_object('input', test_input_2, 'expected', expected_2, 'name', 'Hidden test', 'hidden', true)
  ),
  20 + unit_number + lesson_number,
  1,
  difficulty,
  concept_tags,
  NOW()
FROM lesson_seed;

COMMIT;
