-- AP CSP Concrete Course Rewrite
-- Rewrites AP CSP lesson notes to concrete, beginner-friendly examples.
-- Also tightens core checkpoint instructions to reduce ambiguity.
-- Safe to run multiple times.

BEGIN;

CREATE TEMP TABLE pg_temp.ap_csp_concrete_lesson_seed ON COMMIT DROP AS
SELECT *
FROM (VALUES
  (1, 1, 'Use a checkout calculator like an online store cart.', 'Build `receipt_total(subtotal, tax_rate, tip)` with exact rounding.', 'subtotal (number), tax_rate (decimal), tip (number)', 'one total number rounded to 2 decimals', E'START\nREAD subtotal, tax_rate, tip\nSET total <- subtotal + (subtotal * tax_rate) + tip\nOUTPUT round(total, 2)\nEND', E'subtotal = 100\ntax_rate = 0.07\ntip = 5\ntotal = subtotal + (subtotal * tax_rate) + tip\nprint(round(total, 2))  # 112.0', 'Now try: subtotal=59.99, tax_rate=0.08, tip=2. What should output be?', 'Why do we round at the end, not in the middle?', 'What happens if subtotal is 0?', 'Which variable holds the final answer?'),
  (1, 2, 'Use a pass/fail label like a gradebook app.', 'Build `pass_status(score)` with one clear decision rule.', 'score (number)', '"pass" or "needs support"', E'START\nREAD score\nIF score >= 70 THEN\n  OUTPUT "pass"\nELSE\n  OUTPUT "needs support"\nEND IF\nEND', E'score = 72\nif score >= 70:\n    print("pass")\nelse:\n    print("needs support")', 'Now try score=69 and score=70.', 'Why does 70 return "pass"?', 'What would break if we used > instead of >= ?', 'What are the only two valid outputs?'),
  (1, 3, 'Count bonus days like a streak tracker app.', 'Build `streak_even_bonus(days)` by looping through each day.', 'days (list of numbers)', 'count of even numbers', E'START\nREAD days\nSET count <- 0\nFOR each day in days\n  IF day MOD 2 = 0 THEN\n    count <- count + 1\nOUTPUT count\nEND', E'days = [1, 2, 3, 4, 5, 6]\ncount = 0\nfor day in days:\n    if day % 2 == 0:\n        count += 1\nprint(count)  # 3', 'Now try days=[] and days=[2,4,6,8].', 'Why does an empty list return 0?', 'Where exactly does count change?', 'What does % 2 == 0 mean?'),

  (2, 1, 'Apply coupons like a shopping website.', 'Build `discounted_price(price, coupon_percent)` with 2-decimal output.', 'price (number), coupon_percent (number)', 'discounted price rounded to 2 decimals', E'START\nREAD price, coupon_percent\nSET discounted <- price * (1 - coupon_percent / 100)\nOUTPUT round(discounted, 2)\nEND', E'price = 59.99\ncoupon_percent = 10\ndiscounted = price * (1 - coupon_percent / 100)\nprint(round(discounted, 2))  # 53.99', 'Now try coupon_percent=0 and coupon_percent=100.', 'Why divide coupon_percent by 100?', 'Why do we keep `price` unchanged?', 'What output should 40 with 100% coupon produce?'),
  (2, 2, 'Normalize names like profile usernames.', 'Build `normalize_username(name)` so formatting is consistent.', 'name (string)', 'normalized username string', E'START\nREAD name\nSET cleaned <- trim(lower(name))\nSET words <- split cleaned by spaces\nOUTPUT join(words, "_")\nEND', E'name = "  Ava Johnson  "\ncleaned = "_".join(name.strip().lower().split())\nprint(cleaned)  # ava_johnson', 'Now try "MIA   K" and "   ".', 'Why call strip() before split()? ', 'What does lower() guarantee?', 'What should blank input become?'),
  (2, 3, 'Calculate leaderboard points like a game app.', 'Build `match_points(results)` with W=3, D=1, L=0.', 'results (list of "W"/"D"/"L")', 'total points (number)', E'START\nREAD results\nSET points <- 0\nFOR each result in results\n  IF result = "W" THEN points <- points + 3\n  ELSE IF result = "D" THEN points <- points + 1\nOUTPUT points\nEND', E'results = ["W", "D", "L", "W"]\npoints = 0\nfor result in results:\n    if result == "W":\n        points += 3\n    elif result == "D":\n        points += 1\nprint(points)  # 7', 'Now try ["D","D","D"] and [].', 'Why does "L" add nothing?', 'Why use elif for "D"?', 'How many points can one match add at most?'),

  (3, 1, 'Estimate bits needed like an image editor.', 'Build `photo_bits_needed(max_color_value)` using a loop.', 'max_color_value (number)', 'bits needed (number)', E'START\nREAD max_color_value\nSET bits <- 0\nWHILE (2^bits)-1 < max_color_value\n  bits <- bits + 1\nOUTPUT bits\nEND', E'max_color_value = 255\nbits = 0\nwhile (2 ** bits) - 1 < max_color_value:\n    bits += 1\nprint(bits)  # 8', 'Now try max_color_value=31 and max_color_value=1.', 'Why start bits at 0?', 'What does (2^bits)-1 represent?', 'Why does 255 require 8 bits?'),
  (3, 2, 'Measure compression like video upload platforms.', 'Build `video_space_saved(original_mb, compressed_mb)`.', 'original_mb (number), compressed_mb (number)', 'saved space (number)', E'START\nREAD original_mb, compressed_mb\nSET saved <- original_mb - compressed_mb\nOUTPUT round(saved, 2)\nEND', E'original_mb = 100\ncompressed_mb = 40\nsaved = original_mb - compressed_mb\nprint(round(saved, 2))  # 60', 'Now try 80.5 and 60.25.', 'What does a larger saved value mean?', 'Can saved be 0?', 'What if compressed_mb is larger than original_mb?'),
  (3, 3, 'Classify profile sharing risk in a social app.', 'Build `social_sharing_risk(shared_fields, sensitive_fields, public_fields)`.', 'shared_fields, sensitive_fields, public_fields (numbers)', '"low", "medium", or "high"', E'START\nREAD shared_fields, sensitive_fields, public_fields\nIF shared_fields = 0 THEN OUTPUT "low"\nSET risk_ratio <- (sensitive_fields + public_fields) / shared_fields\nIF risk_ratio >= 0.6 OUTPUT "high"\nELSE IF risk_ratio >= 0.3 OUTPUT "medium"\nELSE OUTPUT "low"\nEND', E'shared_fields = 10\nsensitive_fields = 2\npublic_fields = 2\nrisk_ratio = (sensitive_fields + public_fields) / shared_fields\nif risk_ratio >= 0.6:\n    print("high")\nelif risk_ratio >= 0.3:\n    print("medium")\nelse:\n    print("low")', 'Now try 10,1,1 and 10,3,3.', 'Why do we guard shared_fields == 0 first?', 'Which threshold checks must run first?', 'What is the exact formula for risk_ratio?'),

  (4, 1, 'Identify local hosts for a multiplayer LAN game.', 'Build `is_lan_game_host(address)` with clear private-IP checks.', 'address (string IP)', 'true or false', E'START\nREAD address\nIF startsWith("10.") OR startsWith("192.168.") OUTPUT true\nELSE IF startsWith("172.") AND second octet is 16..31 OUTPUT true\nELSE OUTPUT false\nEND', E'address = "192.168.1.50"\nif address.startswith("10.") or address.startswith("192.168."):\n    print(True)\nelse:\n    print(False)', 'Now try "8.8.8.8" and "172.20.1.7".', 'Why is 172.20.x.x local but 172.40.x.x not?', 'Why do we parse octets?', 'What should public IPs return?'),
  (4, 2, 'Set retry speed for chat delivery.', 'Build `chat_retry_delay_tier(latency_ms)` with three tiers.', 'latency_ms (number)', '"fast", "normal", or "slow"', E'START\nREAD latency_ms\nIF latency_ms < 100 OUTPUT "fast"\nELSE IF latency_ms < 300 OUTPUT "normal"\nELSE OUTPUT "slow"\nEND', E'latency_ms = 150\nif latency_ms < 100:\n    print("fast")\nelif latency_ms < 300:\n    print("normal")\nelse:\n    print("slow")', 'Now try 80, 299, and 350.', 'Why is 299 still "normal"?', 'Which condition must be checked first?', 'What happens at exactly 100?'),
  (4, 3, 'Mask user emails before logs are shown.', 'Build `mask_email(email)` to reduce data exposure.', 'email (string)', 'masked email string', E'START\nREAD email\nIF "@" missing OUTPUT "***"\nSPLIT email into local and domain\nIF local is empty OUTPUT "***@" + domain\nELSE OUTPUT firstChar(local) + "***@" + domain\nEND', E'email = "alex@example.com"\nlocal, domain = email.split("@", 1)\nmasked = local[0] + "***@" + domain\nprint(masked)  # a***@example.com', 'Now try "@school.edu" and "bad-email".', 'Why do we hide almost all of local-part?', 'What if @ is missing?', 'Why keep the domain visible?'),

  (5, 1, 'Trigger fairness alerts with enough evidence.', 'Build `fairness_alert(disparity, sample_size)`.', 'disparity (decimal), sample_size (number)', '"insufficient", "review", or "ok"', E'START\nREAD disparity, sample_size\nIF sample_size < 30 OUTPUT "insufficient"\nELSE IF disparity >= 0.2 OUTPUT "review"\nELSE OUTPUT "ok"\nEND', E'disparity = 0.25\nsample_size = 100\nif sample_size < 30:\n    print("insufficient")\nelif disparity >= 0.2:\n    print("review")\nelse:\n    print("ok")', 'Now try 0.3,20 and 0.1,100.', 'Why check sample size first?', 'What threshold triggers review?', 'Why can low sample size block decisions?'),
  (5, 2, 'Route moderation outcomes for a content platform.', 'Build `moderation_queue(flags, trust_score)`.', 'flags (number), trust_score (decimal)', '"allow", "review", or "block"', E'START\nREAD flags, trust_score\nIF flags >= 3 AND trust_score < 0.4 OUTPUT "block"\nELSE IF flags >= 1 OUTPUT "review"\nELSE OUTPUT "allow"\nEND', E'flags = 3\ntrust_score = 0.2\nif flags >= 3 and trust_score < 0.4:\n    print("block")\nelif flags >= 1:\n    print("review")\nelse:\n    print("allow")', 'Now try (0,0.9), (1,0.9), (3,0.6).', 'Why does high trust_score avoid block in one case?', 'What are the only valid outputs?', 'Why is order of conditions important?'),
  (5, 3, 'Show alerts in a student wellness dashboard.', 'Build `wellness_signal(score, baseline)`.', 'score (number), baseline (number)', '"alert" or "normal"', E'START\nREAD score, baseline\nIF score >= baseline + 5 OUTPUT "alert"\nELSE OUTPUT "normal"\nEND', E'score = 15\nbaseline = 10\nif score >= baseline + 5:\n    print("alert")\nelse:\n    print("normal")', 'Now try 9,10 and 20,14.', 'Why add 5 to baseline?', 'What should score=10 baseline=10 return?', 'How does threshold tuning change alerts?'),

  (6, 1, 'Track AP Create components in a project checklist.', 'Build `create_components_done(has_list, has_procedure, has_output, has_input)`.', 'four boolean values', 'count of completed components', E'START\nREAD has_list, has_procedure, has_output, has_input\nSET done <- int(has_list) + int(has_procedure) + int(has_output) + int(has_input)\nOUTPUT done\nEND', E'has_list = True\nhas_procedure = True\nhas_output = False\nhas_input = True\ndone = int(has_list) + int(has_procedure) + int(has_output) + int(has_input)\nprint(done)  # 3', 'Now try all false and all true.', 'Why cast booleans to int?', 'What range can done have?', 'How does this help project planning?'),
  (6, 2, 'Gate release readiness for a project handoff.', 'Build `release_readiness(pass_rate, bugs_open, reflection_words)`.', 'pass_rate (decimal), bugs_open (number), reflection_words (number)', '"ready" or "revise"', E'START\nREAD pass_rate, bugs_open, reflection_words\nIF pass_rate >= 0.9 AND bugs_open = 0 AND reflection_words >= 60 OUTPUT "ready"\nELSE OUTPUT "revise"\nEND', E'pass_rate = 0.95\nbugs_open = 0\nreflection_words = 80\nif pass_rate >= 0.9 and bugs_open == 0 and reflection_words >= 60:\n    print("ready")\nelse:\n    print("revise")', 'Now try 0.95,1,80 and 0.8,0,120.', 'Why do all three conditions matter?', 'What is the minimum word count?', 'Why can high pass_rate still be revise?'),
  (6, 3, 'Label written reflection strength for AP Create prep.', 'Build `reflection_quality(words, mentions_algorithm, mentions_test)`.', 'words (number), mentions_algorithm (bool), mentions_test (bool)', '"strong", "developing", or "thin"', E'START\nREAD words, mentions_algorithm, mentions_test\nIF words >= 80 AND mentions_algorithm AND mentions_test OUTPUT "strong"\nELSE IF words >= 40 OUTPUT "developing"\nELSE OUTPUT "thin"\nEND', E'words = 55\nmentions_algorithm = True\nmentions_test = False\nif words >= 80 and mentions_algorithm and mentions_test:\n    print("strong")\nelif words >= 40:\n    print("developing")\nelse:\n    print("thin")', 'Now try 100,true,true and 20,true,true.', 'Why can 55 words be developing but not strong?', 'What evidence makes a response strong?', 'Why include both algorithm and testing language?')
) AS t(
  unit_number,
  lesson_number,
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
    seed.scenario,
    seed.build_goal,
    seed.inputs_desc,
    seed.output_desc,
    seed.pseudocode_block,
    seed.python_block,
    seed.mini_practice,
    seed.q1,
    seed.q2,
    seed.q3
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  JOIN ap_course ac ON ac.id = u.course_id
  LEFT JOIN pg_temp.ap_csp_concrete_lesson_seed seed
    ON seed.unit_number = u.unit_number
   AND seed.lesson_number = COALESCE(l.lesson_number, l.order_index)
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
    ROW_NUMBER() OVER (PARTITION BY c.lesson_id ORDER BY c.order_index ASC, c.created_at ASC) AS rn
  FROM public.checkpoints c
),
lesson_payload AS (
  SELECT
    lr.id,
    lr.title,
    COALESCE(lr.build_goal, 'Implement one small function correctly with clear logic and exact output formatting.') AS build_goal,
    COALESCE(lr.scenario, 'Use a real app-style task so each step is concrete and testable.') AS scenario,
    COALESCE(lr.inputs_desc, 'see function parameters') AS inputs_desc,
    COALESCE(lr.output_desc, 'one exact output value') AS output_desc,
    COALESCE(lr.pseudocode_block, E'START\nREAD the inputs\nAPPLY the exact algorithm\nOUTPUT the final value\nEND') AS pseudocode_block,
    COALESCE(lr.python_block, fc.solution_code, fc.starter_code, E'def solve():\n    return None\n') AS python_block,
    COALESCE(lr.mini_practice, 'Run the function with one normal input and one edge case input.') AS mini_practice,
    COALESCE(lr.q1, 'What exact inputs does this function receive?') AS q1,
    COALESCE(lr.q2, 'What exact output must it return?') AS q2,
    COALESCE(lr.q3, 'Which test case will fail first if your logic is wrong?') AS q3,
    fc.sample_input,
    fc.sample_expected
  FROM lesson_rows lr
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

## Real-World Scenario
%2$s

## What You Will Build
%3$s

## Inputs and Output
- Inputs: %4$s
- Output: %5$s

## Notes Page 1: Why This Works
1. Read the problem and identify the exact inputs.
2. Decide the one rule or algorithm that transforms inputs to output.
3. Keep the output format exact.
4. Validate with at least one normal case and one edge case.

## Notes Page 2: Pseudocode
```text
%6$s
```

## Notes Page 3: Python Example
```python
%7$s
```

## Notes Page 4: Example Test Case
- Input: `%8$s`
- Expected Output: `%9$s`

## Notes Page 5: Mini Practice
%10$s

## Quick Questions
- Q: %11$s
- Q: %12$s
- Q: %13$s
$md$,
    lp.title,
    lp.scenario,
    lp.build_goal,
    lp.inputs_desc,
    lp.output_desc,
    lp.pseudocode_block,
    lp.python_block,
    COALESCE(lp.sample_input, 'See checkpoint tests for sample input.'),
    COALESCE(lp.sample_expected, 'See checkpoint tests for expected output.'),
    lp.mini_practice,
    lp.q1,
    lp.q2,
    lp.q3
  ),
  updated_at = NOW()
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

## Exact Requirements
1. Keep the function name and parameters unchanged.
2. Return the exact output format expected by tests.
3. Handle normal and edge-case inputs.
4. Run tests after each meaningful edit.

## Function Target
`%2$s`

## Example
- Input: `%3$s`
- Expected: `%4$s`

## Submission Checklist
- Logic matches your pseudocode notes.
- Output format is exact (including spacing/punctuation).
- At least one edge case was tested before submit.
$task$,
    lr.title,
    COALESCE(cr.title, 'solve'),
    COALESCE(cr.sample_input, 'See tests panel'),
    COALESCE(cr.sample_expected, 'See tests panel')
  )
FROM checkpoint_rows cr
JOIN lesson_rows lr ON lr.id = cr.lesson_id
WHERE c.id = cr.id;

COMMIT;
