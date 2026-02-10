# Averon Code Lab - System Architecture V2
## District-Ready Educational Platform

---

## EXECUTIVE SUMMARY

Averon Code Lab is a district-ready coding education platform designed for high school CS courses (AP CSP, AP CSA, Intro CS, IST). The platform balances three critical needs:

1. **Teacher Adoption** - Frictionless trial mode, then seamless upgrade to paid
2. **Student Success** - Guided learning with mastery tracking and motivation
3. **District Trust** - Compliance, analytics, and enterprise-grade controls

**Competitive Edge vs JuiceMind:**
- Teacher trial mode (no approval needed) vs. JuiceMind's contact-only model
- Built-in autograding vs. manual assessment workflows
- Per-teacher licensing vs. per-student overhead
- Real-time analytics vs. static reports
- District-wide oversight from day one

---

## 1. ROLE HIERARCHY

### Full Admin (Platform Owner)
- Create and manage districts
- Set pricing plans and license limits
- Approve district admin requests
- Access all analytics and audit logs
- Configure system-wide settings

### District Admin
- Request district creation (approved by Full Admin)
- Manage teacher licenses within district
- View district-wide analytics and reports
- Export compliance reports
- Monitor seat usage and renewal dates
- Invite teachers to district

### Teacher (Two Modes)

**Trial Mode** (No district approval required)
- Self-signup → instant access
- Limited to 30 students
- Access to 1 course (Python Basics)
- 90-day trial period
- Basic analytics only
- Upgrade prompts after 30 days

**District Mode** (Licensed)
- Unlimited students (within district seat limit)
- Access to all 4 courses
- Full analytics and insights
- LMS integration and exports
- Priority support
- Assignment library access

### Student
- Enroll in classes via class codes
- Complete lessons and assignments
- Track personal mastery and progress
- View grades and feedback
- Earn badges and maintain streaks

---

## 2. ONBOARDING FLOWS

### A) Teacher Trial Flow
1. Teacher visits /auth/sign-up
2. Selects "Start Free Trial"
3. Creates account → Auto-assigned "trial_teacher" role
4. Redirected to onboarding wizard:
   - Create first class
   - Get class code
   - Preview sample lesson
5. Access to trial dashboard with upgrade banner

**Trial Limitations:**
- Max 30 students
- 1 course (Python Basics)
- 90-day expiration
- No CSV exports
- No district analytics
- Watermarked reports

**Conversion Touchpoints:**
- Day 1: Welcome email with upgrade benefits
- Day 30: "You're halfway through your trial"
- Student limit warning at 25/30
- Day 60: "30 days left" notification
- Day 85: "Upgrade to keep your data"
- Day 90: Trial expires → read-only access

### B) District Mode Flow
1. District Admin requests district creation
2. Full Admin approves and sets:
   - Teacher seat limit (e.g., 50 teachers)
   - Student seat limit (e.g., 2000 students)
   - Plan tier (Starter/Professional/Enterprise)
   - License expiration date
3. District Admin invites teachers via email
4. Teachers accept invite → Full access immediately
5. District Admin monitors usage dashboard

### C) Upgrade Flow (Trial → Paid)
1. Teacher clicks "Upgrade to Professional"
2. Options presented:
   a) Join existing district (enter district code)
   b) Start new district (becomes district admin)
3. If new district:
   - Submit request to Full Admin
   - Receive quote based on size
   - Full Admin creates district and activates
4. Teacher migrated to district with all data preserved

---

## 3. STUDENT LEARNING EXPERIENCE

### Course Structure
Course (e.g., "Python Fundamentals")
├── Units (6-8 per course)
│   ├── Lessons (3-5 per unit)
│   │   ├── Concept Explanation (video + text)
│   │   ├── Interactive Examples
│   │   ├── Practice Checkpoint (auto-graded)
│   │   └── Mastery Quiz
│   └── Unit Project (teacher-graded)

### Learning Loop (Per Lesson)
1. **Watch/Read** - Concept introduction (5-10 min)
2. **Try It** - Interactive code sandbox with hints
3. **Practice** - 3-5 checkpoint problems (instant feedback)
4. **Master** - Short quiz to demonstrate understanding
5. **Apply** - Unit project integrating all lesson concepts

### Mastery Tracking
- **Per Concept**: Variables, Loops, Functions, Classes, etc.
- **Progress Levels**:
  - Not Started (gray)
  - Learning (yellow) - <60% checkpoint score
  - Proficient (blue) - 60-89%
  - Mastered (green) - 90%+

### Student Dashboard Features
- **Progress Wheel** - Visual of course completion
- **Mastery Bar** - Concept-by-concept progress
- **Streak Tracker** - Days with completed work
- **Badge Collection** - Milestones achieved
- **Next Up** - Smart recommendation engine
- **Help Feed** - Where classmates are succeeding

---

## 4. TEACHER EXPERIENCE

### Dashboard Overview
- **Active Classes** (cards with quick stats)
- **Recent Submissions** (needs grading)
- **Class Performance** (average by concept)
- **Upcoming Deadlines**
- **Quick Actions** (create assignment, view analytics)

### Assignment Creation (Simplified)
Option 1: From Lesson Library
1. Browse course units
2. Select lesson checkpoint
3. Set due date and point value
4. Auto-assigned to class → Students see immediately

Option 2: Custom Assignment
1. Write problem description
2. Add starter code
3. Define test cases
4. Set grading rubric
5. Publish to class(es)

Option 3: Clone Previous
1. Select past assignment
2. Duplicate to current class
3. Adjust dates → Publish

### Auto-Grading System
- **Instant Feedback** on checkpoint problems
- **Test Case Results** with input/output comparison
- **Partial Credit** based on passing tests
- **Syntax Error Detection** with helpful hints
- **Runtime Error Handling** with line numbers

---

## 5. DISTRICT ADMIN FEATURES

### License Management Dashboard
- **Seat Usage**:
  - Teachers: 45/50 (90% utilized)
  - Students: 1,847/2,000 (92% utilized)
- **Expiration Warning**: "License expires in 23 days"
- **Usage Trends**: Graph of student enrollment over time

### District-Wide Analytics
- **Enrollment Summary**: Students per teacher, per school
- **Course Adoption**: Which courses most popular
- **Student Progress**: District average mastery %
- **Teacher Activity**: Active vs. inactive teachers
- **Top Performers**: Best students across district

---

## 6. MONETIZATION MODEL

### Pricing Tiers

**Trial (Free)**
- 1 teacher
- 30 students max
- 1 course (Python Basics)
- 90 days
- Basic analytics
- Community support

**Starter ($499/year per teacher)**
- Unlimited students
- All 4 courses
- Full analytics
- Email support
- Grade exports
- Up to 10 teachers per district

**Professional ($399/year per teacher)**
- Everything in Starter
- Priority support
- LMS integration
- Custom branding
- SSO integration
- 11-50 teachers per district

**Enterprise (Custom pricing)**
- Everything in Professional
- Dedicated success manager
- Custom course content
- API access
- On-premise option
- 50+ teachers
- Multi-district management

---

## 7. TECHNICAL ARCHITECTURE

### Database Schema (Key Tables)

**districts**
- id, name, code
- plan_tier (trial, starter, professional, enterprise)
- teacher_limit, student_limit
- license_start, license_end
- is_active, created_by_admin_id

**teachers (extended profiles)**
- id, email, full_name
- teacher_mode (trial, district)
- district_id (nullable)
- trial_start_date, trial_end_date
- trial_student_count
- is_active

**courses**
- id, title, description, language
- difficulty_level
- estimated_hours
- is_trial_accessible (boolean)

**units**
- id, course_id, title, order
- learning_objectives

**lessons**
- id, unit_id, title, order
- content_type (video, text, interactive)
- content_url, duration_minutes

**checkpoints**
- id, lesson_id, title
- problem_description, starter_code
- test_cases (JSON array)
- difficulty, points

**student_progress**
- id, student_id, lesson_id
- status (not_started, in_progress, completed)
- score, attempts, time_spent
- mastery_level (learning, proficient, mastered)

**concept_mastery**
- id, student_id, concept_name
- mastery_score (0-100)
- last_practiced, practice_count

