Averon Code Lab — Features

═══════════════════════════════════════════════════════════════════════════════
USER HIERARCHY STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

Level 1: FULL ADMIN (Platform Owner)
├── Full control over the entire platform
├── Creates and manages Districts
├── Approves/Rejects class creation requests from District Admins
├── Assigns District Admins to Districts
├── Manages available courses (Python, JavaScript, Java, C++)
├── Views all analytics and activity logs
└── Access: /admin/panel

Level 2: DISTRICTS
├── Containers for schools/organizations
├── Each has a unique District Code
├── Configuration: max_classes, max_teachers, max_students
└── Managed by one or more District Admins

Level 3: DISTRICT ADMIN
├── Manages a specific district
├── Creates classes (must be approved by Full Admin)
├── Assigns teachers to classes
├── Views district-wide analytics
├── Cannot directly control student enrollment
└── Access: /district/[id]/dashboard

Level 4: TEACHER
├── Owns and manages assigned classes
├── Creates assignments for their courses
├── Controls assignment visibility (show/hide, scheduling)
├── Grades student submissions
├── Views class analytics and student progress
└── Access: /teacher/dashboard

Level 5: STUDENT
├── Lowest privilege level - the learners
├── Enrolls in classes via class codes
├── Views only visible assignments
├── Submits code solutions
├── Receives grades and feedback
└── Access: /student/dashboard

═══════════════════════════════════════════════════════════════════════════════
IMPLEMENTED FEATURES
═══════════════════════════════════════════════════════════════════════════════

Implemented (working now)
- Authentication: sign-up, login, role-based routing (Supabase)
- Role dashboards: Full Admin, District Admin, Teacher (trial & full), Student
- Course system: course browser, course detail, enrollment, lesson viewer
- Lesson viewer: content + code editor + mock test runner
- Progress tracking: `student_lesson_progress`, `checkpoint_submissions`
- Checkpoint system: problems, starter code, test cases (simulated execution)
- Class & district flows: class codes, class requests, approval workflow
- Trial flows: teacher trial onboarding and limits
- RLS security and DB schema for core tables
- Visual design: consistent black theme, gradients, responsive UI

Planned / To be added (priority order)
1. Real code execution engine (Judge0, Piston or hosted runner)
2. Payment/subscriptions (Stripe integration for teacher/district billing)
3. SSO (Google Workspace, Microsoft AD) and LMS integrations (Canvas, PowerSchool)
4. Full analytics pipeline: nightly aggregates, concept-level dashboards, materialized views
5. Video lessons and richer lesson content (media hosting, CDN)
6. Teacher grading UI (bulk grading, feedback templates, partial credit support)
7. Assignment templates library and marketplace
8. Parent/guardian reports and email notifications (trial expiry, approvals)
9. Robust export features: FERPA-compliant snapshots, CSV/JSON grade exports
10. Admin automation: auto-approve within seat limits, renewal automation
11. Gamification expansions: leaderboards, certificates, more badges
12. Performance & infra: Redis caching, CDN, connection pooling, runner autoscaling

Notes
- Prioritize a secure, resource-isolated code runner before enabling broad auto-grading for arbitrary student code.
- Payment and SSO are prerequisites for commercial district sales.
- Analytics should start with a few essential materialized views for teacher dashboards, then iterate.

═══════════════════════════════════════════════════════════════════════════════
DETAILED FLOW GUIDE
═══════════════════════════════════════════════════════════════════════════════

## 1. AUTHENTICATION & ONBOARDING FLOWS

### Teacher Trial Flow
1. New teacher signs up for trial account
2. Gets trial access with limitations (number of students/features/duration)
3. Can experience platform before purchasing
4. Trial expiry triggers notifications (planned feature #8)
5. Teacher can upgrade to full subscription via Stripe (planned #2)

### Teacher Full Account Flow
1. Teacher purchases subscription through Stripe integration
2. Gets full access to create classes, assign courses, view analytics
3. Can manage multiple classes and districts
4. No limitations on student count (within purchased seats)

### District Admin Flow
1. District-level account created by Full Admin
2. Receives District Code and access credentials
3. Manages multiple teachers and schools within district
4. Creates class requests (requires Full Admin approval)
5. Manages seat allocations across schools
6. Views district-wide analytics and reports

### Student Onboarding
1. Student receives class code from teacher
2. Student submits class request using the code
3. Approval workflow: Teacher/admin reviews and approves request
4. Student gains access to class courses and lessons
5. Student dashboard shows enrolled classes and assignments

## 2. DISTRICT & CLASS MANAGEMENT FLOWS

### District Creation (Full Admin)
1. Full Admin creates new district in /admin/panel
2. Assigns district name, configuration (max_classes, max_teachers, max_students)
3. Generates unique District Code
4. Assigns District Admin(s) to manage the district
5. District appears in Full Admin's district list

### Class Creation & Approval Workflow
1. District Admin creates class request
   - Class name, grade level, subject
   - Assigns teacher to the class
   - Selects course(s) to be taught
2. Request appears in Full Admin's approval queue
3. Full Admin reviews request:
   - Checks district seat availability
   - Reviews class configuration
   - Approves or rejects with reason
4. On approval:
   - Class becomes active
   - Unique class code generated
   - Teacher gains access to class dashboard
   - Teacher can share class code with students
5. On rejection:
   - District Admin notified with rejection reason
   - Can modify and resubmit

### Teacher Assigns Class to Students
1. Teacher creates or selects existing class
2. System generates unique class code
3. Teacher shares code with students (email, LMS, in-person)
4. Students use code to request enrollment
5. Teacher reviews and approves enrollment requests
6. Approved students added to class roster
7. Students automatically enrolled in class-assigned courses

## 3. COURSE & LEARNING FLOWS

### Course Discovery & Enrollment
```
Student Dashboard → Course Browser → Course Detail Page → Enroll → Access Lessons
```
1. Student navigates to course browser
2. Views available courses (filtered by enrolled classes)
3. Clicks course to view details (description, syllabus, lessons)
4. Enrolls in course (or auto-enrolled via class assignment)
5. Course appears in student's active courses
6. Student can access lesson sequence

### Lesson Experience Flow
```
Lesson Viewer = Content Panel + Code Editor + Test Runner
```
**Current Implementation:**
1. Student opens lesson from course
2. Views instructional content (text-based currently)
3. Reads lesson objectives and instructions
4. Writes code in integrated code editor
5. Runs mock test runner (simulated execution)
6. Views test results (pass/fail feedback)
7. Progress tracked in `student_lesson_progress` table
8. Moves to next lesson when ready

**Planned Enhancement (#1 - Real Code Execution):**
1. Student writes code in editor
2. Clicks "Run Tests"
3. Code sent to secure execution engine (Judge0/Piston)
4. Code executed in isolated sandbox environment
5. Test cases run against code
6. Real results returned (stdout, stderr, test pass/fail)
7. Detailed feedback provided to student
8. Progress and attempts recorded

### Checkpoint/Assessment Flow
```
Lesson → Checkpoint Problem → Starter Code → Write Solution → Run Tests → Submit → Auto-Grade
```
**Current Implementation:**
1. Student reaches checkpoint in lesson sequence
2. Views checkpoint problem description and requirements
3. Loads starter code (boilerplate/template provided)
4. Writes solution to meet requirements
5. Runs simulated test cases
6. Reviews pass/fail results
7. Submits solution to `checkpoint_submissions` table
8. Teacher reviews submission (manual grading currently)
9. Student receives grade and feedback

**Planned Enhancement (#1 + #6):**
1. Real code execution with actual test cases
2. Automatic grading based on test pass rate
3. Teacher grading UI for manual review:
   - Bulk grading interface
   - View student code side-by-side with solution
   - Provide inline feedback and comments
   - Assign partial credit for partially correct solutions
   - Use feedback templates for common issues
4. Student receives immediate auto-grade + teacher feedback
5. Detailed analytics on which test cases passed/failed

## 4. ASSIGNMENT & GRADING FLOWS

### Teacher Creates Assignment
1. Teacher navigates to class dashboard
2. Clicks "Create Assignment"
3. Configures assignment:
   - Selects course/lesson/checkpoint
   - Sets due date and time
   - Configures visibility (show now, schedule for later)
   - Sets point value and grading criteria
   - Adds custom instructions or requirements
4. Saves assignment
5. Assignment appears to students based on visibility settings

### Assignment Visibility Control
1. Teacher can show/hide assignments dynamically
2. Schedule assignments to appear at specific date/time
3. Lock assignments after due date (no late submissions)
4. Or allow late submissions with penalty
5. Control whether students see test cases before submission

### Student Completes Assignment
1. Student views assignment in dashboard
2. Clicks assignment to open lesson/checkpoint
3. Completes coding problem
4. Submits before due date
5. Receives confirmation of submission
6. Can resubmit if allowed by teacher settings
7. Views grade and feedback when available

### Teacher Grades Assignment (Planned #6)
1. Teacher views submission queue
2. Filters by class, assignment, or student
3. Reviews student code:
   - View side-by-side with solution/rubric
   - See test case results
   - Check code quality, style, efficiency
4. Provides feedback:
   - Inline code comments
   - General feedback text
   - Use feedback templates for common issues
5. Assigns grade:
   - Full credit, partial credit, or zero
   - Override auto-grade if needed
6. Submits grade
7. Student receives notification with grade and feedback
8. Grade recorded in gradebook

### Bulk Grading (Planned #6)
1. Teacher selects multiple submissions
2. Views common patterns or issues
3. Applies feedback template to multiple submissions
4. Assigns same grade to similar solutions
5. Reviews outliers individually
6. Submits all grades at once

## 5. PROGRESS TRACKING & ANALYTICS FLOWS

### Current State - Student Progress
- `student_lesson_progress` table tracks:
  - Lesson started/completed timestamps
  - Time spent on each lesson
  - Number of attempts
  - Completion status
- `checkpoint_submissions` table stores:
  - Code submissions
  - Test results (simulated currently)
  - Submission timestamps
  - Grade (when assigned)

### Current State - Teacher Views
1. Teacher opens class dashboard
2. Views class roster with student progress
3. Sees individual student:
   - Lessons completed
   - Assignments submitted/pending
   - Current grades
4. Can drill down into individual student progress

### Planned Analytics Pipeline (#4)
```
Student Activity → Nightly Aggregates → Materialized Views → Dashboard Visualization
```

**Implementation Plan:**
1. **Nightly Aggregation Jobs:**
   - Aggregate daily activity (lessons completed, time spent, submissions)
   - Calculate concept-level mastery (e.g., loops, functions, arrays)
   - Compute class averages and distributions
   - Identify struggling students (early warning system)
   - Store in materialized views for fast queries

2. **Teacher Dashboards:**
   - Class performance overview (average grades, completion rates)
   - Individual student progress timelines
   - Concept-level heatmaps (which topics class struggles with)
   - Assignment statistics (average score, time to complete)
   - Engagement metrics (login frequency, time on platform)
   - Comparison to district/platform averages

3. **District Admin Dashboards:**
   - Cross-school analytics
   - Teacher effectiveness metrics
   - Curriculum effectiveness (which courses/lessons work best)
   - Resource utilization (seat usage, course popularity)
   - District-wide trends over time

4. **Student Progress Reports:**
   - Personal progress dashboard
   - Concept mastery visualization
   - Strengths and areas for improvement
   - Time spent vs. class average
   - Achievement badges and milestones

## 6. CONTENT DELIVERY & MEDIA FLOW (Planned #5)

### Current State
- Text-based lesson content
- Code examples embedded in lessons
- Static content delivery from database

### Planned Video Lesson Flow
```
Lesson Content → Media Hosting (CDN) → Cached Delivery → Student Browser
```
1. **Content Creation:**
   - Teacher/admin uploads video lessons
   - Videos transcoded to multiple formats/qualities
   - Stored on media hosting service (AWS S3, Cloudflare R2)
   - Thumbnails generated automatically

2. **Content Delivery:**
   - Video served from CDN (Cloudflare, AWS CloudFront)
   - Adaptive bitrate streaming based on connection speed
   - Video player with playback controls (play, pause, speed, subtitles)
   - Progress tracking (resume where student left off)

3. **Rich Media Content:**
   - Interactive diagrams and visualizations
   - Embedded code playgrounds
   - Step-by-step animated explanations
   - Downloadable resources (PDFs, starter files)

## 7. PAYMENT & SUBSCRIPTION FLOW (Planned #2)

### Trial to Paid Conversion
```
Trial Teacher → Upgrade Decision → Stripe Checkout → Subscription Created → Full Access
```
1. Teacher using trial account receives upgrade prompts
2. Teacher clicks "Upgrade to Full Access"
3. Redirected to Stripe Checkout page
4. Selects plan (monthly/annual, number of students)
5. Enters payment information
6. Stripe processes payment
7. Webhook confirms payment to ACL backend
8. Account upgraded to full access
9. Teacher receives confirmation email
10. Trial limitations removed immediately

### District Subscription Flow
```
District Admin → Request Quote → Sales Process → Stripe Invoice → Seats Allocated
```
1. District Admin requests district subscription
2. ACL sales team provides quote (volume pricing)
3. District signs agreement
4. Stripe invoice sent (annual billing typical)
5. District makes payment
6. ACL admin allocates seats to district:
   - max_classes, max_teachers, max_students configured
7. District Admin can now create classes (subject to approval)
8. District Admin allocates seats to schools/teachers
9. Usage tracked for billing adjustments

### Renewal Automation (Planned #10)
1. Subscription approaching renewal date
2. Auto-renewal attempt via Stripe
3. If successful: Subscription continues, confirmation email sent
4. If failed: Email notification to update payment method
5. Grace period (7-14 days) before access revoked
6. Teacher can update payment method through account settings
7. Manual renewal option available

## 8. SSO & LMS INTEGRATION FLOW (Planned #3)

### Single Sign-On (Google Workspace, Microsoft AD)
```
School Portal → Google/Microsoft SSO → ACL Auto-Provision → Dashboard
```
1. **SSO Setup (One-time):**
   - District Admin configures SSO in ACL settings
   - Provides Google Workspace or Microsoft AD credentials
   - Maps user roles (teacher, student) based on directory groups
   - Enables auto-provisioning

2. **Student/Teacher Login:**
   - User clicks "Sign in with Google/Microsoft"
   - Redirected to Google/Microsoft login page
   - User authenticates with school credentials
   - ACL receives auth token with user info
   - ACL auto-provisions account if first login:
     - Creates user in database
     - Assigns role based on directory group
     - Links to district based on email domain
   - User redirected to appropriate dashboard

3. **Benefits:**
   - No separate ACL password to remember
   - Automatic account provisioning
   - Centralized access control through school directory
   - Single sign-out across all school apps

### LMS Integration (Canvas, PowerSchool, etc.)
```
LMS Assignment → Launch ACL Lesson → Student Completes → Grade Syncs to LMS
```
1. **LMS Setup (One-time):**
   - Teacher installs ACL LTI app in Canvas/PowerSchool
   - Authorizes ACL to access gradebook
   - Maps ACL classes to LMS courses

2. **Assignment Launch:**
   - Teacher creates assignment in LMS
   - Embeds ACL lesson/checkpoint via LTI link
   - Student clicks assignment in LMS
   - Seamlessly launched into ACL lesson (no separate login)
   - Student completes assignment in ACL

3. **Grade Passback:**
   - Student submits assignment in ACL
   - ACL auto-grades or teacher grades
   - Grade synced back to LMS gradebook via LTI API
   - Grade appears in LMS within minutes
   - Student sees grade in both ACL and LMS

4. **Roster Sync:**
   - LMS course roster automatically syncs to ACL class
   - New students added automatically
   - Dropped students removed from ACL class
   - Keeps enrollment in sync without manual management

## 9. NOTIFICATION & COMMUNICATION FLOW (Planned #8)

### Notification Triggers & Delivery

**Trial Expiry Notifications:**
- 7 days before expiry: Reminder email with upgrade link
- 3 days before expiry: Urgent reminder with limited-time discount
- On expiry: Final notice with option to extend trial or upgrade
- Post-expiry: Account moves to read-only mode, data preserved

**Class Request Notifications:**
- Student submits class request → Email to teacher
- Teacher approves request → Email to student
- Teacher rejects request → Email to student with reason
- Pending requests > 24 hours → Reminder to teacher

**Assignment Notifications:**
- New assignment posted → Notification to all students in class
- Assignment due in 24 hours → Reminder to students who haven't submitted
- Assignment graded → Notification to student with grade/feedback
- Assignment reopened → Notification to class

**Progress Notifications:**
- Student completes course → Congratulations email + certificate
- Student falls behind → Encouragement email to student
- Student struggling (low grades) → Alert to teacher
- Milestone achievements → Badge notification to student

**Parent/Guardian Reports (Planned):**
- Weekly progress summary email
- Monthly detailed report with grades and activity
- Alert if student hasn't logged in for 7+ days
- Alert if grades drop significantly

### Notification Settings
1. User can manage notification preferences
2. Options to enable/disable each notification type
3. Choose delivery method (email, in-app, both)
4. Set digest mode (immediate, daily, weekly)
5. Mute notifications temporarily (vacation mode)

## 10. DATA EXPORT & COMPLIANCE FLOW (Planned #9)

### FERPA-Compliant Data Export
```
Admin Request → FERPA Validation → Export Generation → Secure Download
```
1. **Export Request:**
   - Teacher/admin initiates export from dashboard
   - Selects data scope (class, student, date range)
   - Chooses export format (CSV, JSON, PDF)
   - Specifies fields to include/exclude (PII handling)

2. **FERPA Compliance Checks:**
   - Verify user has permission to export requested data
   - Log export request with timestamp and user ID
   - Redact sensitive data if exporting for analysis
   - Apply data retention policies (only export allowed timeframe)

3. **Export Generation:**
   - Background job generates export file
   - User notified when export ready (5-30 min for large exports)
   - Download link expires after 24 hours
   - File encrypted at rest

4. **Export Types:**

   **Student Progress Report (PDF):**
   - Student name, ID, class enrollment
   - Course completion status
   - Lesson-by-lesson progress with timestamps
   - Assignment grades with feedback
   - Time spent on platform
   - Concept mastery visualization
   - Teacher comments and notes

   **Gradebook Export (CSV):**
   - Roster with student names, IDs, emails
   - Assignment columns with grades
   - Course/lesson completion percentages
   - Attendance/engagement metrics
   - Compatible with Excel, Google Sheets

   **District Analytics Export (JSON):**
   - Aggregated, anonymized data
   - Class performance statistics
   - Course effectiveness metrics
   - Resource utilization data
   - Trend analysis over time periods
   - No individual student PII

   **Compliance Snapshot:**
   - Complete database snapshot for audit purposes
   - All user activity logs
   - Access control records (who accessed what data, when)
   - Data modification audit trail
   - Retention policy enforcement records
   - Encrypted archive for legal/compliance team

## 11. CODE EXECUTION ARCHITECTURE (Planned #1)

### Secure Code Runner Flow
```
Student Code → API Gateway → Queue → Isolated Runner → Execute → Test Cases → Results → Database
```

**Submission & Queueing:**
1. Student clicks "Run Tests" or "Submit"
2. Frontend sends code + test cases to backend API
3. API validates request (authentication, rate limiting)
4. Job added to execution queue (Redis/RabbitMQ)
5. Student shown "Running tests..." spinner

**Execution Environment:**
6. Worker picks up job from queue
7. Spins up isolated Docker container or VM:
   - Language-specific runtime (Python, Java, C++, JavaScript)
   - No network access (air-gapped)
   - Limited CPU (1 core, 2 seconds max)
   - Limited memory (256MB)
   - Limited disk I/O (10MB max read/write)
   - Read-only filesystem except for /tmp
8. Student code loaded into container
9. Test cases executed sequentially
10. Each test captures:
    - stdout/stderr output
    - Return value
    - Execution time
    - Memory usage
    - Pass/fail status (compare to expected output)

**Security Sandboxing:**
- Whitelist allowed system calls (seccomp)
- Prevent fork bombs (limit process count)
- Prevent filesystem access outside /tmp
- Prevent network access (no sockets)
- Timeout enforcement (SIGKILL after 2 sec)
- Resource cleanup (kill container after 5 sec total)

**Results Processing:**
11. All test results collected
12. Container destroyed immediately
13. Results formatted for student:
    - "3/5 tests passed"
    - Show passed test names
    - Show failed test details (input, expected, actual)
    - Show error messages if code crashed
14. Results stored in `checkpoint_submissions` table
15. Results sent to frontend via WebSocket or polling
16. Student sees detailed feedback

**Auto-Scaling (Planned #12):**
- Monitor queue length
- Scale worker pool up during peak hours (8am-3pm school days)
- Scale down overnight and weekends
- Kubernetes HPA or AWS ECS autoscaling
- Target: < 5 second wait time 95th percentile

### Supported Languages & Runtimes
- **Python 3.11+**: unittest, pytest test frameworks
- **JavaScript (Node.js 18+)**: Jest, Mocha test frameworks
- **Java 17+**: JUnit 5 test framework
- **C++ (GCC 11+)**: Custom test harness with assertions
- Future: C#, Go, Rust, Swift

### Judge0 vs. Piston vs. Custom Runner
**Judge0 (Recommended):**
- Mature, battle-tested execution engine
- Supports 60+ languages out of the box
- Built-in security sandboxing
- Easy Docker deployment
- REST API with callback webhooks
- Can self-host or use Judge0.com cloud

**Piston:**
- Lightweight, simpler alternative
- Supports 50+ languages
- Less mature than Judge0
- Simpler to modify and extend
- Good for MVP, may need hardening for production

**Custom Runner:**
- Full control over execution environment
- Can optimize for specific use cases
- Requires significant security expertise
- Ongoing maintenance burden
- Only recommended if special requirements

## 12. PERFORMANCE OPTIMIZATION FLOW (Planned #12)

### Caching Architecture
```
User Request → CDN Check → Cache Hit? → Serve Cached → End
                              ↓ (Cache Miss)
                        Backend → Redis Cache → Database → Response → Cache for Next Time
```

**CDN Caching (Cloudflare/CloudFront):**
- Static assets (CSS, JS, images): Cache for 1 year
- Video lessons: Cache for 90 days
- Course content (text): Cache for 1 hour
- Cache invalidation on content updates

**Application Caching (Redis):**
- User sessions: 24 hour TTL
- Course catalog: 5 minute TTL
- Lesson content: 15 minute TTL
- Student progress: 1 minute TTL (frequently updated)
- Test case templates: 1 hour TTL
- Analytics aggregates: Cache materialized view results

**Database Optimizations:**
- Connection pooling (PgBouncer): 100 max connections
- Read replicas for analytics queries (planned)
- Indexes on frequently queried columns:
  - student_id, class_id, course_id foreign keys
  - created_at, updated_at timestamps for time-based queries
  - Composite indexes for common query patterns
- Materialized views for analytics (#4)
- Partition large tables by date (submissions, activity logs)

**Code Runner Autoscaling:**
- Horizontal scaling of worker pool
- Queue-based load balancing
- Workers spin up/down based on queue length
- Target: 10-50 active workers during school hours
- Scale to 2-5 workers overnight
- Kubernetes HPA metrics: queue length, CPU, memory

### Performance Targets
- Page load: < 2 seconds (95th percentile)
- API response: < 500ms (95th percentile)
- Code execution queue wait: < 5 seconds (95th percentile)
- Code execution time: < 2 seconds (hard timeout)
- Database query: < 100ms (95th percentile)
- Video start time: < 1 second (CDN cached)

═══════════════════════════════════════════════════════════════════════════════
END OF FLOW GUIDE
═══════════════════════════════════════════════════════════════════════════════
