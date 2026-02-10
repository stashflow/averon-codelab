# Averon CodeLab - Super Admin & Class Code System

## Overview
This platform now operates on a class code sales model where administrators create classes with unique codes, teachers request access, and admins approve them to manage everything.

## User Roles & Flow

### 1. Super Admin
**Access**: `/admin/panel`

**Capabilities**:
- Create classes with unique 8-character codes
- Set max teachers and students per class
- Review and approve/reject teacher access requests
- View platform statistics
- Monitor all activity

**Workflow**:
1. Create a new class (generates unique code automatically)
2. Share class code with teachers (via sales/distribution)
3. Review incoming teacher requests
4. Approve qualified teachers
5. Monitor class usage and stats

### 2. Teachers
**Access**: `/protected/teacher` and `/teacher/join`

**Capabilities** (after approval):
- Full control over assignments
- Create/edit/delete assignments
- Set assignment visibility (visible_from, visible_until)
- Grade student submissions
- Manage class content
- Control what students see

**Workflow**:
1. Receive class code from admin
2. Navigate to "Join Class with Code"
3. Enter 8-character code
4. Submit access request
5. Wait for admin approval
6. Once approved, full access to manage the class

### 3. Students
**Access**: `/protected`

**Capabilities**:
- Enroll in classes using enrollment codes
- View assignments (based on teacher visibility settings)
- Submit code solutions
- View grades and feedback
- Track progress

**Visibility Control**: Teachers control what students can see through assignment visibility settings.

## Database Schema Changes

### New Tables
1. **teacher_requests**
   - Tracks teacher access requests
   - Status: pending, approved, rejected
   - Links teachers to classrooms

2. **admin_activity_log**
   - Audit trail of all admin actions
   - Tracks approvals, class creation, etc.

### Updated Tables
1. **classrooms**
   - `created_by_admin` - Distinguishes admin-created classes
   - `is_active` - Enable/disable classes
   - `max_teachers` - Teacher limit per class
   - `max_students` - Student capacity

2. **assignments**
   - `is_visible` - Toggle visibility
   - `visible_from` - Start date/time for visibility
   - `visible_until` - End date/time for visibility

## Sales Model Benefits

1. **Monetization**: Sell class codes as products
2. **Quality Control**: Approve qualified teachers only
3. **Scalability**: Control capacity per class
4. **Flexibility**: Teachers manage their approved classes independently
5. **Oversight**: Full admin visibility and control

## Key Features

- **One-time setup**: Admin creates classes once
- **Teacher empowerment**: Full control post-approval
- **Student protection**: Teachers control content visibility
- **Audit trail**: All actions logged
- **Capacity management**: Set limits per class
- **Real-time stats**: Dashboard with live metrics

## Access Paths

| Role | Main Dashboard | Additional Pages |
|------|---------------|------------------|
| Admin | `/admin/panel` | - |
| Teacher | `/protected/teacher` | `/teacher/join` |
| Student | `/protected` | `/classroom/[id]`, `/assignment/[id]` |
