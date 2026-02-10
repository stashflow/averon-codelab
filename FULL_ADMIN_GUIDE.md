# Full Admin Guide - Averon CodeLab
*Complete guide for system administration*

---

## Getting Started

### Accessing Full Admin Panel
1. Navigate to `/admin/panel`
2. You must have `role = 'full_admin'` in the profiles table
3. Set via SQL:
   ```sql
   UPDATE profiles SET role = 'full_admin' WHERE email = 'your-email@example.com';
   ```

---

## Admin Panel Overview

The admin panel has three main sections:

### 1. **Classes Management**
- Create class codes for direct sale
- View all classes and their enrollment
- Copy class codes for distribution
- Monitor teacher and student counts

### 2. **Districts Management**
- Create and manage school districts
- Assign district administrators
- View district statistics
- Monitor district activity

### 3. **Approval Requests**
- Approve/reject teacher access requests
- Approve/reject district class requests
- Review all pending actions

---

## District Flow (Complete Workflow)

### Phase 1: Creating a District

**As Full Admin:**
1. Go to **Districts** tab in admin panel
2. Click **"Create New District"**
3. Fill in:
   - District Name (e.g., "Springfield School District")
   - Description
   - Max Students (total capacity)
   - Max Teachers
4. System generates a unique **District Code** (e.g., "ABC123XY")
5. Share this code with the district administrator

**What Happens:**
- New district entry created in `districts` table
- District code can be used for joining
- District shows as "Active" in your panel

---

### Phase 2: District Admin Setup

**District Admin Process:**
1. Signs up as a teacher
2. During onboarding, selects **"Join District"** mode
3. Enters the district code you provided
4. Gets assigned as district admin automatically

**What Happens:**
- Entry created in `district_admins` table
- User gets access to `/district/admin` panel
- Can now request classes for their district

---

### Phase 3: Class Requests from Districts

**District Admin Actions:**
1. Logs into their district panel (`/district/admin`)
2. Clicks **"Request New Class"**
3. Fills in class details:
   - Class name
   - Description
   - Course/curriculum
4. Submits request

**What Happens:**
- Class created with `pending_activation = true`
- Class code generated but inactive
- Request appears in YOUR admin panel

**Your Action (Full Admin):**
1. Go to **Requests** tab in admin panel
2. See pending district class request
3. Review details (district name, class info)
4. Click **"Approve"** or **"Reject"**

**On Approval:**
- Class becomes active (`is_active = true`)
- Class code works for enrollment
- District admin can now manage the class
- Teachers can join using the class code

**On Rejection:**
- Request marked as rejected
- District admin notified
- Class remains inactive

---

### Phase 4: Teachers Joining District Classes

**Teacher Process:**
1. Signs up as teacher
2. Chooses "District" mode in onboarding
3. Enters the district code
4. Gets assigned to district

**District Admin:**
- Assigns teachers to specific classes
- Monitors class enrollment
- Manages class settings

---

## Quick Reference Commands

### Create District (SQL)
```sql
INSERT INTO districts (name, description, district_code, max_students, max_teachers, is_active)
VALUES ('My District', 'Description', 'CODE123', 1000, 50, true);
```

### Make User District Admin
```sql
INSERT INTO district_admins (admin_id, district_id)
VALUES ('user-uuid', 'district-uuid');
```

### Make User Full Admin
```sql
UPDATE profiles SET role = 'full_admin' WHERE email = 'admin@example.com';
```

### Approve Class Request
```sql
UPDATE classrooms
SET is_active = true, pending_activation = false
WHERE id = 'classroom-uuid';

UPDATE class_requests
SET status = 'approved'
WHERE classroom_id = 'classroom-uuid';
```

---

## Access Levels Summary

| Role | Access | Can Do |
|------|--------|--------|
| **Full Admin** | Everything | Create districts, approve all requests, manage all classes |
| **District Admin** | District only | Request classes, manage district classes, view district stats |
| **Teacher** | Classes only | Manage assigned classes, view students |
| **Student** | Courses only | View courses, submit assignments |

---

## Common Tasks

### Task: Set Up New District
1. Create district with code
2. Share code with district contact
3. They sign up and join using code
4. They become district admin automatically
5. Approve their class requests as they come in

### Task: Approve District Class
1. Check **Requests** tab
2. Review class details
3. Click **Approve**
4. Class becomes active immediately
5. District admin gets notification

### Task: Create Direct Sale Class
1. Go to **Classes** tab
2. Click **Create New Class**
3. Set max teachers/students
4. Generate class code
5. Sell code directly to teachers

### Task: Monitor System
- Check stats cards for totals
- Review pending requests regularly
- Monitor district activity
- Check class enrollment numbers

---

## Troubleshooting

**Can't Access Admin Panel**
- Verify role is 'full_admin' in profiles table
- Check you're logged in
- Clear browser cache

**District Code Not Working**
- Verify district is active
- Check code is correct (case-sensitive)
- Ensure district exists in database

**Class Request Not Showing**
- Refresh the page
- Check class_requests table
- Verify request status is 'pending'

**Teacher Can't Join Class**
- Ensure class is active
- Check class code is correct
- Verify class has capacity

---

## Database Tables Reference

### Key Tables:
- `profiles` - User information and roles
- `districts` - School districts
- `district_admins` - District admin assignments
- `classrooms` - All classes
- `class_requests` - Pending class approvals
- `teacher_requests` - Teacher access requests
- `enrollments` - Student enrollments

---

## Support & Maintenance

**Regular Tasks:**
- Review pending requests daily
- Monitor system stats weekly
- Update district capacities as needed
- Clean up inactive classes monthly

**Data Exports:**
Use Supabase dashboard to export:
- Enrollment reports
- District statistics
- Class utilization
- User activity logs

---

*Last Updated: 2026-02-09*
*Admin Panel Version: 2.0*
