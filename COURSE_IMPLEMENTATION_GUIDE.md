# Course Implementation Guide

This guide explains how to implement courses with the four learning methods in Averon CodeLab. The database schema is ready and waiting for course content.

## Database Structure Overview

```
courses (exists)
  ↓
units (unit_number: 1, 2, 3...)
  ↓
lessons (lesson_number: 1, 2, 3... within each unit)
  ↓
content_data (JSONB - flexible for all lesson types)
```

### Lesson Numbering System

- **Unit 3, Lesson 1** = Database: `unit_number: 3, lesson_number: 1`
- **Unit 3, Lesson 2** = Database: `unit_number: 3, lesson_number: 2`
- Display as: **3.1**, **3.2**, **3.3**, etc.

## Four Learning Methods

Each lesson has a `lesson_type` field that determines how it's delivered:

### 1. Video Lessons (`lesson_type: 'video'`)

Students watch educational videos with optional exercises.

**content_data structure:**
```json
{
  "video_url": "https://...",
  "video_duration_seconds": 600,
  "transcript": "Optional transcript text...",
  "key_concepts": ["concept1", "concept2"],
  "practice_exercises": [
    {
      "question": "What is...?",
      "answer": "...",
      "type": "multiple_choice",
      "options": ["A", "B", "C", "D"]
    }
  ],
  "resources": [
    {
      "title": "Additional Reading",
      "url": "https://..."
    }
  ]
}
```

**UI Components to Build:**
- Video player with playback controls
- Progress tracker (% watched)
- Interactive transcript viewer
- Practice exercises below video
- Note-taking interface
- Resource links section

### 2. Reading/Articles (`lesson_type: 'reading'`)

Students read structured content with embedded code examples.

**content_data structure:**
```json
{
  "content_html": "<h2>Introduction</h2><p>Content here...</p>",
  "estimated_read_time_minutes": 15,
  "sections": [
    {
      "title": "Section 1",
      "content": "...",
      "code_examples": [
        {
          "language": "python",
          "code": "def example():\n    pass",
          "explanation": "This demonstrates..."
        }
      ]
    }
  ],
  "quiz_at_end": {
    "questions": [
      {
        "question": "What did you learn?",
        "type": "multiple_choice",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0
      }
    ]
  },
  "key_takeaways": ["point 1", "point 2"]
}
```

**UI Components to Build:**
- Article reader with typography styling
- Code syntax highlighting viewer
- Reading progress indicator
- Inline annotations/highlights
- End-of-reading comprehension quiz
- Print/export options

### 3. Interactive Coding (`lesson_type: 'coding'`)

Students write and execute code in an integrated environment.

**content_data structure:**
```json
{
  "problem_statement": "Write a function that...",
  "language": "python",
  "starter_code": "def solve():\n    # Your code here\n    pass",
  "solution_code": "def solve():\n    return 42",
  "test_cases": [
    {
      "input": "test_input",
      "expected_output": "expected_result",
      "hidden": false
    }
  ],
  "hints": [
    "Consider using a loop",
    "Think about edge cases"
  ],
  "difficulty": "intermediate",
  "constraints": {
    "time_limit_seconds": 5,
    "memory_limit_mb": 128
  }
}
```

**UI Components to Build:**
- Code editor (Monaco Editor or similar)
- Language selector
- Run/Test button
- Test results display with pass/fail
- Hints system (progressive disclosure)
- Solution viewer (after completion)
- Console output viewer
- Syntax error highlighting

### 4. Quizzes/Assessments (`lesson_type: 'quiz'`)

Students answer questions to test understanding.

**content_data structure:**
```json
{
  "title": "Unit 3 Assessment",
  "time_limit_minutes": 30,
  "passing_score": 70,
  "shuffle_questions": true,
  "shuffle_options": true,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is Python?",
      "options": ["A programming language", "A snake", "A framework", "A database"],
      "correct_answer": 0,
      "points": 10,
      "explanation": "Python is a high-level programming language."
    },
    {
      "id": "q2",
      "type": "multiple_select",
      "question": "Which are Python data types?",
      "options": ["int", "string", "boolean", "vector"],
      "correct_answers": [0, 1, 2],
      "points": 15
    },
    {
      "id": "q3",
      "type": "true_false",
      "question": "Python is compiled.",
      "correct_answer": false,
      "points": 5
    },
    {
      "id": "q4",
      "type": "short_answer",
      "question": "What keyword is used to define a function?",
      "correct_answer": "def",
      "case_sensitive": false,
      "points": 10
    },
    {
      "id": "q5",
      "type": "code_output",
      "question": "What does this code print?",
      "code": "x = [1, 2, 3]\nprint(x[1])",
      "correct_answer": "2",
      "points": 10
    }
  ]
}
```

**UI Components to Build:**
- Quiz interface with question navigation
- Timer display
- Multiple choice selector
- Checkbox group for multiple select
- Text input for short answer
- Code display for code_output questions
- Progress indicator (X of Y questions)
- Submit confirmation dialog
- Results page with score breakdown
- Review mode showing correct/incorrect answers

## Student Progress Tracking

The `student_lesson_progress` table tracks everything:

```typescript
interface StudentProgress {
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted'
  progress_percentage: number // 0-100
  time_spent_minutes: number
  score?: number // For quizzes/coding
  work_data: {
    // Stores student's work
    // Video: timestamps watched, exercise answers
    // Reading: sections completed, quiz answers
    // Coding: code submissions, test results
    // Quiz: selected answers, attempt count
  }
}
```

## Assignment System

Teachers can assign lessons with the **Lesson Assignment System**:

### Creating Assignments

```typescript
// Teacher assigns Unit 3, Lessons 1 and 2 due March 12
const assignments = [
  {
    classroom_id: 'class-uuid',
    lesson_id: 'lesson-3.1-uuid',
    assigned_by: 'teacher-uuid',
    due_date: '2026-03-12T23:59:59Z',
    instructions: 'Complete this before next class',
    is_required: true,
    points_possible: 100
  },
  {
    classroom_id: 'class-uuid',
    lesson_id: 'lesson-3.2-uuid',
    assigned_by: 'teacher-uuid',
    due_date: '2026-03-12T23:59:59Z',
    instructions: 'Complete this before next class',
    is_required: true,
    points_possible: 100
  }
]
```

### Student View

Students see:
- **Upcoming Assignments** on dashboard
- Due date with countdown
- Assignment type (video/reading/coding/quiz)
- Estimated time
- Points possible
- Completion status

### Teacher View

Teachers see:
- Which students completed assignments
- Scores/progress per student
- Average completion time
- Ability to provide feedback via `lesson_feedback` table

## Implementation Steps for AI

When implementing a specific course:

### Step 1: Create Course Structure

```sql
-- Insert course (if not exists)
INSERT INTO courses (name, description, language, level)
VALUES ('Python Fundamentals', 'Learn Python from scratch', 'python', 'beginner')
RETURNING id;

-- Create units
INSERT INTO units (course_id, unit_number, title, description, order_index, is_published)
VALUES 
  ('course-id', 1, 'Introduction to Python', 'Basic concepts', 1, true),
  ('course-id', 2, 'Data Types and Variables', 'Working with data', 2, true),
  ('course-id', 3, 'Control Flow', 'If statements and loops', 3, true);
```

### Step 2: Create Lessons for Each Unit

```sql
-- Unit 1, Lesson 1 (Video)
INSERT INTO lessons (
  unit_id, 
  lesson_number, 
  title, 
  lesson_type, 
  content_data,
  estimated_minutes,
  order_index,
  is_published
)
VALUES (
  'unit-1-id',
  1,
  'What is Python?',
  'video',
  '{
    "video_url": "https://...",
    "video_duration_seconds": 600,
    "practice_exercises": [...]
  }'::jsonb,
  15,
  1,
  true
);

-- Unit 1, Lesson 2 (Reading)
INSERT INTO lessons (...)
VALUES (
  'unit-1-id',
  2,
  'Setting Up Your Environment',
  'reading',
  '{ "content_html": "...", ... }'::jsonb,
  20,
  2,
  true
);

-- Unit 3, Lesson 1 (Coding)
INSERT INTO lessons (...)
VALUES (
  'unit-3-id',
  1,
  'Your First If Statement',
  'coding',
  '{ "problem_statement": "...", "starter_code": "...", ... }'::jsonb,
  30,
  1,
  true
);
```

### Step 3: Build UI Components

For each lesson type, create a React component:

- `VideoLesson.tsx` - Handles video lessons
- `ReadingLesson.tsx` - Handles reading/articles
- `CodingLesson.tsx` - Handles interactive coding
- `QuizLesson.tsx` - Handles quizzes

### Step 4: Create Assignment UI

Teacher Interface:
- `AssignLessonsModal.tsx` - Select lessons to assign
- `AssignmentManager.tsx` - View/edit assignments
- `StudentProgress.tsx` - View student progress

Student Interface:
- `AssignmentList.tsx` - View upcoming assignments
- `AssignmentDetail.tsx` - Complete an assignment

## Messaging Integration

The messaging system works with assignments:

### Class Announcements

```typescript
// Teacher posts announcement about assignment
await supabase.from('class_announcements').insert({
  classroom_id: 'class-uuid',
  teacher_id: 'teacher-uuid',
  message: 'Don't forget: Unit 3 lessons 3.1 and 3.2 are due Wednesday!',
  priority: 'normal'
})
```

Shows on student dashboard as: **"Don't forget: Unit 3 lessons 3.1 and 3.2 are due Wednesday! - Mr. Smith"**

### Private Messages

```typescript
// Teacher messages student about assignment
const { encrypted, iv } = await encryptMessage('Great work on 3.1! Try 3.2 next.')

await supabase.from('messages').insert({
  sender_id: 'teacher-uuid',
  recipient_id: 'student-uuid',
  subject: 'Assignment Feedback',
  encrypted_content: encrypted,
  encryption_iv: iv
})
```

## API Routes to Create

1. **POST /api/messages/send** - Send private message
2. **GET /api/messages/inbox** - Get messages for user
3. **POST /api/messages/mark-read** - Mark message as read
4. **POST /api/announcements/create** - Create class announcement
5. **GET /api/announcements/classroom/:id** - Get announcements
6. **POST /api/assignments/create** - Create lesson assignment
7. **GET /api/assignments/classroom/:id** - Get class assignments
8. **GET /api/assignments/student/:id** - Get student's assignments
9. **POST /api/progress/update** - Update lesson progress
10. **GET /api/progress/lesson/:id** - Get progress for lesson

## Example: Complete Flow

1. **Teacher assigns lessons:**
   - Opens classroom page
   - Clicks "Assign Lessons"
   - Selects Unit 3, Lessons 1 and 2
   - Sets due date: March 12
   - Adds instructions
   - Clicks "Assign"

2. **Student sees assignment:**
   - Logs in to dashboard
   - Sees "2 new assignments due March 12"
   - Sees class announcement: "Complete 3.1 and 3.2 by Wednesday - Ms. Johnson"
   - Clicks on assignment

3. **Student completes lesson:**
   - Opens Lesson 3.1 (Coding type)
   - Writes code in editor
   - Runs tests
   - Passes all tests
   - Progress updated: status='completed', score=100

4. **Teacher sees progress:**
   - Opens assignment view
   - Sees 15/20 students completed 3.1
   - Sees detailed progress per student
   - Sends encouraging message to students behind

## Database Query Examples

### Get student's assignments:
```sql
SELECT 
  la.*,
  l.title,
  l.lesson_type,
  l.estimated_minutes,
  u.unit_number,
  l.lesson_number,
  slp.status,
  slp.score
FROM lesson_assignments la
JOIN lessons l ON l.id = la.lesson_id
JOIN units u ON u.id = l.unit_id
LEFT JOIN student_lesson_progress slp 
  ON slp.lesson_id = la.lesson_id 
  AND slp.student_id = 'student-uuid'
WHERE la.classroom_id IN (
  SELECT classroom_id 
  FROM enrollments 
  WHERE student_id = 'student-uuid'
)
ORDER BY la.due_date ASC;
```

### Get class announcements for student:
```sql
SELECT 
  ca.*,
  p.full_name as teacher_name
FROM class_announcements ca
JOIN profiles p ON p.id = ca.teacher_id
WHERE ca.classroom_id IN (
  SELECT classroom_id 
  FROM enrollments 
  WHERE student_id = 'student-uuid'
)
AND ca.is_active = true
AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
ORDER BY ca.created_at DESC;
```

## Summary

The system is now ready for course content. When implementing courses:

1. Use the four lesson types: video, reading, coding, quiz
2. Store content in `content_data` JSONB field following the schemas above
3. Build UI components for each lesson type
4. Use the assignment system to assign lessons with due dates
5. Track progress in `student_lesson_progress`
6. Use messaging for announcements and feedback
7. Display format: Unit X.Y (e.g., 3.1, 3.2) in the UI

The database handles all relationships, RLS policies ensure security, and the flexible JSONB content allows any lesson structure while maintaining consistency.
