-- AP CSP Applied Exercise Expansion
-- Adds additional DB-backed checkpoints inspired by common apps, websites, and games.
-- Safe to run multiple times.

BEGIN;

CREATE TEMP TABLE pg_temp.ap_csp_applied_exercise_seed ON COMMIT DROP AS
SELECT *
FROM (VALUES
  (1, 1, 2, 'Storefront Receipt Total', 'Build a checkout helper like a small ecommerce app checkout.', E'def receipt_total(subtotal, tax_rate, tip):\n    # TODO\n    return 0\n', E'def receipt_total(subtotal, tax_rate, tip):\n    return round(subtotal + (subtotal * tax_rate) + tip, 2)\n', '100,0.07,5', '112.0', '20,0.05,0', '21.0', '0,0.1,0', '0.0', '49.99,0.08,2', '55.99', 'easy', ARRAY['apps','math','sequencing']),
  (1, 2, 2, 'Game XP Badge', 'Classify player progression badges for a game profile page.', E'def xp_badge(xp):\n    # TODO\n    return ""\n', E'def xp_badge(xp):\n    if xp >= 1000:\n        return "legend"\n    if xp >= 500:\n        return "pro"\n    return "rookie"\n', '1200', '"legend"', '700', '"pro"', '100', '"rookie"', '500', '"pro"', 'easy', ARRAY['games','conditionals','selection']),
  (1, 3, 2, 'Streak Even-Day Bonus', 'Count even-numbered streak days like a habit-tracker app.', E'def streak_even_bonus(days):\n    # TODO\n    return 0\n', E'def streak_even_bonus(days):\n    count = 0\n    for day in days:\n        if day % 2 == 0:\n            count += 1\n    return count\n', '[1,2,3,4,5,6]', '3', '[1,3,5]', '0', '[]', '0', '[2,4,6,8]', '4', 'easy', ARRAY['apps','loops','iteration']),

  (2, 1, 2, 'Coupon Discount Price', 'Compute discounted cart totals like retail websites.', E'def discounted_price(price, coupon_percent):\n    # TODO\n    return 0\n', E'def discounted_price(price, coupon_percent):\n    return round(price * (1 - (coupon_percent / 100)), 2)\n', '100,20', '80.0', '59.99,10', '53.99', '50,0', '50.0', '40,100', '0.0', 'easy', ARRAY['websites','variables','math']),
  (2, 2, 2, 'Username Normalizer', 'Normalize profile names like social and messaging apps.', E'def normalize_username(name):\n    # TODO\n    return ""\n', E'def normalize_username(name):\n    cleaned = "_".join(name.strip().lower().split())\n    return cleaned\n', '"  Ava Johnson  "', '"ava_johnson"', '"Noah"', '"noah"', '"  "', '""', '"MIA   K"', '"mia_k"', 'easy', ARRAY['websites','strings','input']),
  (2, 3, 3, 'Match Points from Results', 'Calculate leaderboard points from match outcomes in a game app.', E'def match_points(results):\n    # TODO\n    return 0\n', E'def match_points(results):\n    points = 0\n    for result in results:\n        if result == "W":\n            points += 3\n        elif result == "D":\n            points += 1\n    return points\n', '["W","D","L","W"]', '7', '[]', '0', '["D","D","D"]', '3', '["L","L"]', '0', 'medium', ARRAY['games','lists','aggregation']),

  (3, 1, 2, 'Photo Bits Needed', 'Estimate color-depth capacity for photo editors.', E'def photo_bits_needed(max_color_value):\n    # TODO\n    return 0\n', E'def photo_bits_needed(max_color_value):\n    bits = 0\n    while (2 ** bits) - 1 < max_color_value:\n        bits += 1\n    return bits\n', '31', '5', '255', '8', '1', '1', '0', '0', 'medium', ARRAY['apps','data_representation','capacity']),
  (3, 2, 2, 'Video Space Saved', 'Compute storage savings like video upload platforms.', E'def video_space_saved(original_mb, compressed_mb):\n    # TODO\n    return 0\n', E'def video_space_saved(original_mb, compressed_mb):\n    return round(original_mb - compressed_mb, 2)\n', '100,40', '60', '250,200', '50', '0,0', '0', '80.5,60.25', '20.25', 'medium', ARRAY['websites','compression','tradeoffs']),
  (3, 3, 2, 'Social Sharing Risk', 'Classify sharing risk for profile fields in social apps.', E'def social_sharing_risk(shared_fields, sensitive_fields, public_fields):\n    # TODO\n    return ""\n', E'def social_sharing_risk(shared_fields, sensitive_fields, public_fields):\n    if shared_fields == 0:\n        return "low"\n    risk_ratio = (sensitive_fields + public_fields) / shared_fields\n    if risk_ratio >= 0.6:\n        return "high"\n    if risk_ratio >= 0.3:\n        return "medium"\n    return "low"\n', '10,1,1', '"low"', '10,2,2', '"medium"', '10,3,3', '"high"', '0,0,0', '"low"', 'medium', ARRAY['social_apps','privacy','ethics']),

  (4, 1, 2, 'LAN Lobby Host Check', 'Detect local-host addresses for multiplayer game lobbies.', E'def is_lan_game_host(address):\n    # TODO\n    return False\n', E'def is_lan_game_host(address):\n    if address.startswith("10.") or address.startswith("192.168."):\n        return True\n    if address.startswith("172."):\n        parts = address.split(".")\n        if len(parts) >= 2 and parts[1].isdigit():\n            second = int(parts[1])\n            return 16 <= second <= 31\n    return False\n', '"192.168.1.50"', 'true', '"8.8.8.8"', 'false', '"172.20.1.7"', 'true', '"172.40.1.7"', 'false', 'easy', ARRAY['games','networks','routing']),
  (4, 2, 2, 'Chat Retry Tier', 'Choose retry behavior for chat message delivery.', E'def chat_retry_delay_tier(latency_ms):\n    # TODO\n    return ""\n', E'def chat_retry_delay_tier(latency_ms):\n    if latency_ms < 100:\n        return "fast"\n    if latency_ms < 300:\n        return "normal"\n    return "slow"\n', '80', '"fast"', '150', '"normal"', '350', '"slow"', '299', '"normal"', 'medium', ARRAY['apps','reliability','algorithms']),
  (4, 3, 3, 'Mask Email for Logs', 'Mask user emails before display in admin logs.', E'def mask_email(email):\n    # TODO\n    return ""\n', E'def mask_email(email):\n    if "@" not in email:\n        return "***"\n    local, domain = email.split("@", 1)\n    if not local:\n        return "***@" + domain\n    return local[0] + "***@" + domain\n', '"alex@example.com"', '"a***@example.com"', '"@school.edu"', '"***@school.edu"', '"bad-email"', '"***"', '"nora@acl.org"', '"n***@acl.org"', 'medium', ARRAY['websites','cybersecurity','privacy']),

  (5, 1, 2, 'Fairness Alert with Sample Size', 'Raise fairness alerts only with enough evidence volume.', E'def fairness_alert(disparity, sample_size):\n    # TODO\n    return ""\n', E'def fairness_alert(disparity, sample_size):\n    if sample_size < 30:\n        return "insufficient"\n    if disparity >= 0.2:\n        return "review"\n    return "ok"\n', '0.25,100', '"review"', '0.1,100', '"ok"', '0.3,20', '"insufficient"', '0.2,30', '"review"', 'medium', ARRAY['responsible_computing','fairness','metrics']),
  (5, 2, 2, 'Moderation Queue Routing', 'Route posts into allow/review/block states.', E'def moderation_queue(flags, trust_score):\n    # TODO\n    return ""\n', E'def moderation_queue(flags, trust_score):\n    if flags >= 3 and trust_score < 0.4:\n        return "block"\n    if flags >= 1:\n        return "review"\n    return "allow"\n', '0,0.9', '"allow"', '1,0.9', '"review"', '3,0.2', '"block"', '3,0.6', '"review"', 'medium', ARRAY['websites','decision_rules','ethics']),
  (5, 3, 2, 'Wellness Signal Alert', 'Classify status in a wellness dashboard app.', E'def wellness_signal(score, baseline):\n    # TODO\n    return ""\n', E'def wellness_signal(score, baseline):\n    if score >= baseline + 5:\n        return "alert"\n    return "normal"\n', '15,10', '"alert"', '9,10', '"normal"', '10,10', '"normal"', '20,14', '"alert"', 'easy', ARRAY['apps','impact','thresholds']),

  (6, 1, 2, 'Create Components Counter', 'Count completed AP Create components in a project tracker.', E'def create_components_done(has_list, has_procedure, has_output, has_input):\n    # TODO\n    return 0\n', E'def create_components_done(has_list, has_procedure, has_output, has_input):\n    return int(has_list) + int(has_procedure) + int(has_output) + int(has_input)\n', 'true,true,false,true', '3', 'false,false,false,false', '0', 'true,true,true,true', '4', 'true,false,true,false', '2', 'easy', ARRAY['create_task','planning','checklists']),
  (6, 2, 2, 'Release Readiness Gate', 'Gate release readiness like portfolio and app deploy workflows.', E'def release_readiness(pass_rate, bugs_open, reflection_words):\n    # TODO\n    return ""\n', E'def release_readiness(pass_rate, bugs_open, reflection_words):\n    if pass_rate >= 0.9 and bugs_open == 0 and reflection_words >= 60:\n        return "ready"\n    return "revise"\n', '0.95,0,80', '"ready"', '0.95,1,80', '"revise"', '0.9,0,60', '"ready"', '0.8,0,120', '"revise"', 'medium', ARRAY['create_task','quality','testing']),
  (6, 3, 3, 'Reflection Quality Label', 'Label written reflection quality for a Create rehearsal.', E'def reflection_quality(words, mentions_algorithm, mentions_test):\n    # TODO\n    return ""\n', E'def reflection_quality(words, mentions_algorithm, mentions_test):\n    if words >= 80 and mentions_algorithm and mentions_test:\n        return "strong"\n    if words >= 40:\n        return "developing"\n    return "thin"\n', '100,true,true', '"strong"', '55,true,false', '"developing"', '20,true,true', '"thin"', '80,true,false', '"developing"', 'medium', ARRAY['create_task','writing','analysis'])
) AS t(
  unit_number,
  lesson_number,
  checkpoint_number,
  title,
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
);

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
target AS (
  SELECT seed.*, ll.lesson_id
  FROM pg_temp.ap_csp_applied_exercise_seed seed
  JOIN lesson_lookup ll
    ON ll.unit_number = seed.unit_number
   AND ll.lesson_number = seed.lesson_number
)
DELETE FROM public.checkpoints c
USING target t
WHERE c.lesson_id = t.lesson_id
  AND c.order_index = t.checkpoint_number;

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
target AS (
  SELECT seed.*, ll.lesson_id
  FROM pg_temp.ap_csp_applied_exercise_seed seed
  JOIN lesson_lookup ll
    ON ll.unit_number = seed.unit_number
   AND ll.lesson_number = seed.lesson_number
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
    substr(md5('checkpoint:' || t.unit_number::text || ':' || t.lesson_number::text || ':' || t.checkpoint_number::text), 1, 8) || '-' ||
    substr(md5('checkpoint:' || t.unit_number::text || ':' || t.lesson_number::text || ':' || t.checkpoint_number::text), 9, 4) || '-' ||
    substr(md5('checkpoint:' || t.unit_number::text || ':' || t.lesson_number::text || ':' || t.checkpoint_number::text), 13, 4) || '-' ||
    substr(md5('checkpoint:' || t.unit_number::text || ':' || t.lesson_number::text || ':' || t.checkpoint_number::text), 17, 4) || '-' ||
    substr(md5('checkpoint:' || t.unit_number::text || ':' || t.lesson_number::text || ':' || t.checkpoint_number::text), 21, 12)
  )::uuid,
  t.lesson_id,
  format('Applied Exercise %s.%s.%s: %s', t.unit_number, t.lesson_number, t.checkpoint_number, t.title),
  format(
$task$
## Objective
%1$s

## Task
Implement the starter function for this app/web/game scenario.

## Rules
1. Keep the function name and parameters unchanged.
2. Match expected outputs exactly.
3. Handle both normal and edge-case inputs.
4. Keep the code readable for another AP CSP student.
$task$,
    t.objective
  ),
  t.starter_code,
  t.solution_code,
  jsonb_build_array(
    jsonb_build_object('input', t.test_input_1, 'expected', t.expected_1, 'name', 'Visible test 1'),
    jsonb_build_object('input', t.test_input_2, 'expected', t.expected_2, 'name', 'Visible test 2'),
    jsonb_build_object('input', t.test_input_3, 'expected', t.expected_3, 'name', 'Hidden test 1', 'hidden', true),
    jsonb_build_object('input', t.test_input_4, 'expected', t.expected_4, 'name', 'Hidden test 2', 'hidden', true)
  ),
  24,
  t.checkpoint_number,
  t.difficulty,
  t.concept_tags,
  NOW()
FROM target t
ON CONFLICT (id) DO UPDATE SET
  lesson_id = EXCLUDED.lesson_id,
  title = EXCLUDED.title,
  problem_description = EXCLUDED.problem_description,
  starter_code = EXCLUDED.starter_code,
  solution_code = EXCLUDED.solution_code,
  test_cases = EXCLUDED.test_cases,
  points = EXCLUDED.points,
  order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty,
  concept_tags = EXCLUDED.concept_tags;

COMMIT;
