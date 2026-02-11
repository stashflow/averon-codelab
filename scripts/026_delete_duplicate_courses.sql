-- Delete duplicate courses, keeping only the first instance of each unique course name
-- This will remove 8 duplicate courses identified in the database

-- First, let's see what we're deleting (for reference)
-- We'll keep the course with the earliest created_at timestamp for each name

-- Delete duplicate JavaScript Essentials (keep oldest)
DELETE FROM public.courses
WHERE name = 'JavaScript Essentials'
AND id NOT IN (
  SELECT id FROM public.courses
  WHERE name = 'JavaScript Essentials'
  ORDER BY created_at ASC
  LIMIT 1
);

-- Delete duplicate Java Programming (keep oldest)
DELETE FROM public.courses
WHERE name = 'Java Programming'
AND id NOT IN (
  SELECT id FROM public.courses
  WHERE name = 'Java Programming'
  ORDER BY created_at ASC
  LIMIT 1
);

-- Delete duplicate C++ Mastery (keep oldest)
DELETE FROM public.courses
WHERE name = 'C++ Mastery'
AND id NOT IN (
  SELECT id FROM public.courses
  WHERE name = 'C++ Mastery'
  ORDER BY created_at ASC
  LIMIT 1
);

-- Delete duplicate Python Fundamentals (keep oldest)
DELETE FROM public.courses
WHERE name = 'Python Fundamentals'
AND id NOT IN (
  SELECT id FROM public.courses
  WHERE name = 'Python Fundamentals'
  ORDER BY created_at ASC
  LIMIT 1
);

-- Verify the cleanup
SELECT 
  name,
  COUNT(*) as count,
  COUNT(DISTINCT id) as unique_ids
FROM public.courses
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY name;

-- Show final course list
SELECT 
  id,
  name,
  description,
  difficulty_level,
  estimated_hours,
  created_at
FROM public.courses
ORDER BY name;
