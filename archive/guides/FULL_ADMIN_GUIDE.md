# AVERON CODELAB - FULL ADMIN GUIDE
**Your Complete Platform Management & Sales Playbook**

---

## 🔐 ACCESSING THE FULL ADMIN PANEL

### Step 1: Set Your Account as Full Admin
1. Sign up at `/auth/sign-up` with your email
2. Access your Supabase database at `https://supabase.com`
3. Navigate to **Table Editor** → **profiles** table
4. Find your profile row (match by email)
5. Change `role` field from `'student'` to `'full_admin'`
6. Save changes

### Step 2: Access the Admin Panel
- URL: `https://your-domain.com/admin/panel`
- The system will check your role and grant access
- You'll see the full district management dashboard

**Direct Access URL After Setup:**
```
https://v0-averon-code-lab-mvp-54.vercel.app/admin/panel
```

---

## 📊 FULL ADMIN DASHBOARD OVERVIEW

### Main Sections

#### 1. **Overview Tab** (Default View)
- **Platform Statistics**: Total districts, teachers, students, classes, assignments
- **Quick Metrics**: Active users, submission counts, course enrollments
- **Recent Activity Feed**: Latest district requests, teacher joins, class creations

#### 2. **Districts Tab**
- View all districts with status (active/inactive)
- Create new districts with custom codes
- Set class limits per district
- Assign district admins
- Monitor district usage and activity

... (truncated for archive)
