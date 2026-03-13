-- Canonicalize AP CSP to a single course record and move live references.
-- Keeps `00000000-0000-0000-0000-000000000010` as the one active AP CSP course.

BEGIN;

WITH canonical_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
  LIMIT 1
),
legacy_courses AS (
  SELECT id
  FROM public.courses
  WHERE lower(trim(name)) = 'ap computer science principles'
    AND id <> '00000000-0000-0000-0000-000000000010'
)
UPDATE public.course_enrollments ce
SET course_id = '00000000-0000-0000-0000-000000000010'
FROM legacy_courses lc
WHERE ce.course_id = lc.id
  AND EXISTS (SELECT 1 FROM canonical_course);

WITH canonical_course AS (
  SELECT id
  FROM public.courses
  WHERE id = '00000000-0000-0000-0000-000000000010'
  LIMIT 1
),
legacy_courses AS (
  SELECT id
  FROM public.courses
  WHERE lower(trim(name)) = 'ap computer science principles'
    AND id <> '00000000-0000-0000-0000-000000000010'
)
UPDATE public.classroom_course_offerings cco
SET course_id = '00000000-0000-0000-0000-000000000010'
FROM legacy_courses lc
WHERE cco.course_id = lc.id
  AND EXISTS (SELECT 1 FROM canonical_course);

UPDATE public.courses
SET is_active = false
WHERE lower(trim(name)) = 'ap computer science principles'
  AND id <> '00000000-0000-0000-0000-000000000010';

UPDATE public.courses
SET
  is_active = true,
  name = 'AP Computer Science Principles',
  language = COALESCE(language, 'python')
WHERE id = '00000000-0000-0000-0000-000000000010';

COMMIT;
