# Admin Quick Start Guide

## 🚀 Getting Started as a Full Admin

Welcome to Averon CodeLab! This guide will help you get up and running quickly.

---

## 📱 Accessing Your Platform

### Login
1. Go to `https://yourdomain.com/auth/login`
2. Sign in with your admin account
3. You'll be redirected to your admin dashboard

### Key URLs
- **Admin Panel:** `/admin/panel`
- **Support Center:** `/admin/support-center`
- **Courses:** `/courses`
- **Your Profile:** `/dashboard` (coming soon)

---

## 🎨 Personalizing Your Experience

### Changing Themes

**Toggle Light/Dark Mode:**
- Click the sun/moon icon in the header
- Instantly switches between light and dark

**Choose a Color Theme:**
- Click the palette icon in the header
- Select from 4 beautiful themes:
  - **Ocean** (Blue/Cyan) - Professional, trustworthy
  - **Forest** (Green/Emerald) - Natural, calming
  - **Sunset** (Orange/Amber) - Warm, energetic
  - **Rose** (Pink/Red) - Elegant, vibrant

**Your preferences save automatically!**

---

## 🏢 Setting Up Your Organization

### Step 1: Create Districts

1. Go to **Admin Panel** → **Organization Tab**
2. Click "Create District"
3. Enter:
   - District Name (e.g., "Springfield School District")
   - District Code (e.g., "SSD-001")
4. Click "Create"

**Districts are your top-level organizational unit.**

---

### Step 2: Create Schools

1. Still in the **Organization Tab**
2. Click "Create School"
3. Fill in:
   - School Name (e.g., "Springfield High School")
   - Select the district
   - Max Teachers (default: 25)
   - Max Students (default: 1500)
4. Click "Create"

**Schools belong to districts and contain classrooms.**

---

### Step 3: Create Classrooms

1. Click "Create Classroom"
2. Enter:
   - Classroom Name (e.g., "Intro to Python - Period 1")
   - Description (e.g., "Beginning Python for 9th grade")
   - Select school
   - Select teacher (if already invited)
   - Max students (default: 30)
3. System generates a unique class code
4. Click "Create"

**Students use the class code to join classrooms.**

---

## 👥 Inviting Users

### Invite a District Admin

1. Go to **Invitations Tab**
2. Enter their email
3. Select role: "District Admin"
4. Select which district they'll manage
5. Set expiration (default: 72 hours)
6. Click "Generate Invite Link"
7. Copy the link and send it to them

---

### Invite a School Admin

1. Enter their email
2. Select role: "School Admin"
3. Select their district AND school
4. Generate and send the link

---

### Invite a Teacher

1. Enter their email
2. Select role: "Teacher"
3. Select their school
4. Generate and send the link
5. After they sign up, assign them to classrooms

---

### Invite Students

**Option 1: Magic Link (Individual)**
1. Enter student email
2. Select role: "Student"
3. Generate and send link
4. They join using a class code after signup

**Option 2: Class Code (Bulk)**
1. Give students the classroom code
2. They sign up at `/auth/register`
3. Enter the class code to join

---

## 🔍 Managing Users & Entities

### Using the Support Center

**Search for Users:**
1. Go to `/admin/support-center`
2. Click "Users" tab
3. Enter name or email in search
4. Click "Search"

**View User Details:**
- Full name and email
- Role and permissions
- District/school affiliation
- Account creation date

**Reset User Password:**
- Click "Reset Password" button
- User receives email with reset link
- They can set a new password

**Delete User Account:**
- Click "Delete" button
- Enter reason for deletion
- Confirm deletion
- Account is soft-deleted (can be recovered)

---

### Managing Districts

1. Go to Support Center → "Districts" tab
2. Search for district name
3. View statistics:
   - Number of schools
   - Number of admins
   - Creation date

**Delete a District:**
- Click "Delete District"
- Confirm (requires no active schools)
- District is soft-deleted

---

### Managing Schools

1. Go to Support Center → "Schools" tab
2. Search for school name
3. View:
   - Parent district
   - Number of classrooms
   - Number of admins

**Delete a School:**
- Click "Delete School"
- Confirm (requires no active classrooms)
- School is soft-deleted

---

### Managing Classrooms

1. Go to Support Center → "Classrooms" tab
2. Search for classroom name
3. View:
   - Teacher name
   - School and district
   - Student count

**Delete a Classroom:**
- Click "Delete Classroom"
- Confirm
- Students are unenrolled automatically
- Classroom is soft-deleted

---

## 📚 Setting Up Courses

### Before You Start
**Read the `COURSE_CONTENT_GUIDE.md` first!** It explains everything you need to create quality course content.

### Creating a Course Category

**Via Supabase Dashboard:**
1. Open Supabase → Table Editor
2. Go to `course_categories` table
3. Insert new row:
   - `name`: "Programming Basics"
   - `slug`: "programming-basics"
   - `description`: "Learn the fundamentals"
   - `category_type`: "programming"
   - `icon_name`: "Code"
   - `color`: "from-cyan-500 to-blue-500"
   - `is_active`: true
   - `order_index`: 1

---

### Creating a Course

**Via Supabase Dashboard:**
1. Go to `courses` table
2. Insert new row:
   - `name`: "Introduction to Python"
   - `slug`: "intro-to-python"
   - `description`: "Learn Python from scratch"
   - `category_id`: (select the category)
   - `language`: "Python"
   - `level`: "beginner"
   - `difficulty_level`: "beginner"
   - `estimated_hours`: 30
   - `requires_payment`: false
   - `requires_classroom_enrollment`: true
   - `is_active`: true

---

### Creating Lessons

**After reading the Course Content Guide:**

Tell me:
- Which course you're creating content for
- What the lesson topics are
- What videos/materials you have

I'll implement:
- Lesson structure
- Video players
- Code editors
- Quizzes and assessments
- Progress tracking

---

## 📊 Monitoring Your Platform

### Dashboard Statistics

**In Support Center, you'll see:**
- Total users
- Total districts
- Total schools
- Total classrooms
- Active users (24 hours)

**These update in real-time as users join and engage.**

---

### Reviewing Activity

**Recent Invitations:**
- See who was invited
- When invitations expire
- Who has accepted

**Class Requests:**
- Students requesting to join classes
- Approve or deny requests
- Automatic notifications

**Audit Logs (Database):**
- All deletions are logged
- View in Supabase → `audit_logs` table
- Shows who deleted what and when

---

## 🆘 Common Tasks

### A Student Can't Log In
1. Go to Support Center → Users
2. Search for their email
3. Check their account status
4. Use "Reset Password" if needed

---

### A Teacher Needs Access to a Classroom
1. Go to Admin Panel → Classrooms
2. Find the classroom
3. In "Manage Access" section
4. Assign the teacher

---

### A District Admin Needs More Permissions
1. Check their role in Support Center
2. If they need full admin:
   - Go to Supabase → `user_roles` table
   - Update their role to `full_admin`

---

### Someone Entered the Wrong Email
1. Support Center → Users
2. Search for their account
3. Click "Delete" (with reason)
4. They can sign up again with correct email

---

### A Classroom Filled Up (Reached Max Students)
1. Admin Panel → Organization
2. Find the classroom
3. Edit it
4. Increase `max_students`
5. Save

---

## 🎯 Best Practices

### Security
- ✅ **Never share your admin credentials**
- ✅ **Use strong, unique passwords**
- ✅ **Review audit logs regularly**
- ✅ **Only invite trusted users as admins**
- ✅ **Delete unused accounts promptly**

### Organization
- ✅ **Use clear, descriptive names** for districts/schools/classrooms
- ✅ **Maintain consistent naming conventions**
- ✅ **Document class codes** in a secure location
- ✅ **Regular backups** of important data

### User Management
- ✅ **Respond to class requests quickly**
- ✅ **Help users with login issues**
- ✅ **Monitor for suspicious activity**
- ✅ **Keep user information up to date**

### Course Creation
- ✅ **Follow the Course Content Guide**
- ✅ **Test courses before launching**
- ✅ **Gather feedback from students**
- ✅ **Update content regularly**

---

## 💡 Pro Tips

### Keyboard Shortcuts
- `Ctrl/Cmd + K` - Quick search (coming soon)
- `Esc` - Close dialogs
- `Tab` - Navigate between form fields

### Bulk Operations
- Use spreadsheets to prepare user lists
- Generate multiple invites at once (future feature)
- Import class rosters (future feature)

### Theme Recommendations
- **Ocean (Default):** Best for serious, professional environments
- **Forest:** Great for environmental or health-focused programs
- **Sunset:** Perfect for creative and energetic learning
- **Rose:** Ideal for arts, design, or expressive courses

---

## 📞 Getting Help

### Documentation
- **This Guide:** Quick reference for common tasks
- **Deployment Guide:** Technical deployment instructions
- **Course Content Guide:** How to create great courses
- **Improvements Summary:** What's new and improved

### Support Resources
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- React Docs: https://react.dev

### Troubleshooting
See `DEPLOYMENT_GUIDE.md` section "🐛 Troubleshooting"

---

## ✅ Daily Admin Checklist

**Every Morning:**
- [ ] Check Support Center dashboard
- [ ] Review pending class requests
- [ ] Check for expired invitations
- [ ] Respond to any user issues

**Weekly:**
- [ ] Review audit logs
- [ ] Check course enrollment trends
- [ ] Update course content if needed
- [ ] Archive old classrooms

**Monthly:**
- [ ] Review user roles and permissions
- [ ] Clean up deleted records (optional)
- [ ] Check system performance metrics
- [ ] Plan new courses or features

---

## 🎉 You're Ready!

You now know how to:
- ✅ Customize your theme
- ✅ Create districts, schools, and classrooms
- ✅ Invite users at all levels
- ✅ Manage users and entities
- ✅ Set up courses
- ✅ Monitor platform activity
- ✅ Handle common issues

**Welcome to Averon CodeLab administration!**

Start by creating your first district and inviting a few teachers. The rest will follow naturally as you explore the platform.

---

**Questions?** Refer to the other documentation files for detailed information on any topic.
