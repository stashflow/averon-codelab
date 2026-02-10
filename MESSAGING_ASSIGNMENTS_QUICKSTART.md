# Messaging & Assignments Quick Start Guide

This guide explains how to use the newly implemented messaging and assignment systems.

## Database Setup

Run these migration scripts in order:
1. `scripts/016_messaging_system.sql` - Creates messaging tables
2. `scripts/017_course_assignments.sql` - Creates assignment tables

## Features Implemented

### 1. Private Messaging (Encrypted)

Teachers and admins can send private messages to students. Students can reply.

**Database Tables:**
- `messages` - Stores encrypted messages
- `message_attachments` - Optional file attachments

**Encryption:**
- Messages are encrypted using AES-256-GCM
- Each message has unique IV (initialization vector)
- Encryption key from env: `MESSAGE_ENCRYPTION_KEY` (or uses default)

**API Routes:**
- POST `/api/messages/send` - Send a message
- GET `/api/messages/inbox?type=received|sent` - Get messages
- POST `/api/messages/mark-read` - Mark message as read

**Components:**
- `<MessagesInbox />` - View and reply to messages
- `<SendMessageForm classroomId={id} />` - Send message to student

**Usage Example:**
```typescript
// Send message (teacher to student)
await fetch('/api/messages/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipient_id: 'student-uuid',
    subject: 'Great work!',
    content: 'Keep up the excellent progress on Unit 3.'
  })
})

// Reply to message (student to teacher)
await fetch('/api/messages/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipient_id: 'teacher-uuid',
    subject: 'Re: Great work!',
    content: 'Thank you! I have a question about 3.2...',
    parent_message_id: 'original-message-uuid'
  })
})
```

### 2. Class Announcements

Teachers post announcements that appear on all enrolled students' dashboards.

**Database Tables:**
- `class_announcements` - Stores announcements
- `announcement_views` - Tracks which students viewed

**Display Format:** 
"{message}" - {teacher name}

**API Routes:**
- POST `/api/announcements/create` - Create announcement
- GET `/api/announcements/classroom/:id` - Get announcements

**Components:**
- `<CreateAnnouncement classroomId={id} />` - Post announcement form

**Priority Levels:**
- `low` - Regular updates
- `normal` - Standard announcements (default)
- `high` - Important notices
- `urgent` - Critical information (shows with alert icon)

**Usage Example:**
```typescript
// Create announcement
await fetch('/api/announcements/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    classroom_id: 'class-uuid',
    message: 'Don\'t forget: Unit 3 lessons 3.1 and 3.2 are due Wednesday!',
    priority: 'normal'
  })
})
```

**Student Dashboard Integration:**
The student dashboard automatically shows active announcements in a special section with:
- Blue gradient card design
- Bell icon
- Teacher name attribution
- Alert icon for urgent messages

### 3. Lesson Assignment System

Teachers assign specific course lessons with due dates. System tracks student progress.

**Database Tables:**
- `units` - Course units (e.g., Unit 3)
- `lessons` - Individual lessons (e.g., 3.1, 3.2)
- `lesson_assignments` - Teacher assignments
- `student_lesson_progress` - Student work tracking
- `lesson_feedback` - Teacher feedback on work

**Lesson Types:**
- `video` - Video lessons
- `reading` - Articles/text content
- `coding` - Interactive coding challenges
- `quiz` - Assessments

**API Routes:**
- POST `/api/assignments/create` - Create assignments
- GET `/api/assignments/student` - Get student's assignments

**Usage Example:**
```typescript
// Assign multiple lessons at once
await fetch('/api/assignments/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    classroom_id: 'class-uuid',
    lesson_ids: ['lesson-3.1-uuid', 'lesson-3.2-uuid'],
    due_date: '2026-03-12T23:59:59Z',
    instructions: 'Complete before next class',
    points_possible: 100
  })
})

// Get student's assignments
const response = await fetch('/api/assignments/student')
const { assignments } = await response.json()

// Each assignment includes:
// - Lesson info (title, type, unit number)
// - Due date
// - Progress status
// - Score (if completed)
```

## Teacher/Admin Workflow

### Send Private Message to Student

```tsx
import { SendMessageForm } from '@/components/messaging/send-message-form'

function TeacherClassroom({ classroomId }: { classroomId: string }) {
  return (
    <div>
      <h2>Messaging</h2>
      <SendMessageForm classroomId={classroomId} />
    </div>
  )
}
```

### Post Class Announcement

```tsx
import { CreateAnnouncement } from '@/components/messaging/create-announcement'

function TeacherClassroom({ classroomId }: { classroomId: string }) {
  return (
    <div>
      <h2>Announcements</h2>
      <CreateAnnouncement classroomId={classroomId} />
    </div>
  )
}
```

### Create Lesson Assignment

```tsx
async function assignLessons() {
  const response = await fetch('/api/assignments/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      classroom_id: classroomId,
      lesson_ids: selectedLessonIds, // Array of lesson UUIDs
      due_date: dueDate,
      instructions: customInstructions,
      points_possible: 100
    })
  })
  
  if (response.ok) {
    alert('Assignments created!')
  }
}
```

## Student Workflow

### View Messages

```tsx
import { MessagesInbox } from '@/components/messaging/messages-inbox'

function StudentMessages() {
  return (
    <div>
      <h1>My Messages</h1>
      <MessagesInbox />
    </div>
  )
}
```

### View Announcements

Announcements automatically appear on the student dashboard. They see:
- The message text
- Teacher's name
- Time posted
- Priority indicator (if urgent)

### View Assignments

```tsx
async function loadAssignments() {
  const response = await fetch('/api/assignments/student')
  const { assignments } = await response.json()
  
  // assignments array includes:
  // - lesson details (title, unit.lesson format)
  // - due_date
  // - progress.status ('not_started', 'in_progress', 'completed')
  // - progress.score
}
```

## Security Features

### Message Encryption
- AES-256-GCM encryption
- Unique IV per message
- Messages encrypted before database storage
- Automatic decryption on retrieval
- Users can only read their own messages (RLS policies)

### Row Level Security (RLS)
All tables have RLS policies that ensure:
- Students only see messages/announcements for their classes
- Teachers only message students in their classes
- Admins have broader access
- Progress data is private to student and teacher

## Integration with Courses

The system is **ready for course content** but courses need to be created:

1. **Create Course Structure:**
   ```sql
   -- Insert units for a course
   INSERT INTO units (course_id, unit_number, title, order_index, is_published)
   VALUES ('course-uuid', 3, 'Control Flow', 3, true);
   
   -- Insert lessons for a unit
   INSERT INTO lessons (unit_id, lesson_number, title, lesson_type, content_data, order_index, is_published)
   VALUES 
     ('unit-uuid', 1, 'If Statements', 'video', '{"video_url": "..."}', 1, true),
     ('unit-uuid', 2, 'Loops', 'coding', '{"problem_statement": "..."}', 2, true);
   ```

2. **Teachers Assign Lessons:**
   - Select Unit 3, Lessons 1-2
   - Set due date: March 12
   - Add custom instructions
   - System creates assignments for all students in class

3. **Students Work on Lessons:**
   - See assignments on dashboard
   - Complete lessons (video/reading/coding/quiz)
   - Progress tracked in `student_lesson_progress`

4. **Teachers Track Progress:**
   - View which students completed assignments
   - See scores for quizzes/coding
   - Provide feedback via `lesson_feedback`

## Example: Complete Teacher Flow

```tsx
// 1. Post announcement about upcoming assignment
await fetch('/api/announcements/create', {
  method: 'POST',
  body: JSON.stringify({
    classroom_id: 'class-123',
    message: 'New assignment: Complete Unit 3 lessons 3.1 and 3.2 by Wednesday!',
    priority: 'normal'
  })
})

// 2. Create the actual assignments
await fetch('/api/assignments/create', {
  method: 'POST',
  body: JSON.stringify({
    classroom_id: 'class-123',
    lesson_ids: ['lesson-3.1-uuid', 'lesson-3.2-uuid'],
    due_date: '2026-03-12T23:59:59Z',
    instructions: 'Focus on understanding the concepts. Ask questions if stuck!',
    points_possible: 100
  })
})

// 3. Later, send private message to struggling student
await fetch('/api/messages/send', {
  method: 'POST',
  body: JSON.stringify({
    recipient_id: 'student-uuid',
    subject: 'Need help with 3.2?',
    content: 'I noticed you\'re having trouble with lesson 3.2. Let\'s schedule office hours.'
  })
})
```

## Example: Complete Student Flow

1. **Student logs in** → Dashboard shows:
   - "New assignment: Complete Unit 3 lessons 3.1 and 3.2 by Wednesday! - Ms. Johnson"
   - Assignment cards showing 3.1 and 3.2 with due dates

2. **Student clicks assignment** → Opens lesson 3.1:
   - Video lesson type: Watches video
   - Completes practice exercises
   - Progress saved automatically
   - Status changes to 'completed'

3. **Student checks messages:**
   - Sees message from teacher about 3.2
   - Reads encrypted message
   - Clicks Reply
   - Sends encrypted reply back

4. **Progress tracked:**
   - Teacher sees student completed 3.1 (100%)
   - Teacher sees student started 3.2 (45%)
   - Teacher can send feedback or encouragement

## Environment Variables

Add to your `.env.local`:
```
MESSAGE_ENCRYPTION_KEY=your-secure-random-key-here
```

If not set, uses default (less secure).

## Next Steps

1. **Run migrations** to create tables
2. **Create course content** following `COURSE_IMPLEMENTATION_GUIDE.md`
3. **Add messaging UI** to teacher and student pages
4. **Build lesson viewers** for each lesson type (video, reading, coding, quiz)
5. **Create assignment dashboard** for teachers to track progress

All the backend infrastructure is ready. Frontend components are provided as starting points and can be integrated into your existing pages.
