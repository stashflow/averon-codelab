-- AP CSP Longer Beginner Path Rewrite
-- Canonical AP CSP content rewrite for the live beginner-first experience.
-- Starts at Hello World fundamentals, then grows gradually to AP CSP applications.
-- Keeps lessons concrete, less open-ended, and test-focused.
-- Safe to run multiple times.

BEGIN;

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
  description = 'Beginner-first AP CSP path that starts at Hello World, builds confidence through tiny concrete wins, and then scales to data, networks, cybersecurity, and Create Task readiness.'
FROM ap_course ac
WHERE c.id = ac.id;

CREATE TEMP TABLE pg_temp.ap_csp_long_beginner_seed ON COMMIT DROP AS
SELECT *
FROM (VALUES
  (1, 'Hello, World and Your First Run', 'Open the IDE and run your first Python program.', 'Print exactly: Hello, World!', 'none', 'exact text output', E'START\nOUTPUT "Hello, World!"\nEND', E'print("Hello, World!")', 'Change the text to: Hello, AP CSP!', 'What does print() do?', 'Why must spelling and punctuation be exact?', 'What output should appear after one run?'),
  (2, 'Variables Store Values', 'Use variables like labels in a gradebook app.', 'Store name and score, then print one sentence.', 'name (text), score (number)', 'formatted sentence', E'START\nSET name <- "Ava"\nSET score <- 92\nOUTPUT "Name: " + name + ", Score: " + score\nEND', E'name = "Ava"\nscore = 92\nprint(f"Name: {name}, Score: {score}")', 'Try with a different name and score.', 'What is a variable?', 'Why store score as a number?', 'What changes when only variable values change?'),
  (3, 'Input and Output Patterns', 'Read a value and show a transformed value.', 'Read a number and print number + 1.', 'number', 'incremented number', E'START\nREAD number\nSET result <- number + 1\nOUTPUT result\nEND', E'number = 7\nresult = number + 1\nprint(result)  # 8', 'Try 0 and -3.', 'What is input?', 'What is output?', 'Why compute before output?'),
  (4, 'Functions: Reusable Code Blocks', 'Create one small function for repeated work.', 'Build double_value(x) that returns x*2.', 'x (number)', 'number', E'START\nDEFINE double_value(x)\nRETURN x * 2\nEND', E'def double_value(x):\n    return x * 2\n\nprint(double_value(6))  # 12', 'Test with 1, 10, and 0.', 'Why return instead of print in functions?', 'What is a parameter?', 'How does function reuse save time?'),
  (5, 'Conditionals with Clear Rules', 'Use if/else like a pass/fail status badge.', 'Return "pass" for score >= 70 else "support".', 'score', 'status label', E'START\nREAD score\nIF score >= 70 OUTPUT "pass"\nELSE OUTPUT "support"\nEND', E'def pass_status(score):\n    if score >= 70:\n        return "pass"\n    return "support"', 'Try 69, 70, and 100.', 'Why does >= matter here?', 'What is the else branch for?', 'How many valid outputs exist?'),
  (6, 'Loops for Repeated Work', 'Use a loop instead of duplicated lines.', 'Count how many even numbers are in a list.', 'list of numbers', 'count', E'START\nSET count <- 0\nFOR each n in numbers\n  IF n MOD 2 = 0 THEN count <- count + 1\nOUTPUT count\nEND', E'def count_even(numbers):\n    count = 0\n    for n in numbers:\n        if n % 2 == 0:\n            count += 1\n    return count', 'Try [] and [2,4,6].', 'What does n % 2 == 0 mean?', 'Why start count at 0?', 'What happens with an empty list?'),
  (7, 'Strings in Real Apps', 'Normalize text like usernames in social apps.', 'Trim spaces, lowercase text, join words with _.', 'name text', 'normalized text', E'START\nREAD name\nSET words <- split(trim(lower(name)))\nOUTPUT join(words, "_")\nEND', E'def normalize_username(name):\n    return "_".join(name.strip().lower().split())', 'Try "  MIA   K  " and "Noah".', 'Why call strip() first?', 'What does lower() guarantee?', 'Why normalize user input?'),
  (8, 'Lists and Aggregation', 'Use a loop to combine many values.', 'Compute total points from results W/D/L.', 'results list', 'total points', E'START\nSET points <- 0\nFOR each result in results\n  IF result = "W" THEN points <- points + 3\n  ELSE IF result = "D" THEN points <- points + 1\nOUTPUT points\nEND', E'def match_points(results):\n    points = 0\n    for result in results:\n        if result == "W":\n            points += 3\n        elif result == "D":\n            points += 1\n    return points', 'Try ["W","D","L"] and [].', 'Why does L add 0?', 'Why use elif for D?', 'What is one edge case for this function?'),
  (9, 'Algorithm Tracing', 'Trace line-by-line like the AP exam expects.', 'Predict output for a short function before running.', 'function + input', 'predicted output', E'START\nREAD input\nTRACE each step\nWRITE final output\nEND', E'def bump(x):\n    x = x + 2\n    return x * 3\n\nprint(bump(4))  # 18', 'Trace bump(0) on paper first.', 'What is tracing?', 'Why trace before run?', 'Which line changes x first?'),
  (10, 'Data Representation Basics', 'Connect numeric ranges to bit capacity.', 'Find bits needed for max value.', 'max_value', 'bits needed', E'START\nSET bits <- 0\nWHILE (2^bits)-1 < max_value\n  bits <- bits + 1\nOUTPUT bits\nEND', E'def bits_needed(max_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_value:\n        bits += 1\n    return bits', 'Try max_value=31 and 255.', 'What does (2^bits)-1 mean?', 'Why loop until condition fails?', 'Why does 255 need 8 bits?'),
  (11, 'Compression and Tradeoffs', 'Use one formula to reason about file savings.', 'Compute space saved from original and compressed sizes.', 'original_mb, compressed_mb', 'saved amount', E'START\nREAD original_mb, compressed_mb\nOUTPUT original_mb - compressed_mb\nEND', E'def space_saved(original_mb, compressed_mb):\n    return round(original_mb - compressed_mb, 2)', 'Try 100,40 and 80.5,60.25.', 'What does a bigger saved value mean?', 'Can saved be 0?', 'When could saved be negative?'),
  (12, 'Privacy Risk Rules', 'Classify sharing risk with simple thresholds.', 'Return low/medium/high risk ratio tier.', 'shared_fields, sensitive_fields', 'risk label', E'START\nIF shared_fields = 0 OUTPUT "low"\nSET ratio <- sensitive_fields / shared_fields\nIF ratio >= 0.5 OUTPUT "high"\nELSE IF ratio >= 0.2 OUTPUT "medium"\nELSE OUTPUT "low"\nEND', E'def privacy_risk(shared_fields, sensitive_fields):\n    if shared_fields == 0:\n        return "low"\n    ratio = sensitive_fields / shared_fields\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"', 'Try 10,1 and 10,6.', 'Why guard shared_fields==0?', 'Which threshold checks first?', 'Why are clear labels useful?'),
  (13, 'Internet Addressing Basics', 'Identify local/private addresses for home or school networks.', 'Return true for private IP ranges only.', 'address string', 'true/false', E'START\nIF startsWith("10.") OR startsWith("192.168.") OUTPUT true\nELSE OUTPUT false\nEND', E'def is_private_basic(address):\n    return address.startswith("10.") or address.startswith("192.168.")', 'Try "192.168.1.9" and "8.8.8.8".', 'Why are private ranges special?', 'What does startswith() check?', 'What should public IPs return?'),
  (14, 'Network Reliability Thinking', 'Map latency to user experience tiers.', 'Return fast/normal/slow from latency_ms.', 'latency_ms', 'tier label', E'START\nIF latency_ms < 100 OUTPUT "fast"\nELSE IF latency_ms < 300 OUTPUT "normal"\nELSE OUTPUT "slow"\nEND', E'def retry_tier(latency_ms):\n    if latency_ms < 100:\n        return "fast"\n    if latency_ms < 300:\n        return "normal"\n    return "slow"', 'Try 80, 150, and 350.', 'Why order conditions this way?', 'What does exactly 100 return?', 'Why bucket numeric metrics?'),
  (15, 'Cybersecurity Data Masking', 'Mask sensitive text before logs are shown.', 'Keep only first username character of email.', 'email', 'masked email', E'START\nIF "@" missing OUTPUT "***"\nSPLIT email into local/domain\nIF local empty OUTPUT "***@" + domain\nELSE OUTPUT firstChar(local) + "***@" + domain\nEND', E'def mask_email(email):\n    if "@" not in email:\n        return "***"\n    local, domain = email.split("@", 1)\n    if not local:\n        return "***@" + domain\n    return local[0] + "***@" + domain', 'Try "alex@example.com" and "bad-email".', 'Why hide most of local part?', 'Why keep domain visible?', 'How does masking reduce risk?'),
  (16, 'Responsible Computing Rules', 'Use measurable fairness rules before action.', 'Return insufficient/review/ok using disparity + sample_size.', 'disparity, sample_size', 'status label', E'START\nIF sample_size < 30 OUTPUT "insufficient"\nELSE IF disparity >= 0.2 OUTPUT "review"\nELSE OUTPUT "ok"\nEND', E'def fairness_alert(disparity, sample_size):\n    if sample_size < 30:\n        return "insufficient"\n    if disparity >= 0.2:\n        return "review"\n    return "ok"', 'Try 0.3,20 and 0.1,100.', 'Why check sample size first?', 'What threshold triggers review?', 'Why avoid decisions on tiny samples?'),
  (17, 'Create Task Readiness Gate', 'Use strict release checks before submission.', 'Return ready only when all quality gates pass.', 'pass_rate, bugs_open, reflection_words', 'ready/revise', E'START\nIF pass_rate >= 0.9 AND bugs_open = 0 AND reflection_words >= 60 OUTPUT "ready"\nELSE OUTPUT "revise"\nEND', E'def release_readiness(pass_rate, bugs_open, reflection_words):\n    if pass_rate >= 0.9 and bugs_open == 0 and reflection_words >= 60:\n        return "ready"\n    return "revise"', 'Try 0.95,0,80 and 0.95,1,80.', 'Why must all checks pass?', 'What is the minimum reflection length?', 'Why can strong tests still be revise?'),
  (18, 'Final Integration: Tiny Product Logic', 'Combine fundamentals in one clean function.', 'Compute progress percent safely from completed/total.', 'completed, total', 'percent string', E'START\nIF total = 0 OUTPUT "0%"\nSET percent <- round((completed / total) * 100)\nOUTPUT percent + "%"\nEND', E'def progress_percent(completed, total):\n    if total == 0:\n        return "0%"\n    percent = round((completed / total) * 100)\n    return f"{percent}%"', 'Try 3,4 and 0,0.', 'Why guard total==0?', 'Why return a string with %?', 'How is this used in real dashboards?')
) AS t(
  stage_index,
  focus_title,
  scenario,
  build_goal,
  inputs_desc,
  output_desc,
  pseudocode_block,
  python_block,
  mini_practice,
  q1,
  q2,
  q3
);

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_rows AS (
  SELECT
    l.id,
    l.title,
    u.unit_number,
    COALESCE(l.lesson_number, l.order_index) AS lesson_number,
    ROW_NUMBER() OVER (ORDER BY COALESCE(u.unit_number, u.order_index), COALESCE(l.lesson_number, l.order_index), l.created_at) AS stage_index
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN ap_course ac ON ac.id = u.course_id
),
first_checkpoint AS (
  SELECT
    c.lesson_id,
    c.title,
    c.solution_code,
    c.starter_code,
    (
      SELECT tc->>'input'
      FROM jsonb_array_elements(COALESCE(c.test_cases, '[]'::jsonb)) tc
      WHERE COALESCE((tc->>'hidden')::boolean, false) = false
      LIMIT 1
    ) AS sample_input,
    (
      SELECT tc->>'expected'
      FROM jsonb_array_elements(COALESCE(c.test_cases, '[]'::jsonb)) tc
      WHERE COALESCE((tc->>'hidden')::boolean, false) = false
      LIMIT 1
    ) AS sample_expected,
    ROW_NUMBER() OVER (PARTITION BY c.lesson_id ORDER BY c.order_index, c.created_at) AS rn
  FROM public.checkpoints c
),
lesson_payload AS (
  SELECT
    lr.id,
    lr.title,
    COALESCE(seed.focus_title, format('AP CSP Stage %s', lr.stage_index)) AS focus_title,
    COALESCE(seed.scenario, 'Build one concrete app-style function with exact behavior.') AS scenario,
    COALESCE(seed.build_goal, 'Implement one tiny function with clear input/output and exact formatting.') AS build_goal,
    COALESCE(seed.inputs_desc, 'see function parameters') AS inputs_desc,
    COALESCE(seed.output_desc, 'one exact output value') AS output_desc,
    COALESCE(seed.pseudocode_block, E'START\nREAD inputs\nAPPLY algorithm\nOUTPUT result\nEND') AS pseudocode_block,
    COALESCE(seed.python_block, fc.solution_code, fc.starter_code, E'def solve():\n    return None\n') AS python_block,
    COALESCE(seed.mini_practice, 'Run one normal case and one edge case.') AS mini_practice,
    COALESCE(seed.q1, 'What exact inputs are required?') AS q1,
    COALESCE(seed.q2, 'What exact output is required?') AS q2,
    COALESCE(seed.q3, 'Which edge case could fail first?') AS q3,
    fc.sample_input,
    fc.sample_expected
  FROM lesson_rows lr
  LEFT JOIN pg_temp.ap_csp_long_beginner_seed seed
    ON seed.stage_index = lr.stage_index
  LEFT JOIN first_checkpoint fc
    ON fc.lesson_id = lr.id
   AND fc.rn = 1
)
UPDATE public.lessons l
SET
  description = lp.build_goal,
  content_body = format(
$md$
# %1$s

## Why This Lesson Exists
%2$s

## Build Target
%3$s

## Inputs and Output
- Inputs: %4$s
- Output: %5$s

## Notes 1: Plain-English Goal
In this lesson, keep the solution small and exact. Focus on one function, one clear rule, and one expected output format.

## Notes 2: Pseudocode First
```text
%6$s
```

## Notes 3: Python Walkthrough
```python
%7$s
```

## Notes 4: Example Test
- Input: `%8$s`
- Expected Output: `%9$s`

## Notes 5: Beginner Debug Checklist
1. Did I keep the function name exactly the same?
2. Did I keep parameter names unchanged?
3. Does output formatting match exactly?
4. Did I test a normal case and an edge case?

## Notes 6: Mini Practice
%10$s

## Notes 7: Quick Check
- Q: %11$s
- Q: %12$s
- Q: %13$s
$md$,
    lp.focus_title,
    lp.scenario,
    lp.build_goal,
    lp.inputs_desc,
    lp.output_desc,
    lp.pseudocode_block,
    lp.python_block,
    COALESCE(lp.sample_input, 'See checkpoint tests panel.'),
    COALESCE(lp.sample_expected, 'See checkpoint tests panel.'),
    lp.mini_practice,
    lp.q1,
    lp.q2,
    lp.q3
  )
FROM lesson_payload lp
WHERE l.id = lp.id;

WITH ap_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
     OR lower(name) = 'ap computer science principles'
  ORDER BY CASE WHEN id = '00000000-0000-0000-0000-000000000010' THEN 0 ELSE 1 END
  LIMIT 1
),
lesson_rows AS (
  SELECT l.id, l.title
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN ap_course ac ON ac.id = u.course_id
),
checkpoint_rows AS (
  SELECT
    c.id,
    c.lesson_id,
    c.title,
    (
      SELECT tc->>'input'
      FROM jsonb_array_elements(COALESCE(c.test_cases, '[]'::jsonb)) tc
      WHERE COALESCE((tc->>'hidden')::boolean, false) = false
      LIMIT 1
    ) AS sample_input,
    (
      SELECT tc->>'expected'
      FROM jsonb_array_elements(COALESCE(c.test_cases, '[]'::jsonb)) tc
      WHERE COALESCE((tc->>'hidden')::boolean, false) = false
      LIMIT 1
    ) AS sample_expected
  FROM public.checkpoints c
  JOIN lesson_rows lr ON lr.id = c.lesson_id
  WHERE c.order_index = 1
)
UPDATE public.checkpoints c
SET
  problem_description = format(
$task$
## Objective
Implement the required function for **%1$s**.

## Exact Rules
1. Keep function name and parameters unchanged.
2. Return the exact required output format.
3. Handle one normal input and one edge-case input.
4. Keep code simple and readable.

## Example Visible Test
- Input: `%2$s`
- Expected: `%3$s`

## Submit When
- Your code passes tests.
- Output format is exact.
- You can explain your algorithm in 2-3 steps.
$task$,
    lr.title,
    COALESCE(cr.sample_input, 'See tests panel'),
    COALESCE(cr.sample_expected, 'See tests panel')
  )
FROM checkpoint_rows cr
JOIN lesson_rows lr ON lr.id = cr.lesson_id
WHERE c.id = cr.id;

COMMIT;
