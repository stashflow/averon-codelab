# Deployment Guide

## ✅ What's Been Fixed

### 1. **RLS Policy Infinite Recursion** ✅
- Fixed circular references in `school_admins`, `schools`, `magic_links`, and `classrooms` tables
- Removed recursive policy checks that caused 500 errors
- Applied non-recursive policies that check only the `profiles` table

### 2. **Magic Link Creation** ✅
- API route now works without triggering RLS recursion
- Proper permission checks for full_admin, district_admin, and school_admin roles

### 3. **School Creation** ✅
- Database queries no longer fail with 500 errors
- Classrooms and other related queries work correctly

### 4. **Build Configuration** ✅
- Next.js config optimized for production
- TypeScript checking enabled
- ESLint configured properly
- Image optimization configured for Supabase

## 🚀 Deployment Steps

### 1. Environment Variables

Make sure these environment variables are set in your Vercel project:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_APP_URL=<your-production-url>
```

You can add these in the Vercel dashboard under:
**Project Settings → Environment Variables**

### 2. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)
1. Push your changes to GitHub
2. Connect your repo to Vercel
3. Vercel will automatically deploy on every push

#### Option B: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

#### Option C: v0 One-Click Deploy
Click the **Publish** button in the top right of the v0 interface.

### 3. Post-Deployment Verification

After deploying, test the following features:

- [ ] Login/Signup works
- [ ] Magic link creation (as admin)
- [ ] Magic link redemption
- [ ] School creation (as full_admin)
- [ ] District creation (as full_admin)
- [ ] Classroom creation
- [ ] Teacher/Student invitation

### 4. Database Migration Status

All necessary SQL migrations have been applied to fix the RLS issues:
- `scripts/021_fix_recursion_final.sql` - **APPLIED** ✅

If deploying to a new environment, run all scripts in order:
```bash
# Execute in Supabase SQL Editor or via CLI
psql <database-url> -f scripts/021_fix_recursion_final.sql
```

## 🔍 Testing the Fixes

### Test Magic Link Creation
```bash
curl -X POST https://your-domain.com/api/magic-links/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "email": "test@example.com",
    "role": "teacher",
    "school_id": "<school-id>",
    "expires_in_hours": 72
  }'
```

Should return: `200 OK` with invite URL

### Test School Queries
Visit the admin panel: `https://your-domain.com/admin/panel`

You should see:
- ✅ Schools list loads without 500 error
- ✅ Classrooms list loads without 500 error
- ✅ Magic links list loads without 500 error

## 🛠 Troubleshooting

### Issue: Still getting 500 errors
**Solution:** Make sure the SQL migration was applied to your production database. Check Supabase logs.

### Issue: Environment variables not working
**Solution:** 
1. Verify they're set in Vercel dashboard
2. Redeploy after adding them
3. Check they start with `NEXT_PUBLIC_` for client-side access

### Issue: Magic links still fail
**Solution:**
1. Check Supabase RLS policies are updated
2. Verify the user making the request has the correct role
3. Check browser console for detailed error messages

## 📊 What's Working Now

✅ Full admin can create magic links for all roles
✅ District admin can invite school admins, teachers, students
✅ School admin can invite teachers and students
✅ Magic link redemption updates user roles correctly
✅ School and classroom queries work without recursion errors
✅ Admin panel loads all data correctly

## 🔐 Security Notes

- RLS policies are now non-recursive and secure
- Password hashing uses bcrypt
- Session management via Supabase Auth
- All sensitive operations require authentication
- Role-based access control enforced at database level

## 📝 Next Steps After Deployment

1. Create your first full_admin user via Supabase dashboard
2. Use the admin panel to create districts and schools
3. Generate magic links to invite other admins
4. Test the full workflow end-to-end

---

**Ready to deploy!** 🎉
