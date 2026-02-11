# Averon CodeLab - Complete Learning Management System

<div align="center">

**A Professional, Production-Ready Learning Management System**

Built with Next.js 15 • TypeScript • Supabase • Tailwind CSS

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 🌟 Overview

Averon CodeLab is a modern, full-featured learning management system designed specifically for coding education. It provides a comprehensive platform for administrators, teachers, and students with enterprise-grade features and beautiful, customizable themes.

### What Makes This Special

- **4 Beautiful Themes** with light/dark mode variants (8 total combinations)
- **Multi-Level Admin Hierarchy** (Full Admin → District Admin → School Admin → Teacher)
- **Comprehensive User Management** with secure delete and audit logging
- **Course Management System** ready for content
- **Modern, Accessible UI** following WCAG 2.1 AA standards
- **Production-Ready** with security, performance, and scalability baked in

---

## ✨ Features

### 🎨 Theme System
- **4 Professional Color Themes:**
  - Ocean (Blue/Cyan) - Default professional theme
  - Forest (Green/Emerald) - Natural, calming design
  - Sunset (Orange/Amber) - Warm, energetic aesthetic
  - Rose (Pink/Red) - Elegant, vibrant appearance
- **Light & Dark Modes** for each theme
- **Smooth Transitions** between theme changes
- **Persistent Selection** using localStorage
- **Accessible Colors** with proper contrast ratios

### 👥 User Management
- **Role-Based Access Control** (Full Admin, District Admin, School Admin, Teacher, Student)
- **Magic Link Invitations** with expiration
- **Password Reset** functionality
- **User Search & Filtering**
- **Account Deletion** with audit trails
- **Class Request System**

### 🏢 Organization Structure
- **Districts** → Top-level organization units
- **Schools** → Belong to districts
- **Classrooms** → Belong to schools, managed by teachers
- **Hierarchical Permissions** at each level
- **Flexible Configuration** (max students, max teachers, etc.)

### 📚 Course System
- **Course Categories** for organization
- **Course Enrollment** management
- **Progress Tracking** per student
- **Payment Integration Ready** (Stripe compatible)
- **Classroom-Based Access Control**
- **Multi-Level Difficulty** (Beginner, Intermediate, Advanced)

### 🛡️ Security Features
- **Row Level Security (RLS)** on all tables
- **Audit Logging** for sensitive operations
- **Soft Deletes** for data recovery
- **SQL Injection Protection** via parameterized queries
- **XSS Protection** via React sanitization
- **Role-Based Authorization** on all endpoints

### 🎯 Admin Tools
- **Comprehensive Admin Panel** at `/admin/panel`
- **Advanced Support Center** at `/admin/support-center`
- **System Statistics Dashboard**
- **Entity Management** (create, read, update, delete)
- **Real-Time Monitoring**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Vercel account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/stashflow/averon-codelab.git

# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Run database migrations
# Execute all scripts in /scripts folder in Supabase SQL Editor

# Start development server
npm run dev
```

### First-Time Setup

1. **Sign up** for your first account
2. **Make yourself a Full Admin:**
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'full_admin'
   FROM auth.users
   WHERE email = 'your-email@example.com'
   ON CONFLICT (user_id) DO UPDATE SET role = 'full_admin';
   ```
3. **Create your organization:**
   - Go to `/admin/panel`
   - Create districts, schools, and classrooms
4. **Invite users:**
   - Use the Invitations tab to generate magic links
5. **Set up courses:**
   - Follow the `COURSE_CONTENT_GUIDE.md`

---

## 📖 Documentation

### Essential Guides

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[ADMIN_QUICK_START.md](./ADMIN_QUICK_START.md)** | Step-by-step admin guide | Before using the platform |
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | Complete deployment checklist | Before going to production |
| **[COURSE_CONTENT_GUIDE.md](./COURSE_CONTENT_GUIDE.md)** | How to create course content | Before adding courses |
| **[IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md)** | What's new and improved | After setup to understand features |

### Quick Links

- **Admin Panel:** `/admin/panel` - Main management interface
- **Support Center:** `/admin/support-center` - Advanced user management
- **Courses:** `/courses` - Student course selection
- **Login:** `/auth/login` - Authentication

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide Icons** - Beautiful icon library

### Backend
- **Supabase** - PostgreSQL database with auth
- **Next.js API Routes** - Serverless functions
- **Row Level Security** - Database-level permissions

---

## 📁 Project Structure

```
averon-codelab/
├── app/
│   ├── admin/               # Admin interfaces
│   │   ├── panel/          # Main admin panel
│   │   └── support-center/ # User management center
│   ├── courses/            # Course pages
│   ├── api/                # API routes
│   │   └── admin/         # Admin API endpoints
│   ├── globals.css        # Global styles & themes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Shadcn UI components
│   ├── theme-provider.tsx # Theme context
│   └── theme-toggle.tsx   # Theme switcher
├── scripts/               # Database migrations
├── ADMIN_QUICK_START.md   # Admin guide
├── COURSE_CONTENT_GUIDE.md # Course creation guide
└── DEPLOYMENT_GUIDE.md    # Deployment instructions
```

---

## 🔐 Security

### Built-In Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Role-Based Authorization** - Hierarchical permissions
- **Audit Logging** - Track all sensitive operations
- **Soft Deletes** - Preserve data for recovery
- **Parameterized Queries** - Prevent SQL injection
- **React Sanitization** - Prevent XSS attacks
- **Secure Authentication** - Supabase Auth with magic links

---

## 🚀 Deployment

### Recommended: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Environment Variables

Required in Vercel:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

See `DEPLOYMENT_GUIDE.md` for complete instructions.

---

## 📊 What's New

### Latest Updates (v1.0.0)

✅ **4 Beautiful Themes** - Ocean, Forest, Sunset, Rose (light + dark)  
✅ **Advanced Admin Support Center** - Comprehensive user management  
✅ **Delete Functionality** - Secure soft delete with audit logging  
✅ **Improved Light Mode** - Much better aesthetics and contrast  
✅ **Course Content Guide** - Complete guide for creating courses  
✅ **Deployment Ready** - Full documentation and checklists  

---

## 🎯 Status

**Current Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** February 2026

### What's Complete

✅ Multi-level admin system  
✅ User management with delete  
✅ Organization structure  
✅ Course system framework  
✅ 4 themes × 2 modes = 8 variants  
✅ Security & audit logging  
✅ Complete documentation  
✅ Deployment ready

### What's Next

After launch:
1. Create course content (follow guide)
2. Invite beta users
3. Gather feedback
4. Iterate and improve

---

## 📞 Support

### Documentation
- Admin Guide: `ADMIN_QUICK_START.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
- Courses: `COURSE_CONTENT_GUIDE.md`
- Features: `IMPROVEMENTS_SUMMARY.md`

### External Resources
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Tailwind: https://tailwindcss.com/docs

---

<div align="center">

**Built with ❤️ for educators and students**

**Ready to help students learn to code! 🚀**

</div>
