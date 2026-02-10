# Averon CodeLab - Complete Role & Course System Guide

**Last Updated:** February 10, 2026  
**Version:** 3.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Course Categories System](#course-categories-system)
4. [Payment & Access Control](#payment--access-control)
5. [Course Enrollment Flow](#course-enrollment-flow)
6. [Progress Tracking](#progress-tracking)
7. [Multi-Course Management](#multi-course-management)
8. [Database Schema Reference](#database-schema-reference)
9. [Common Scenarios](#common-scenarios)

---

## System Overview

Averon CodeLab is a comprehensive coding education platform with:
- **5 User Roles** with distinct permissions and capabilities
- **2 Course Categories** (Self-Paced and Class-Based)
- **Payment-Gated Access** with classroom enrollment requirements
- **Multi-Course Support** allowing students to take multiple courses simultaneously
- **Comprehensive Progress Tracking** with certificates and analytics

### Core Principles

1. **All courses require payment** - No free access without proper enrollment
2. **Students must be enrolled in a classroom** - Even for self-paced courses
3. **Role-based permissions** - Each role has specific capabilities and limitations
4. **District-first approach** - Platform designed for school districts and institutions

---

## Role Hierarchy

### Overview

```
Full Admin (Superuser)
    ↓
District Admin
    ↓
Teacher (Trial or District Mode)
    ↓
Student
```

---

### 1. Full Admin (`full_admin`)

**Purpose:** System administrator with complete control over the entire platform.

**Access Level:** Global - can see and modify everything

**Key Capabilities:**
- Create and manage all districts
- Assign district administrators
- Approve/reject class creation requests from district admins
- Create standalone classrooms (direct sale)
- Manage all courses and course categories
- View all users, enrollments, and activity
- Configure payment settings
- Generate system-wide reports
- Override any permission restriction

**Cannot Do:**
- N/A (has all permissions)

**How to Set:**
```sql
UPDATE profiles 
SET role = 'full_admin' 
WHERE email = 'admin@example.com';
```

**Dashboard Location:** `/admin/panel`

---

### 2. District Admin (`district_admin`)

**Purpose:** Manages a school district's classrooms, teachers, and courses.

**Access Level:** District-scoped - can only see/manage their assigned district(s)

**Key Capabilities:**
- Request new classrooms for their district (requires Full Admin approval)
- Assign teachers to classrooms within their district
- View all students enrolled in district classrooms
- Monitor district-wide analytics and progress
- Manage district settings and preferences
- View district subscription status
- Export district data for FERPA compliance

**Cannot Do:**
- Approve their own class requests (needs Full Admin)
- Access other districts' data
- Create or modify courses
- Change district subscription plans
- Assign district admins (only Full Admin can)

**How to Assign:**
```sql
INSERT INTO district_admins (admin_id, district_id, assigned_by)
VALUES ('user-uuid', 'district-uuid', 'full-admin-uuid');
```

**Automatic Assignment:**
- When a user signs up and enters a valid district code during onboarding
- Their profile role is automatically set to `district_admin`

**Dashboard Location:** `/district/admin`

---

### 3. Teacher (`teacher`)

Teachers have two modes: **Trial** and **District**

#### Trial Mode Teachers (`teacher_mode = 'trial'`)

**Purpose:** Individual teachers trying out the platform with limited access.

**Access Level:** Own classrooms only - limited to 50 students and 90 days

**Key Capabilities:**
- Create up to 3 trial classrooms
- Enroll up to 50 students total across all classrooms
- Create assignments and grade submissions
- View student progress in their classes
- Access for 90 days from trial start
- Can upgrade to district mode

**Cannot Do:**
- Access after trial expires (90 days)
- Exceed 50 student limit
- Create unlimited classrooms
- Access district features
- View other teachers' data

**Trial Status Check:**
```sql
SELECT 
  trial_start_date,
  trial_end_date,
  EXTRACT(DAY FROM (trial_end_date - NOW())) as days_remaining,
  trial_student_count
FROM profiles
WHERE id = 'teacher-uuid';
```

#### District Mode Teachers (`teacher_mode = 'district'`)

**Purpose:** Licensed teachers within a school district with full access.

**Access Level:** District classrooms - can manage assigned classes

**Key Capabilities:**
- Manage classrooms assigned by district admin
- Unlimited students (within district limits)
- No time restrictions
- Create/modify assignments
- Grade and provide feedback
- Track student mastery
- Export class data
- Collaborate with other district teachers

**Cannot Do:**
- Create classrooms (district admin does this)
- Access other districts' data
- Approve class requests
- Manage district subscriptions

**Dashboard Location:** `/teacher/dashboard`

---

### 4. Student (`student`)

**Purpose:** Learn through courses, complete assignments, and track progress.

**Access Level:** Own enrollments - can only see courses they're enrolled in and classrooms they've joined

**Key Capabilities:**
- Join classrooms using class codes
- Enroll in courses (requires payment + classroom enrollment)
- Complete lessons and checkpoints
- Submit assignments to teachers
- Track own progress across all enrolled courses
- View grades and feedback
- Earn badges and maintain streaks
- Take multiple courses simultaneously
- Download certificates upon completion

**Cannot Do:**
- Access courses without payment AND classroom enrollment
- View other students' work or progress
- Create or modify course content
- Grade assignments
- Join classrooms without valid codes
- Access expired or inactive courses

**Access Verification:**
Students must satisfy BOTH conditions to access a course:
1. **Be enrolled in at least one active classroom** (any classroom, doesn't need to be course-specific)
2. **Have a paid course enrollment** (payment_status = 'paid', 'free', or 'trial')

**Dashboard Location:** `/student/dashboard`

---

### 5. School Admin (`school_admin`)

**Purpose:** Manages a single school within a district (multi-school districts).

**Access Level:** School-scoped - can manage their school's classrooms and teachers

**Key Capabilities:**
- View all classrooms in their school
- Assign teachers to school classrooms
- Monitor school-level analytics
- Manage school settings
- Export school data

**Cannot Do:**
- Access other schools in the district
- Create districts
- Manage district-wide settings
- Approve class requests (done by district admin)

**Dashboard Location:** `/school/admin`

---

## Course Categories System

### Overview

Courses are organized into **two main categories** that determine their learning style and enrollment requirements.

---

### Category 1: Self-Paced Courses

**Description:** Students learn independently at their own speed, completing lessons and checkpoints on their schedule.

**Category Type:** `self_paced`

**Icon:** BookOpen  
**Color:** Cyan

**Characteristics:**
- No fixed schedule or deadlines (unless set by teacher)
- Students progress through units and lessons independently
- Auto-graded checkpoints provide immediate feedback
- Can pause and resume anytime
- Certificate awarded upon 100% completion

**Current Courses in This Category:**
1. **Python Fundamentals** - Learn Python basics (40 hours, Beginner)
2. **JavaScript Essentials** - Master JavaScript fundamentals (35 hours, Beginner)
3. **Java Programming** - Object-oriented programming with Java (50 hours, Intermediate)
4. **C++ Mastery** - Advanced C++ concepts (60 hours, Advanced)

**Access Requirements:**
- Must be enrolled in at least one active classroom
- Must have paid enrollment for the specific course
- Payment can be individual or through district subscription

**Use Cases:**
- Summer learning programs
- Enrichment activities
- Self-study and remediation
- Advanced students moving at faster pace
- Homework and practice outside class time

---

### Category 2: Class-Based Courses

**Description:** Structured curriculum designed for classroom instruction with teacher guidance, specific schedules, and collaborative learning.

**Category Type:** `class_based`

**Icon:** Users  
**Color:** Blue

**Characteristics:**
- Teacher-led instruction
- Synchronized pacing for whole class
- Assignments with specific due dates
- Peer collaboration features
- Teacher-graded assessments
- Follows academic calendar

**Current Courses in This Category:**
1. **AP Computer Science Principles** - College Board AP CSP curriculum (120 hours, Intermediate, Python)
2. **AP Computer Science A** - College Board AP CS A curriculum (150 hours, Advanced, Java)
3. **Foundational Computer Science** - Intro to CS principles (80 hours, Beginner, Python)
4. **Information Systems Technology (IST)** - Database, web dev, and IT applications (100 hours, Intermediate, JavaScript)

**Access Requirements:**
- Must be enrolled in a classroom that is teaching this specific course
- Classroom must be linked to this course (classroom.course_id)
- District must have active subscription OR student must have individual paid enrollment
- Teacher must assign access to the course

**Use Cases:**
- Regular school courses
- AP exam preparation
- Semester-long classes
- Certification programs
- Bootcamp-style intensive learning

---

## Payment & Access Control

### Payment Models

#### 1. Individual Student Payments

Students (or parents) pay directly for course access.

**Process:**
1. Student signs up and joins a classroom (free)
2. Student browses course catalog
3. Student clicks "Enroll" on a course
4. Payment prompt appears (Stripe integration - coming soon)
5. After payment, enrollment created with `payment_status = 'paid'`
6. Student gains immediate access to course

**Database Flow:**
```
student_payments
  ↓
enrollment_payments (links payment to enrollment)
  ↓
course_enrollments (status = 'paid')
```

---

#### 2. District Subscriptions

Districts purchase bulk access for all their students.

**Process:**
1. Full Admin creates district subscription
2. Subscription includes seat count and duration
3. All students in district classrooms automatically get access
4. No individual payments required
5. District admin monitors seat usage

**Subscription Tiers:**
- **Trial**: 30 days, 50 seats, Free
- **Starter**: Annual, 100 seats, $2,000/year
- **Professional**: Annual, 500 seats, $8,000/year
- **Enterprise**: Annual, Unlimited seats, Custom pricing

**Database:**
```sql
CREATE TABLE district_subscriptions (
  district_id UUID,
  subscription_type TEXT, -- 'trial', 'annual', 'monthly'
  status TEXT, -- 'active', 'cancelled', 'expired'
  seats_included INTEGER,
  seats_used INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
);
```

---

#### 3. Free/Trial Course Access

Limited access for evaluation purposes.

**Conditions:**
- Teacher in trial mode can grant trial access to specific students
- Maximum 7 days per course
- Watermarked certificates
- Limited to trial-accessible courses only

**Database:**
```
course_enrollments
  payment_status = 'trial'
  enrollment_source = 'teacher_grant'
```

---

### Access Control Logic

#### Function: `student_has_course_access()`

This PostgreSQL function determines if a student can access a course.

**Returns:** Boolean (true = access granted)

**Checks (in order):**
1. Does student have active course enrollment with paid status?
2. Is student enrolled in ANY active classroom?
3. Does student's district have active subscription?

**SQL Implementation:**
```sql
SELECT public.student_has_course_access(
  'student-uuid',
  'course-uuid'
) as has_access;
```

**Used in:**
- Course catalog (show "Enroll" vs "Continue Learning")
- Course detail pages (gate access)
- Lesson viewer (verify before loading content)
- API endpoints (authorization checks)

---

## Course Enrollment Flow

### Scenario 1: Self-Paced Course Enrollment

**Student Journey:**

1. **Join a Classroom**
   - Student receives class code from teacher
   - Enters code at `/join` or during signup
   - Enrollment created in `enrollments` table
   - Classroom can be ANY active class (doesn't need to match course)

2. **Browse Course Catalog**
   - Navigate to `/courses`
   - See all available self-paced courses
   - Locked icon shown on courses not yet enrolled

3. **Select a Course**
   - Click on desired course
   - View course details, syllabus, units
   - See estimated time and difficulty

4. **Enroll in Course**
   - Click "Enroll Now" button
   - Payment modal appears (if not covered by district)
   - Enter payment details
   - Submit payment

5. **Payment Processing**
   - Stripe payment processed
   - Record created in `student_payments`
   - Link created in `enrollment_payments`
   - Enrollment created in `course_enrollments`
   - `payment_status = 'paid'`
   - `status = 'active'`

6. **Start Learning**
   - Redirect to `/courses/[courseId]`
   - View course dashboard with units and lessons
   - Begin first lesson
   - `started_at` timestamp recorded

7. **Progress Through Course**
   - Complete lessons in order (or as configured)
   - Complete checkpoints (auto-graded)
   - Progress tracked in real-time
   - Return anytime to continue

8. **Course Completion**
   - All lessons and checkpoints completed
   - `status = 'completed'`
   - `completed_at` timestamp recorded
   - Certificate generated
   - `certificate_issued = true`

---

### Scenario 2: Class-Based Course Enrollment

**Teacher-Led Flow:**

1. **District Admin Creates Classroom**
   - Creates class request linked to specific course
   - Example: "AP CS A - Period 3"
   - `course_id` set to AP CS A course

2. **Full Admin Approves**
   - Reviews request in admin panel
   - Approves classroom
   - `is_active = true`

3. **Teacher Gets Assignment**
   - District admin assigns teacher to classroom
   - Teacher can now manage class

4. **Students Join Classroom**
   - Receive class code from teacher
   - Join using code
   - Automatic enrollment in linked course
   - No additional payment if district subscription active

5. **Synchronized Learning**
   - Teacher sets lesson schedule
   - Students complete assigned lessons
   - Teacher creates assignments from course content
   - Grades and feedback provided by teacher

6. **Course Completion**
   - Teacher marks course as complete
   - Certificates issued to all passing students

---

### Scenario 3: Multiple Course Enrollment

**Student with Multiple Courses:**

1. Student joins classroom (satisfies classroom requirement)

2. Enrolls in **Python Fundamentals** (self-paced)
   - Pays $49 or covered by district
   - Starts learning Python

3. While Python course in progress, enrolls in **JavaScript Essentials**
   - Separate payment (or same district subscription)
   - Now has 2 active enrollments

4. **Dashboard View:**
   - Shows both courses with individual progress bars
   - "Python: 34% complete"
   - "JavaScript: 12% complete"

5. **Switching Between Courses:**
   - Click "Continue" on any course
   - Last lesson position remembered for each
   - Independent progress tracking

6. **Completion:**
   - Each course completes independently
   - Separate certificates issued
   - Can continue other courses

**Database State:**
```sql
-- Two separate enrollments
course_enrollments:
  - student_id: 'abc', course_id: 'python', progress: 34%, status: 'active'
  - student_id: 'abc', course_id: 'javascript', progress: 12%, status: 'active'
  
-- Lesson completions tracked per enrollment
student_lesson_completions:
  - student_id: 'abc', lesson_id: 'py-lesson-5', course_enrollment_id: 'enroll-1'
  - student_id: 'abc', lesson_id: 'js-lesson-2', course_enrollment_id: 'enroll-2'
```

---

## Progress Tracking

### Lesson Completion

**When:** Student completes all content and checkpoints in a lesson

**Tracked in:** `student_lesson_completions`

**Data Recorded:**
- Student ID
- Lesson ID
- Course enrollment ID
- Completion timestamp
- Time spent (minutes)
- Optional notes

**Progress Calculation:**
```
Lesson Progress = (Lessons Completed / Total Lessons) × 100
```

---

### Checkpoint Attempts

**When:** Student submits code for a checkpoint problem

**Tracked in:** `checkpoint_attempts`

**Data Recorded:**
- Student ID
- Checkpoint ID
- Code submitted
- Pass/fail status
- Score (0-100)
- Tests passed / total tests
- Execution time
- Error messages (if failed)
- Attempt timestamp

**Multiple Attempts:**
- Students can retry checkpoints unlimited times
- Best score recorded in enrollment progress
- All attempts saved for teacher review

---

### Overall Course Progress

**Calculation:** Function `calculate_course_progress()`

**Formula:**
```
Progress % = (Completed Lessons / Total Lessons) × 100
```

**Also Considers:**
- Checkpoint completion (must pass all checkpoints in a lesson)
- Time spent (for analytics)
- Lesson sequence (if enforced)

**Updated:**
- Real-time after each lesson completion
- Visible on student dashboard
- Visible to teachers in class view

---

### Course Status Lifecycle

```
pending → active → completed
           ↓
        dropped (student withdraws)
           ↓
       suspended (district expires, payment fails)
```

**Status Definitions:**

- **pending**: Enrollment created but course not started
- **active**: Student actively working on course
- **completed**: All requirements met, certificate issued
- **dropped**: Student voluntarily withdrew
- **suspended**: Access revoked (payment/subscription issue)

---

## Multi-Course Management

### How Students Take Multiple Courses

**Supported:** Yes - Students can enroll in unlimited courses simultaneously

**Requirements for Each Course:**
- Individual payment OR covered by district subscription
- Active classroom enrollment (shared across all courses)
- Sufficient time and commitment (student's responsibility)

### Dashboard Experience

**Student Dashboard (`/student/dashboard`):**

Shows all enrolled courses in cards:

```
[Course Card 1: Python Fundamentals]
- Progress: 45%
- Current Lesson: "Functions and Modules"
- Next Deadline: March 15
- [Continue Learning →]

[Course Card 2: AP CS Principles]
- Progress: 22%
- Current Lesson: "Binary and Data"
- Next Deadline: March 12
- [Continue Learning →]

[Course Card 3: Java Programming]  
- Progress: 67%
- Current Lesson: "Inheritance"
- Next Assignment Due: Tomorrow
- [Continue Learning →]
```

### Course Switching

**Seamless Navigation:**
- Click "Continue Learning" on any course card
- System remembers last position in each course
- Independent progress bars
- Separate completion tracking

**Stored Per Enrollment:**
```sql
course_enrollments:
  current_lesson_id: UUID -- Last lesson student was on
  last_accessed: TIMESTAMP -- Last time student opened course
  progress_percentage: NUMERIC -- Current completion %
```

### Notifications & Reminders

**Multi-Course Awareness:**
- Students notified of upcoming deadlines across all courses
- Progress reminders for courses not accessed in 7 days
- Achievement notifications per course
- Weekly digest showing progress in all active courses

---

## Database Schema Reference

### Core Tables

#### `profiles`
```sql
- id UUID (references auth.users)
- email TEXT
- full_name TEXT
- role TEXT ('full_admin', 'district_admin', 'teacher', 'student', 'school_admin')
- teacher_mode TEXT ('trial', 'district')
- trial_start_date TIMESTAMPTZ
- trial_end_date TIMESTAMPTZ
- trial_student_count INTEGER
- is_active BOOLEAN
```

#### `districts`
```sql
- id UUID
- name TEXT
- description TEXT
- district_code TEXT UNIQUE
- plan_tier TEXT ('starter', 'professional', 'enterprise')
- max_students INTEGER
- max_teachers INTEGER
- is_active BOOLEAN
```

#### `classrooms`
```sql
- id UUID
- name TEXT
- description TEXT
- code TEXT UNIQUE -- Join code for students
- teacher_id UUID
- district_id UUID
- course_id UUID -- For class-based courses
- is_active BOOLEAN
- max_students INTEGER
```

#### `enrollments`
```sql
- id UUID
- classroom_id UUID
- student_id UUID
- enrolled_at TIMESTAMPTZ
```

#### `course_categories`
```sql
- id UUID
- name TEXT
- slug TEXT ('self-paced', 'class-based')
- category_type TEXT
- description TEXT
- is_active BOOLEAN
```

#### `courses`
```sql
- id UUID
- name TEXT
- description TEXT
- language TEXT ('python', 'javascript', 'java', 'cpp')
- level TEXT ('beginner', 'intermediate', 'advanced')
- difficulty_level TEXT
- estimated_hours INTEGER
- category_id UUID (references course_categories)
- requires_payment BOOLEAN
- requires_classroom_enrollment BOOLEAN
- is_trial_accessible BOOLEAN
- is_active BOOLEAN
```

#### `course_enrollments`
```sql
- id UUID
- student_id UUID
- course_id UUID
- classroom_id UUID (which classroom granted access)
- payment_status TEXT ('pending', 'paid', 'free', 'trial')
- enrollment_source TEXT ('direct', 'classroom', 'district', 'admin')
- status TEXT ('active', 'completed', 'dropped', 'suspended')
- started_at TIMESTAMPTZ
- completed_at TIMESTAMPTZ
- progress_percentage NUMERIC
- current_lesson_id UUID
- lessons_completed INTEGER
- checkpoints_completed INTEGER
- certificate_issued BOOLEAN
```

#### `student_lesson_completions`
```sql
- id UUID
- student_id UUID
- lesson_id UUID
- course_enrollment_id UUID
- completed_at TIMESTAMPTZ
- time_spent_minutes INTEGER
```

#### `checkpoint_attempts`
```sql
- id UUID
- student_id UUID
- checkpoint_id UUID
- course_enrollment_id UUID
- code_submitted TEXT
- passed BOOLEAN
- score NUMERIC
- tests_passed INTEGER
- tests_total INTEGER
- attempted_at TIMESTAMPTZ
```

#### `district_subscriptions`
```sql
- id UUID
- district_id UUID
- subscription_type TEXT ('trial', 'monthly', 'annual', 'perpetual')
- status TEXT ('active', 'cancelled', 'expired', 'suspended')
- start_date TIMESTAMPTZ
- end_date TIMESTAMPTZ
- seats_included INTEGER
- seats_used INTEGER
```

---

## Common Scenarios

### Scenario 1: Setting Up a New District

**Actors:** Full Admin, District Contact

**Steps:**

1. Full Admin creates district:
```sql
INSERT INTO districts (name, district_code, max_students, max_teachers)
VALUES ('Springfield School District', 'SPRING2026', 1000, 50);
```

2. Full Admin shares district code with district contact

3. District contact signs up and enters code during onboarding

4. System automatically creates district admin:
```sql
INSERT INTO district_admins (admin_id, district_id)
VALUES ('new-user-uuid', 'district-uuid');

UPDATE profiles SET role = 'district_admin' WHERE id = 'new-user-uuid';
```

5. District Admin can now request classrooms

---

### Scenario 2: Student Taking First Course

**Actors:** Student, Teacher

**Steps:**

1. Teacher creates classroom and shares code

2. Student signs up at `/auth/signup`

3. Student joins classroom with code:
```sql
INSERT INTO enrollments (classroom_id, student_id)
VALUES ('classroom-uuid', 'student-uuid');
```

4. Student browses courses at `/courses`

5. Student clicks "Enroll" on "Python Fundamentals"

6. Payment processed (or district subscription covers it)

7. Enrollment created:
```sql
INSERT INTO course_enrollments (
  student_id, 
  course_id, 
  classroom_id,
  payment_status, 
  status,
  enrollment_source
)
VALUES (
  'student-uuid', 
  'python-course-uuid',
  'classroom-uuid',
  'paid', 
  'active',
  'direct'
);
```

8. Student redirected to `/courses/[courseId]` and begins learning

---

### Scenario 3: Teacher Checking Student Progress

**Actors:** Teacher

**Steps:**

1. Teacher logs in and navigates to `/teacher/dashboard`

2. Selects a classroom to view

3. Sees list of all enrolled students

4. Clicks on student name

5. Views student's progress across all courses:
   - Courses enrolled in
   - Progress percentage
   - Last accessed date
   - Lessons completed
   - Checkpoints passed/failed
   - Time spent

6. Can drill down to see:
   - Specific lesson completions
   - Checkpoint attempts and code submissions
   - Assignment submissions and grades

---

### Scenario 4: District Admin Requesting a Class

**Actors:** District Admin, Full Admin

**Steps:**

1. District Admin logs into `/district/admin`

2. Clicks "Request New Class"

3. Fills in form:
   - Class Name: "AP Computer Science A - Period 3"
   - Course: "AP CS A"
   - Description: "Advanced Java programming for seniors"
   - Max Students: 30

4. Submits request:
```sql
INSERT INTO classrooms (name, course_id, district_id, teacher_id, pending_activation)
VALUES ('AP CS A - Period 3', 'ap-cs-a-uuid', 'district-uuid', NULL, true);

INSERT INTO class_requests (classroom_id, district_id, requested_by, status)
VALUES ('new-classroom-uuid', 'district-uuid', 'district-admin-uuid', 'pending');
```

5. Full Admin sees request in admin panel

6. Full Admin reviews and approves:
```sql
UPDATE classrooms 
SET is_active = true, pending_activation = false, activated_at = NOW()
WHERE id = 'new-classroom-uuid';

UPDATE class_requests 
SET status = 'approved', reviewed_at = NOW(), reviewed_by = 'full-admin-uuid'
WHERE classroom_id = 'new-classroom-uuid';
```

7. District Admin assigns teacher to classroom

8. Classroom is now active and ready for student enrollment

---

### Scenario 5: Student Completing a Course

**Actors:** Student

**Steps:**

1. Student working through course lessons

2. Completes final lesson:
```sql
INSERT INTO student_lesson_completions (student_id, lesson_id, course_enrollment_id)
VALUES ('student-uuid', 'final-lesson-uuid', 'enrollment-uuid');
```

3. System calculates progress:
```sql
SELECT calculate_course_progress('student-uuid', 'course-uuid');
-- Returns: 100.00
```

4. System checks if all requirements met:
   - All lessons completed
   - All checkpoints passed
   - Any required assignments submitted

5. System updates enrollment:
```sql
UPDATE course_enrollments
SET 
  status = 'completed',
  completed_at = NOW(),
  progress_percentage = 100,
  certificate_issued = true,
  certificate_issued_at = NOW()
WHERE id = 'enrollment-uuid';
```

6. Student sees completion modal with certificate

7. Certificate available for download in student dashboard

---

## Quick Reference Commands

### Check User Role
```sql
SELECT email, role, teacher_mode 
FROM profiles 
WHERE id = 'user-uuid';
```

### Check Course Access
```sql
SELECT student_has_course_access('student-uuid', 'course-uuid');
```

### View Student's Enrollments
```sql
SELECT 
  c.name as course_name,
  ce.status,
  ce.progress_percentage,
  ce.payment_status,
  ce.started_at
FROM course_enrollments ce
JOIN courses c ON ce.course_id = c.id
WHERE ce.student_id = 'student-uuid'
  AND ce.is_active = true;
```

### Check District Subscription
```sql
SELECT 
  subscription_type,
  status,
  seats_included,
  seats_used,
  end_date
FROM district_subscriptions
WHERE district_id = 'district-uuid'
  AND status = 'active';
```

### View Classroom Enrollments
```sql
SELECT 
  p.full_name,
  p.email,
  e.enrolled_at
FROM enrollments e
JOIN profiles p ON e.student_id = p.id
WHERE e.classroom_id = 'classroom-uuid'
ORDER BY e.enrolled_at DESC;
```

---

## Support & Troubleshooting

### Student Can't Access Course

**Check:**
1. Is student enrolled in a classroom?
2. Does student have paid course enrollment?
3. Is classroom active?
4. Is course active?
5. Has district subscription expired?

**SQL Debug:**
```sql
-- Check classroom enrollment
SELECT * FROM enrollments WHERE student_id = 'student-uuid';

-- Check course enrollment
SELECT * FROM course_enrollments 
WHERE student_id = 'student-uuid' AND course_id = 'course-uuid';

-- Check payment status
SELECT payment_status, status FROM course_enrollments
WHERE student_id = 'student-uuid' AND course_id = 'course-uuid';
```

---

### Teacher Can't Create Classroom

**Check:**
1. Is teacher in trial mode? (trial teachers can't create classes, district admin does)
2. Has trial expired?
3. Has reached trial student limit?

**SQL Debug:**
```sql
SELECT 
  role,
  teacher_mode,
  trial_end_date,
  trial_student_count,
  is_active
FROM profiles
WHERE id = 'teacher-uuid';
```

---

### District Admin Request Not Showing

**Check:**
1. Is request status 'pending'?
2. Is Full Admin logged in?
3. Database sync issues?

**SQL Debug:**
```sql
SELECT * FROM class_requests WHERE status = 'pending';
```

---

## API Endpoints Reference

### Student Endpoints

- `GET /api/student/courses` - List available courses
- `POST /api/student/enroll` - Enroll in course
- `GET /api/student/progress/:courseId` - Get course progress
- `POST /api/student/complete-lesson` - Mark lesson complete
- `POST /api/student/submit-checkpoint` - Submit checkpoint code

### Teacher Endpoints

- `GET /api/teacher/classrooms` - List teacher's classrooms
- `GET /api/teacher/students/:classroomId` - View classroom students
- `GET /api/teacher/progress/:studentId/:courseId` - View student progress
- `POST /api/teacher/grade-assignment` - Grade student submission

### Admin Endpoints

- `GET /api/admin/districts` - List all districts
- `POST /api/admin/create-district` - Create new district
- `GET /api/admin/requests` - View pending requests
- `POST /api/admin/approve-request` - Approve class request
- `GET /api/admin/analytics` - System-wide analytics

---

*For additional support or questions, contact the development team or refer to the technical documentation.*
