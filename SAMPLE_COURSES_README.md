# Sample Course Data Overview

This document describes the 4 sample courses created for Averon CodeLab, featuring the new learning methods.

## Courses Created

### 1. AP Computer Science Principles (Python)
**Course ID:** `c1111111-1111-1111-1111-111111111111`
- **Level:** Intermediate
- **Hours:** 60
- **Language:** Python
- **Description:** College-level intro aligned with College Board AP CSP curriculum

**Units & Lessons:**

**Unit 1: Computational Thinking Fundamentals**
- **1.1** - What is Computational Thinking? (Progressive Reveal)
  - 3 stages: Decomposition → Pattern Recognition → Abstraction
  - Each stage has checkpoint quiz before unlocking next
  - 25 minutes
  
- **1.2** - Algorithm Pattern Matching (Output-Only Challenge)
  - Task: Filter even numbers from a list
  - Shows I/O examples, student writes code to match
  - 20 minutes

**Unit 2: Python Programming Foundations**
- **2.1** - Variables and Data Types (Minimalist IDE-First)
  - Full-screen editor with minimal sidebar instructions
  - Create string, int, and boolean variables
  - 15 minutes

---

### 2. AP Computer Science A (Java)
**Course ID:** `c2222222-2222-2222-2222-222222222222`
- **Level:** Advanced
- **Hours:** 80
- **Language:** Java
- **Description:** Rigorous Java course for College Board AP CSA exam prep

**Units & Lessons:**

**Unit 1: Java Syntax and Primitives**
- **1.1** - The Temperature Converter Challenge (Single-Problem Depth)
  - Stage 1: Celsius → Fahrenheit
  - Stage 2: Add reverse conversion
  - Stage 3: Add Kelvin support
  - Progressive complexity in one cohesive problem
  - 35 minutes
  
- **1.2** - Java Loops Practice (Minimalist IDE-First)
  - Print numbers 1-10 using for loop
  - Editor-focused, minimal instructions
  - 18 minutes

**Unit 3: Object-Oriented Design**
- **3.1** - Classes and Objects Foundations (Progressive Reveal)
  - Stage 1: What is a Class?
  - Stage 2: Creating Objects
  - Checkpoint quizzes between stages
  - 22 minutes

---

### 3. Foundational Computer Science (Python)
**Course ID:** `c3333333-3333-3333-3333-333333333333`
- **Level:** Beginner
- **Hours:** 40
- **Language:** Python
- **Description:** Perfect first programming course for beginners

**Units & Lessons:**

**Unit 1: Your First Programs**
- **1.1** - Hello World! (Minimalist IDE-First)
  - Student's first program
  - Simply print "Hello, World!"
  - 10 minutes
  
- **1.2** - Name Greeter Pattern (Output-Only Challenge)
  - See I/O examples of name greetings
  - Write function to match pattern
  - 15 minutes

**Unit 2: Making Decisions with Code**
- **2.1** - If Statements Unlocked (Progressive Reveal)
  - Stage 1: Basic If
  - Stage 2: If-Else
  - Learn conditionals step by step
  - 20 minutes

---

### 4. Information Systems & Technology (JavaScript)
**Course ID:** `c4444444-4444-4444-4444-444444444444`
- **Level:** Intermediate
- **Hours:** 50
- **Language:** JavaScript
- **Description:** Business technology, web development, and information systems

**Units & Lessons:**

**Unit 1: Building Interactive Websites**
- **1.1** - Build a Todo List App (Single-Problem Depth)
  - Stage 1: Display static todos
  - Stage 2: Add new todos functionality
  - Stage 3: Delete todos
  - Complete app built progressively
  - 40 minutes
  
- **1.2** - String Manipulation Mystery (Output-Only Challenge)
  - Format person objects into sentences
  - Deduce pattern from examples
  - 18 minutes

**Unit 2: Working with Databases**
- **2.1** - Your First SQL Query (Minimalist IDE-First)
  - Write SELECT statements
  - Query student data
  - 15 minutes

---

## Learning Methods Used

### Method #2: Single-Problem Depth Page
**Used in:**
- AP CSA: Temperature Converter (1.1)
- IST: Todo List App (1.1)

**How it works:** One problem grows in complexity through multiple stages. Students solve stage 1, then build on it in stage 2, etc. Each stage adds new requirements or features.

**content_data structure:**
```json
{
  "problem_overview": "Overall goal",
  "stages": [
    {
      "stage": 1,
      "title": "Stage name",
      "description": "What to do",
      "starter_code": "...",
      "tests": [...]
    }
  ],
  "completion_message": "Success message"
}
```

---

### Method #6: Output-Only Challenge
**Used in:**
- AP CSP: Algorithm Pattern Matching (1.2)
- Foundational CS: Name Greeter (1.2)
- IST: String Manipulation (1.2)

**How it works:** Students see input/output examples and must figure out the pattern. No explicit instructions on HOW to solve it - they deduce the algorithm from examples.

**content_data structure:**
```json
{
  "challenge_description": "Write a function that...",
  "io_examples": [
    {"input": "...", "output": "..."}
  ],
  "language": "python",
  "starter_code": "def func():\n    pass",
  "test_cases": [...],
  "hints": ["Optional hints"]
}
```

---

### Method #7: Progressive Reveal Lesson
**Used in:**
- AP CSP: Computational Thinking (1.1)
- AP CSA: Classes and Objects (3.1)
- Foundational CS: If Statements (2.1)

**How it works:** Content is revealed in stages. Students must complete a checkpoint quiz to unlock the next stage. Prevents rushing ahead without understanding.

**content_data structure:**
```json
{
  "stages": [
    {
      "id": 1,
      "title": "Stage title",
      "content_html": "<h2>...</h2><p>...</p>",
      "checkpoint": {
        "question": "Quiz question",
        "type": "multiple_choice",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0
      }
    }
  ],
  "completion_summary": "Final message"
}
```

---

### Method #9: Minimalist IDE-First
**Used in:**
- AP CSP: Variables and Data Types (2.1)
- AP CSA: Java Loops (1.2)
- Foundational CS: Hello World (1.1)
- IST: SQL Query (2.1)

**How it works:** Editor takes up most of the screen. Instructions are in a slim side panel. Focus is on coding, not reading lengthy explanations.

**content_data structure:**
```json
{
  "instructions_panel": {
    "content": "**Task:** Do this thing\n\nSteps...",
    "hints": ["Hint 1", "Hint 2"]
  },
  "starter_code": "// code here",
  "language": "python",
  "tests": [...],
  "solution_example": "Complete solution"
}
```

---

## How to Assign Lessons

### For Teachers

**1. Assign a single lesson:**
```sql
-- Example: Assign AP CSP lesson 1.1 to your class, due March 12
INSERT INTO lesson_assignments (classroom_id, lesson_id, assigned_by, due_date, instructions)
VALUES (
  'your-classroom-id',
  'l1111111-1111-1111-1111-111111111111', -- Lesson 1.1 ID
  auth.uid(),
  '2025-03-12 23:59:59',
  'Complete all 3 stages of computational thinking'
);
```

**2. Assign multiple lessons at once:**
```sql
-- Assign lessons 3.1 and 3.2 together
INSERT INTO lesson_assignments (classroom_id, lesson_id, assigned_by, due_date)
VALUES 
  ('classroom-id', 'lesson-3.1-id', auth.uid(), '2025-03-12'),
  ('classroom-id', 'lesson-3.2-id', auth.uid(), '2025-03-12');
```

**3. Via API (from teacher dashboard):**
```typescript
const response = await fetch('/api/assignments/create', {
  method: 'POST',
  body: JSON.stringify({
    classroom_id: 'class-uuid',
    lesson_ids: ['lesson-1-id', 'lesson-2-id'],
    due_date: '2025-03-12T23:59:59Z',
    instructions: 'Complete before quiz',
    points_possible: 100
  })
});
```

---

## Database Schema Reference

### Courses
- `id`, `name`, `description`, `language`, `difficulty`, `estimated_hours`, `is_published`

### Units
- `id`, `course_id`, `unit_number`, `title`, `description`, `is_published`, `order_index`

### Lessons
- `id`, `unit_id`, `lesson_number`, `title`, `description`, `lesson_type`, `content_data`, `estimated_minutes`, `is_published`, `order_index`

### Lesson Assignments
- `id`, `classroom_id`, `lesson_id`, `assigned_by`, `due_date`, `assigned_at`, `instructions`, `is_required`, `points_possible`

### Student Progress
- `id`, `student_id`, `lesson_id`, `status`, `progress_percentage`, `score`, `work_data`

---

## Lesson Type Reference

| lesson_type | Description | Example Use |
|------------|-------------|-------------|
| `progressive_reveal` | Stage-by-stage unlock with checkpoints | Teaching concepts sequentially |
| `output_challenge` | Student deduces pattern from I/O | Pattern recognition, problem-solving |
| `minimalist_ide` | Editor-first, slim instructions | Hands-on coding practice |
| `single_problem_depth` | One problem, multiple complexity stages | Building complete projects |
| `video` | Video lessons with exercises | Lectures, demonstrations |
| `reading` | Text-based content with code examples | Theory, documentation |
| `coding` | Standard coding challenges | Practice problems |
| `quiz` | Assessment/testing | Knowledge checks |

---

## Next Steps

### To use these courses:

1. **Execute the SQL script:**
   - Run `/scripts/018_sample_course_data.sql` in your Supabase SQL editor
   - This creates 4 courses, 9 units, and 15 lessons

2. **Build the lesson player UI:**
   - Read `COURSE_IMPLEMENTATION_GUIDE.md` for detailed UI requirements
   - Create components for each lesson type (progressive_reveal, output_challenge, etc.)
   - The content_data JSONB field contains everything needed to render

3. **Allow teachers to assign lessons:**
   - Add lesson assignment interface to teacher dashboard
   - Teachers browse courses → select lessons → assign to classroom with due date

4. **Student views assigned lessons:**
   - Query `lesson_assignments` joined with student's classrooms
   - Show in student dashboard: "Assignments Due"
   - Link to lesson player

5. **Track student progress:**
   - Insert/update `student_lesson_progress` as student works
   - Track `status`, `progress_percentage`, `time_spent_minutes`, `score`
   - Store student work in `work_data` JSONB field

---

## Summary

- **4 courses** covering AP CSP, AP CSA, Foundational CS, and IST
- **9 units** organizing content into logical groups
- **15 lessons** using 4 different learning methods
- **Ready to assign** - teachers can create assignments immediately
- **Extensible** - easy to add more courses/units/lessons following same pattern

All data uses fixed UUIDs for easy reference and testing. Ready for production use!
