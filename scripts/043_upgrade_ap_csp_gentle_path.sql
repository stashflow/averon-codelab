-- AP CSP Gentle Path Upgrade
-- Pseudocode first -> easy Python -> moderate AP CSP applications
-- Never uses "hard" difficulty

BEGIN;

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
  'AP CSP with a beginner-friendly progression: pseudocode first, then easy Python, then moderate real AP CSP topics across data, internet, cybersecurity, and responsible computing.',
  'python',
  'beginner',
  100,
  true,
  'high-school',
  'GraduationCap',
  'from-pink-500 via-rose-500 to-orange-500',
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
  'Unit 1: Computational Thinking With Pseudocode',
  'Learn sequencing, selection, and iteration in plain pseudocode before writing Python.',
  1,
  ARRAY[
    'Trace algorithms with pseudocode',
    'Explain sequencing, selection, and iteration',
    'Translate pseudocode into simple Python'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000010',
  2,
  'Unit 2: Easy Python Foundations',
  'Use variables, conditionals, loops, and lists with beginner-level tasks.',
  2,
  ARRAY[
    'Use variables and arithmetic',
    'Write basic if/else logic',
    'Loop through list data'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000010',
  3,
  'Unit 3: Data and Information',
  'Connect code to AP CSP data topics: representation, compression, and privacy.',
  3,
  ARRAY[
    'Reason about bits and limits',
    'Compute simple compression metrics',
    'Classify privacy risk scenarios'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000010',
  4,
  'Unit 4: Internet and Cybersecurity Basics',
  'Learn how packets move and how to protect data in practical systems.',
  4,
  ARRAY[
    'Explain packet routing basics',
    'Model reliability and retries',
    'Apply beginner cybersecurity habits'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000010',
  5,
  'Unit 5: Responsible Computing and Impact',
  'Study fairness, bias, and decision rules with approachable code.',
  5,
  ARRAY[
    'Measure simple fairness signals',
    'Build transparent decision rules',
    'Explain social impact tradeoffs'
  ],
  true,
  NOW(),
  NOW()
),
(
  '71000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000010',
  6,
  'Unit 6: AP Create Task Prep',
  'Practice scoping, iteration, and written response structure for the AP Create Task.',
  6,
  ARRAY[
    'Scope a feasible project',
    'Use simple quality checks',
    'Draft concise written responses'
  ],
  true,
  NOW(),
  NOW()
);

WITH lesson_seed AS (
  SELECT *
  FROM (VALUES
    (1, 1, 'Pseudocode: Sequencing', 'Solve a problem step-by-step in plain language before coding.', 'In AP CSP, sequencing means instructions run in order from top to bottom.', E'STEP 1: start total at 0\nSTEP 2: add item price to total\nSTEP 3: add tax\nSTEP 4: output total', E'def add_tax(price, tax_rate):\n    return round(price + (price * tax_rate), 2)\n', 'Implement add_tax(price, tax_rate).', E'def add_tax(price, tax_rate):\n    # Keep this function name for the autograder\n    return 0\n', E'def add_tax(price, tax_rate):\n    return round(price + (price * tax_rate), 2)\n', '100,0.07', '107.0', '20,0.05', '21.0', 'easy', ARRAY['sequencing','pseudocode','algorithms']),
    (1, 2, 'Pseudocode: Selection (If/Else)', 'Use decision rules in pseudocode, then mirror them in Python.', 'Selection chooses between paths based on a condition.', E'IF score >= 70 THEN\n  output "pass"\nELSE\n  output "needs support"\nEND IF', E'def pass_status(score):\n    if score >= 70:\n        return "pass"\n    return "needs support"\n', 'Implement pass_status(score).', E'def pass_status(score):\n    # Keep this function name for the autograder\n    return ""\n', E'def pass_status(score):\n    if score >= 70:\n        return "pass"\n    return "needs support"\n', '72', '"pass"', '40', '"needs support"', 'easy', ARRAY['selection','conditionals','pseudocode']),
    (1, 3, 'Pseudocode: Iteration (Loops)', 'Model repeated steps with a loop pattern.', 'Iteration repeats steps until a condition is met or data is exhausted.', E'SET count to 0\nFOR each value in list\n  IF value is even THEN count = count + 1\nOUTPUT count', E'def count_even(numbers):\n    count = 0\n    for n in numbers:\n        if n % 2 == 0:\n            count += 1\n    return count\n', 'Implement count_even(numbers).', E'def count_even(numbers):\n    # Keep this function name for the autograder\n    return 0\n', E'def count_even(numbers):\n    count = 0\n    for n in numbers:\n        if n % 2 == 0:\n            count += 1\n    return count\n', '[1,2,3,4,5,6]', '3', '[1,3,5]', '0', 'easy', ARRAY['iteration','loops','pseudocode']),

    (2, 1, 'Python Basics: Variables and Math', 'Store values and compute totals clearly.', 'Variables hold data that can change while the program runs.', E'price <- 50\ncoupon <- 5\nfinal <- price - coupon\noutput final', E'def final_price(price, coupon):\n    return price - coupon\n', 'Implement final_price(price, coupon).', E'def final_price(price, coupon):\n    return 0\n', E'def final_price(price, coupon):\n    return price - coupon\n', '50,5', '45', '20,0', '20', 'easy', ARRAY['variables','expressions','python']),
    (2, 2, 'Python Basics: Strings and Decisions', 'Check text and choose responses.', 'String checks are common in apps, forms, and user input handling.', E'IF name is empty\n  output "anonymous"\nELSE\n  output name', E'def display_name(name):\n    if name.strip() == "":\n        return "anonymous"\n    return name.strip()\n', 'Implement display_name(name).', E'def display_name(name):\n    return ""\n', E'def display_name(name):\n    if name.strip() == "":\n        return "anonymous"\n    return name.strip()\n', '"  Alex  "', '"Alex"', '"   "', '"anonymous"', 'easy', ARRAY['strings','conditionals','input']),
    (2, 3, 'Python Basics: Lists and Loops', 'Count and summarize list values.', 'Lists store collections, and loops process each element one at a time.', E'SET total to 0\nFOR each score in scores\n  total = total + score\nOUTPUT total', E'def total_score(scores):\n    total = 0\n    for s in scores:\n        total += s\n    return total\n', 'Implement total_score(scores).', E'def total_score(scores):\n    return 0\n', E'def total_score(scores):\n    total = 0\n    for s in scores:\n        total += s\n    return total\n', '[10,20,30]', '60', '[]', '0', 'easy', ARRAY['lists','loops','aggregation']),

    (3, 1, 'Data Representation: Bits and Capacity', 'Estimate how many bits are needed for a value range.', 'AP CSP emphasizes how data limits affect what computers can represent.', E'bits <- 0\nWHILE (2^bits)-1 < max_value\n  bits <- bits + 1\nOUTPUT bits', E'def bits_needed(max_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_value:\n        bits += 1\n    return bits\n', 'Implement bits_needed(max_value).', E'def bits_needed(max_value):\n    return 0\n', E'def bits_needed(max_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_value:\n        bits += 1\n    return bits\n', '31', '5', '255', '8', 'medium', ARRAY['binary','data_representation','capacity']),
    (3, 2, 'Data Compression Basics', 'Compute a simple compression ratio.', 'Compression balances file size and quality; AP CSP expects tradeoff reasoning.', E'ratio <- compressed / original\nOUTPUT ratio', E'def compression_ratio(original_kb, compressed_kb):\n    if original_kb == 0:\n        return 0\n    return round(compressed_kb / original_kb, 2)\n', 'Implement compression_ratio(original_kb, compressed_kb).', E'def compression_ratio(original_kb, compressed_kb):\n    return 0\n', E'def compression_ratio(original_kb, compressed_kb):\n    if original_kb == 0:\n        return 0\n    return round(compressed_kb / original_kb, 2)\n', '100,40', '0.4', '250,200', '0.8', 'medium', ARRAY['compression','data','tradeoffs']),
    (3, 3, 'Privacy Risk Classification', 'Classify data sharing risk with simple rules.', 'Privacy is core AP CSP content: what data is shared and how sensitive it is.', E'IF sensitive_ratio >= 0.5 THEN high\nELSE IF >= 0.2 THEN medium\nELSE low', E'def privacy_risk(shared_fields, sensitive_fields):\n    ratio = sensitive_fields / shared_fields if shared_fields else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', 'Implement privacy_risk(shared_fields, sensitive_fields).', E'def privacy_risk(shared_fields, sensitive_fields):\n    return ""\n', E'def privacy_risk(shared_fields, sensitive_fields):\n    ratio = sensitive_fields / shared_fields if shared_fields else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', '10,1', '"low"', '10,6', '"high"', 'medium', ARRAY['privacy','data','ethics']),

    (4, 1, 'Internet Basics: Local vs Public Address', 'Identify whether an address is private/local.', 'AP CSP internet lessons include addressing and routing concepts.', E'IF starts with "10." OR "192.168." THEN local\nELSE IF starts with "172." and second octet is 16..31 THEN local\nELSE public', E'def is_local_address(address):\n    if address.startswith("10.") or address.startswith("192.168."):\n        return True\n    if address.startswith("172."):\n        parts = address.split(".")\n        if len(parts) >= 2 and parts[1].isdigit():\n            second = int(parts[1])\n            return 16 <= second <= 31\n    return False\n', 'Implement is_local_address(address).', E'def is_local_address(address):\n    return False\n', E'def is_local_address(address):\n    if address.startswith("10.") or address.startswith("192.168."):\n        return True\n    if address.startswith("172."):\n        parts = address.split(".")\n        if len(parts) >= 2 and parts[1].isdigit():\n            second = int(parts[1])\n            return 16 <= second <= 31\n    return False\n', '"192.168.1.9"', 'true', '"8.8.8.8"', 'false', 'easy', ARRAY['internet','routing','addresses']),
    (4, 2, 'Network Reliability: Retry Tiers', 'Choose retry count from latency.', 'Reliability uses bounded retries to improve success without overload.', E'IF latency < 100 THEN retries=1\nELSE IF latency < 300 THEN 2\nELSE 3', E'def retry_count(latency_ms):\n    if latency_ms < 100:\n        return 1\n    if latency_ms < 300:\n        return 2\n    return 3\n', 'Implement retry_count(latency_ms).', E'def retry_count(latency_ms):\n    return 0\n', E'def retry_count(latency_ms):\n    if latency_ms < 100:\n        return 1\n    if latency_ms < 300:\n        return 2\n    return 3\n', '80', '1', '350', '3', 'medium', ARRAY['reliability','networking','algorithms']),
    (4, 3, 'Cybersecurity: Mask Sensitive Keys', 'Hide most of a key before display or logging.', 'Security by default means minimizing sensitive data exposure.', E'IF key is short THEN "***"\nELSE keep first 4 and last 2 only', E'def mask_key(key):\n    if len(key) <= 6:\n        return "***"\n    return key[:4] + "***" + key[-2:]\n', 'Implement mask_key(key).', E'def mask_key(key):\n    return ""\n', E'def mask_key(key):\n    if len(key) <= 6:\n        return "***"\n    return key[:4] + "***" + key[-2:]\n', '"ABCD123456ZZ"', '"ABCD***ZZ"', '"ABC"', '"***"', 'medium', ARRAY['cybersecurity','privacy','strings']),

    (5, 1, 'Fairness Check: Simple Threshold', 'Flag cases that may need fairness review.', 'Responsible computing includes checking outcomes for possible bias.', E'IF disparity >= 0.2 THEN "needs_review" ELSE "acceptable"', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', 'Implement fairness_flag(disparity).', E'def fairness_flag(disparity):\n    return ""\n', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', '0.1', '"acceptable"', '0.25', '"needs_review"', 'medium', ARRAY['fairness','bias','impact']),
    (5, 2, 'Decision Rules: Allow/Review/Block', 'Use transparent rules for moderation-like decisions.', 'Clear rules make systems easier to audit and explain.', E'IF many flags and high confidence THEN block\nELSE IF any flags THEN review\nELSE allow', E'def moderation_decision(flags, confidence):\n    if flags >= 3 and confidence >= 0.8:\n        return "block"\n    if flags >= 1:\n        return "review"\n    return "allow"\n', 'Implement moderation_decision(flags, confidence).', E'def moderation_decision(flags, confidence):\n    return ""\n', E'def moderation_decision(flags, confidence):\n    if flags >= 3 and confidence >= 0.8:\n        return "block"\n    if flags >= 1:\n        return "review"\n    return "allow"\n', '0,0.5', '"allow"', '3,0.9', '"block"', 'medium', ARRAY['decision_rules','ethics','policy']),
    (5, 3, 'Impact Reflection with Metrics', 'Summarize a system signal into a plain status.', 'AP CSP impact questions often connect technical metrics to human outcomes.', E'IF value >= threshold THEN "attention"\nELSE "normal"', E'def impact_status(value, threshold):\n    if value >= threshold:\n        return "attention"\n    return "normal"\n', 'Implement impact_status(value, threshold).', E'def impact_status(value, threshold):\n    return ""\n', E'def impact_status(value, threshold):\n    if value >= threshold:\n        return "attention"\n    return "normal"\n', '9,10', '"normal"', '15,10', '"attention"', 'easy', ARRAY['impact','metrics','communication']),

    (6, 1, 'Create Task Planning Checklist', 'Track required AP Create components.', 'Scope and planning help keep a Create Task feasible.', E'count completed items: data, algorithm, testing', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return int(has_data) + int(has_algorithm) + int(has_testing)\n', 'Implement plan_checklist(has_data, has_algorithm, has_testing).', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return 0\n', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return int(has_data) + int(has_algorithm) + int(has_testing)\n', 'true,true,false', '2', 'true,true,true', '3', 'easy', ARRAY['create_task','planning','ap_exam']),
    (6, 2, 'Create Task Iteration Gate', 'Decide if a draft is ready to submit or needs revision.', 'Iteration with clear quality gates improves final AP submissions.', E'IF tests high and reflection enough THEN ready ELSE revise', E'def iteration_gate(test_pass_rate, reflection_words):\n    if test_pass_rate >= 0.9 and reflection_words >= 80:\n        return "ready"\n    return "revise"\n', 'Implement iteration_gate(test_pass_rate, reflection_words).', E'def iteration_gate(test_pass_rate, reflection_words):\n    return ""\n', E'def iteration_gate(test_pass_rate, reflection_words):\n    if test_pass_rate >= 0.9 and reflection_words >= 80:\n        return "ready"\n    return "revise"\n', '0.95,100', '"ready"', '0.7,120', '"revise"', 'medium', ARRAY['create_task','iteration','quality']),
    (6, 3, 'Create Task Written Response Length', 'Count words in a draft response.', 'Technical writing clarity matters for AP CSP written prompts.', E'trim text\nIF empty THEN 0\nELSE count words', E'def response_word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', 'Implement response_word_count(text).', E'def response_word_count(text):\n    return 0\n', E'def response_word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', '"algorithm explains output"', '3', '""', '0', 'easy', ARRAY['create_task','writing','communication'])
  ) AS t(
    unit_number,
    lesson_number,
    title,
    description,
    concept_walkthrough,
    pseudocode_block,
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

## AP CSP Focus
%2$s

## Step 1: Pseudocode First
```text
%3$s
```

## Step 2: Easy Python Translation
```python
%4$s
```

## Why this matters
- This appears in AP CSP multiple-choice and written-response contexts.
- You should be able to explain both the logic and the tradeoff.
- Keep your solution readable and test-checked.

## Quick Reasoning Prompt
In 2-3 sentences, explain why your algorithm works and name one tradeoff or edge case.
$md$,
    title,
    concept_walkthrough,
    pseudocode_block,
    example_code
  ),
  45,
  'coding',
  true,
  NOW(),
  NOW()
FROM lesson_rows;

WITH checkpoint_seed AS (
  SELECT *
  FROM (VALUES
    (1, 1, 1, 'Implement add_tax(price, tax_rate).', E'def add_tax(price, tax_rate):\n    # Keep this function name for the autograder\n    return 0\n', E'def add_tax(price, tax_rate):\n    return round(price + (price * tax_rate), 2)\n', '100,0.07', '107.0', '20,0.05', '21.0', '0,0.07', '0.0', '99.99,0.1', '109.99', 'easy', ARRAY['sequencing','pseudocode','algorithms']),
    (1, 2, 1, 'Implement pass_status(score).', E'def pass_status(score):\n    # Keep this function name for the autograder\n    return ""\n', E'def pass_status(score):\n    if score >= 70:\n        return "pass"\n    return "needs support"\n', '72', '"pass"', '40', '"needs support"', '70', '"pass"', '69', '"needs support"', 'easy', ARRAY['selection','conditionals','pseudocode']),
    (1, 3, 1, 'Implement count_even(numbers).', E'def count_even(numbers):\n    # Keep this function name for the autograder\n    return 0\n', E'def count_even(numbers):\n    count = 0\n    for n in numbers:\n        if n % 2 == 0:\n            count += 1\n    return count\n', '[1,2,3,4,5,6]', '3', '[1,3,5]', '0', '[]', '0', '[2,4,6,8]', '4', 'easy', ARRAY['iteration','loops','pseudocode']),
    (2, 1, 1, 'Implement final_price(price, coupon).', E'def final_price(price, coupon):\n    return 0\n', E'def final_price(price, coupon):\n    return price - coupon\n', '50,5', '45', '20,0', '20', '10,15', '-5', '99,99', '0', 'easy', ARRAY['variables','expressions','python']),
    (2, 2, 1, 'Implement display_name(name).', E'def display_name(name):\n    return ""\n', E'def display_name(name):\n    if name.strip() == "":\n        return "anonymous"\n    return name.strip()\n', '"  Alex  "', '"Alex"', '"   "', '"anonymous"', '"Sam"', '"Sam"', '""', '"anonymous"', 'easy', ARRAY['strings','conditionals','input']),
    (2, 3, 1, 'Implement total_score(scores).', E'def total_score(scores):\n    return 0\n', E'def total_score(scores):\n    total = 0\n    for s in scores:\n        total += s\n    return total\n', '[10,20,30]', '60', '[]', '0', '[5]', '5', '[1,1,1,1]', '4', 'easy', ARRAY['lists','loops','aggregation']),
    (3, 1, 1, 'Implement bits_needed(max_value).', E'def bits_needed(max_value):\n    return 0\n', E'def bits_needed(max_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_value:\n        bits += 1\n    return bits\n', '31', '5', '255', '8', '0', '0', '1', '1', 'medium', ARRAY['binary','data_representation','capacity']),
    (3, 2, 1, 'Implement compression_ratio(original_kb, compressed_kb).', E'def compression_ratio(original_kb, compressed_kb):\n    return 0\n', E'def compression_ratio(original_kb, compressed_kb):\n    if original_kb == 0:\n        return 0\n    return round(compressed_kb / original_kb, 2)\n', '100,40', '0.4', '250,200', '0.8', '10,0', '0.0', '0,50', '0', 'medium', ARRAY['compression','data','tradeoffs']),
    (3, 3, 1, 'Implement privacy_risk(shared_fields, sensitive_fields).', E'def privacy_risk(shared_fields, sensitive_fields):\n    return ""\n', E'def privacy_risk(shared_fields, sensitive_fields):\n    ratio = sensitive_fields / shared_fields if shared_fields else 0\n    if ratio >= 0.5:\n        return "high"\n    if ratio >= 0.2:\n        return "medium"\n    return "low"\n', '10,1', '"low"', '10,6', '"high"', '0,0', '"low"', '10,2', '"medium"', 'medium', ARRAY['privacy','data','ethics']),
    (4, 1, 1, 'Implement is_local_address(address).', E'def is_local_address(address):\n    return False\n', E'def is_local_address(address):\n    if address.startswith("10.") or address.startswith("192.168."):\n        return True\n    if address.startswith("172."):\n        parts = address.split(".")\n        if len(parts) >= 2 and parts[1].isdigit():\n            second = int(parts[1])\n            return 16 <= second <= 31\n    return False\n', '"192.168.1.9"', 'true', '"8.8.8.8"', 'false', '"172.16.4.9"', 'true', '"172.32.0.1"', 'false', 'easy', ARRAY['internet','routing','addresses']),
    (4, 2, 1, 'Implement retry_count(latency_ms).', E'def retry_count(latency_ms):\n    return 0\n', E'def retry_count(latency_ms):\n    if latency_ms < 100:\n        return 1\n    if latency_ms < 300:\n        return 2\n    return 3\n', '80', '1', '350', '3', '100', '2', '299', '2', 'medium', ARRAY['reliability','networking','algorithms']),
    (4, 3, 1, 'Implement mask_key(key).', E'def mask_key(key):\n    return ""\n', E'def mask_key(key):\n    if len(key) <= 6:\n        return "***"\n    return key[:4] + "***" + key[-2:]\n', '"ABCD123456ZZ"', '"ABCD***ZZ"', '"ABC"', '"***"', '"123456"', '"***"', '"ABCDEFGH"', '"ABCD***GH"', 'medium', ARRAY['cybersecurity','privacy','strings']),
    (5, 1, 1, 'Implement fairness_flag(disparity).', E'def fairness_flag(disparity):\n    return ""\n', E'def fairness_flag(disparity):\n    if disparity >= 0.2:\n        return "needs_review"\n    return "acceptable"\n', '0.1', '"acceptable"', '0.25', '"needs_review"', '0.2', '"needs_review"', '0.199', '"acceptable"', 'medium', ARRAY['fairness','bias','impact']),
    (5, 2, 1, 'Implement moderation_decision(flags, confidence).', E'def moderation_decision(flags, confidence):\n    return ""\n', E'def moderation_decision(flags, confidence):\n    if flags >= 3 and confidence >= 0.8:\n        return "block"\n    if flags >= 1:\n        return "review"\n    return "allow"\n', '0,0.5', '"allow"', '3,0.9', '"block"', '1,0.1', '"review"', '3,0.79', '"review"', 'medium', ARRAY['decision_rules','ethics','policy']),
    (5, 3, 1, 'Implement impact_status(value, threshold).', E'def impact_status(value, threshold):\n    return ""\n', E'def impact_status(value, threshold):\n    if value >= threshold:\n        return "attention"\n    return "normal"\n', '9,10', '"normal"', '15,10', '"attention"', '10,10', '"attention"', '-1,0', '"normal"', 'easy', ARRAY['impact','metrics','communication']),
    (6, 1, 1, 'Implement plan_checklist(has_data, has_algorithm, has_testing).', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return 0\n', E'def plan_checklist(has_data, has_algorithm, has_testing):\n    return int(has_data) + int(has_algorithm) + int(has_testing)\n', 'true,true,false', '2', 'true,true,true', '3', 'false,false,false', '0', 'true,false,true', '2', 'easy', ARRAY['create_task','planning','ap_exam']),
    (6, 2, 1, 'Implement iteration_gate(test_pass_rate, reflection_words).', E'def iteration_gate(test_pass_rate, reflection_words):\n    return ""\n', E'def iteration_gate(test_pass_rate, reflection_words):\n    if test_pass_rate >= 0.9 and reflection_words >= 80:\n        return "ready"\n    return "revise"\n', '0.95,100', '"ready"', '0.7,120', '"revise"', '0.9,80', '"ready"', '0.9,79', '"revise"', 'medium', ARRAY['create_task','iteration','quality']),
    (6, 3, 1, 'Implement response_word_count(text).', E'def response_word_count(text):\n    return 0\n', E'def response_word_count(text):\n    text = text.strip()\n    if not text:\n        return 0\n    return len(text.split())\n', '"algorithm explains output"', '3', '""', '0', '"  spaced   words here  "', '3', '"one"', '1', 'easy', ARRAY['create_task','writing','communication']),

    (2, 3, 2, 'Implement progress_trend(scores).', E'def progress_trend(scores):\n    return ""\n', E'def progress_trend(scores):\n    if len(scores) < 2:\n        return "insufficient_data"\n    if scores[-1] > scores[0]:\n        return "improving"\n    if scores[-1] == scores[0]:\n        return "steady"\n    return "declining"\n', '[70,80,90]', '"improving"', '[80,80]', '"steady"', '[90,80,70]', '"declining"', '[88]', '"insufficient_data"', 'medium', ARRAY['lists','loops','cumulative']),
    (4, 3, 2, 'Implement incident_severity(failed_logins, data_exfiltrated).', E'def incident_severity(failed_logins, data_exfiltrated):\n    return ""\n', E'def incident_severity(failed_logins, data_exfiltrated):\n    if data_exfiltrated:\n        return "critical"\n    if failed_logins >= 10:\n        return "high"\n    if failed_logins >= 3:\n        return "medium"\n    return "low"\n', '0,true', '"critical"', '12,false', '"high"', '3,false', '"medium"', '2,false', '"low"', 'medium', ARRAY['cybersecurity','networks','cumulative']),
    (6, 3, 2, 'Implement create_readiness(has_input, has_list, has_procedure, has_tests).', E'def create_readiness(has_input, has_list, has_procedure, has_tests):\n    return ""\n', E'def create_readiness(has_input, has_list, has_procedure, has_tests):\n    if has_input and has_list and has_procedure and has_tests:\n        return "ready"\n    return "revise"\n', 'true,true,true,true', '"ready"', 'true,true,true,false', '"revise"', 'false,true,true,true', '"revise"', 'false,false,false,false', '"revise"', 'medium', ARRAY['create_task','quality','cumulative'])
  ) AS t(
    unit_number,
    lesson_number,
    checkpoint_number,
    objective,
    starter_code,
    solution_code,
    test_input_1,
    expected_1,
    test_input_2,
    expected_2,
    test_input_3,
    expected_3,
    test_input_4,
    expected_4,
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
    substr(md5('checkpoint:' || unit_number::text || ':' || lesson_number::text || ':' || checkpoint_number::text), 1, 8) || '-' ||
    substr(md5('checkpoint:' || unit_number::text || ':' || lesson_number::text || ':' || checkpoint_number::text), 9, 4) || '-' ||
    substr(md5('checkpoint:' || unit_number::text || ':' || lesson_number::text || ':' || checkpoint_number::text), 13, 4) || '-' ||
    substr(md5('checkpoint:' || unit_number::text || ':' || lesson_number::text || ':' || checkpoint_number::text), 17, 4) || '-' ||
    substr(md5('checkpoint:' || unit_number::text || ':' || lesson_number::text || ':' || checkpoint_number::text), 21, 12)
  )::uuid AS checkpoint_id,
  (
    '72000000-0000-' || lpad(unit_number::text, 4, '0') || '-' || lpad(lesson_number::text, 4, '0') || '-' || lpad((unit_number * 100 + lesson_number)::text, 12, '0')
  )::uuid AS lesson_id,
  format('Practice %s.%s.%s', unit_number, lesson_number, checkpoint_number),
  format(
$task$
## Objective
%1$s

## Task
Fill in the starter code.

## Notes
- Keep the function name unchanged so tests can run.
- Handle normal and edge-case inputs.
- Keep your code simple and readable.
- After coding, explain in 2-3 sentences why your logic works.
$task$,
    objective
  ),
  starter_code,
  solution_code,
  jsonb_build_array(
    jsonb_build_object('input', test_input_1, 'expected', expected_1, 'name', 'Visible test 1'),
    jsonb_build_object('input', test_input_2, 'expected', expected_2, 'name', 'Visible test 2'),
    jsonb_build_object('input', test_input_3, 'expected', expected_3, 'name', 'Hidden test 1', 'hidden', true),
    jsonb_build_object('input', test_input_4, 'expected', expected_4, 'name', 'Hidden test 2', 'hidden', true)
  ),
  20,
  checkpoint_number,
  difficulty,
  concept_tags,
  NOW()
FROM checkpoint_seed;

COMMIT;
