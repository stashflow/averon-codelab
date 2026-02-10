Averon Code Lab — Architecture (plain text)

Overview
- District-ready educational platform for high-school CS courses.
- Role hierarchy: Full Admin → District Admin → Teacher (trial/district) → Student.
- Monetization: per-teacher and district licensing, 90-day teacher trials, feature gates by plan.

Key Concepts
- Districts: organizational containers with seat limits and license dates.
- Classrooms: linked to a course and district; created by district admins and activated by Full Admin.
- Class Codes: short enrollment codes for students and teachers.
- Teachers: two modes — Trial (self-signup, limited seats) and District (licensed, full access).
- Students: enroll via class codes, complete lessons/checkpoints, earn badges and streaks.

Primary Flows
1. Full Admin creates/manages districts and approves class activation requests.
2. District Admin requests classes and assigns teachers; Full Admin activates classes.
3. Teacher creates assignments, controls visibility (is_visible, visible_from, visible_until), grades submissions.
4. Student signs up, joins class with code, completes lessons and submits code; submissions saved to DB and progress tracked.
5. Trial teachers can upgrade: join existing district or request a new district.

Course & Learning Model
- Courses → Units → Lessons → Checkpoints (auto-graded problems).
- Lesson viewer: content + code editor + test runner (mocked currently; plan to integrate real runners).
- Mastery tracking per concept; progress per lesson and unit; badges and streaks for motivation.

Data Model (high level)
- districts, district_admins
- profiles (users: role, teacher_mode, trial dates)
- classrooms (class metadata, code, is_active)
- courses, units, lessons, checkpoints
- enrollments, student_lesson_progress, checkpoint_submissions
- assignments, submissions, assignment_templates
- audit_logs, admin_activity_log, data_exports

Security & Compliance
- Supabase Auth for authentication; JWTs for API.
- Row Level Security (RLS) across relevant tables: users see only their data; teachers scoped to their classes; district admins scoped to their district; full admin has global access.
- FERPA-focused exports and audit logs.

Operational Notes
- Trial enforcement: functions like `is_trial_expired()` and `trial_days_remaining()` implemented.
- Seat/license enforcement: warnings at 90% usage, hard blocks at 100%.
- Next infra steps: real code runner integration (Judge0/Piston), payment (Stripe), SSO, analytics aggregation, CDN for assets.

Where to look in the repo
- Pages and routes: `app/` (auth, admin, teacher, student, courses, lesson)
- UI components: `components/ui/`
- DB migrations: `scripts/*.sql`
- Supabase helpers: `lib/supabase/`

Purpose of this file
- Single-source plain-text architecture summary for developers and product.
- Use as canonical flow reference and to drive implementation priorities.
