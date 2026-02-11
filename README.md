# Averon Codelab

A comprehensive educational platform built with Next.js 16, Supabase, and TypeScript.

## 🚀 Features

- **Multi-tenant Architecture**: Support for districts, schools, classrooms, and students
- **Role-based Access Control**: Full admin, district admin, school admin, teacher, and student roles
- **Magic Link Invitations**: Secure invitation system for onboarding users
- **Course Management**: Create and manage courses, lessons, and assignments
- **Real-time Messaging**: Announcements and direct messaging between users
- **Progress Tracking**: Student lesson progress and assignment submissions

## 🏗 Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript
- **Form Validation**: React Hook Form + Zod

## 📋 Prerequisites

- Node.js 18+ 
- A Supabase account and project
- Git

## 🛠 Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd averon-codelab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run database migrations**
   
   Execute the SQL scripts in the `scripts/` folder in your Supabase SQL Editor, especially:
   ```
   scripts/021_fix_recursion_final.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin panel
│   ├── auth/              # Authentication pages
│   ├── courses/           # Course pages
│   ├── classroom/         # Classroom pages
│   └── ...
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase client setup
│   └── ...
├── scripts/              # Database migration scripts
└── ...
```

## 👥 User Roles

1. **Full Admin**: Complete system access, can create districts and manage all users
2. **District Admin**: Manage schools within their district
3. **School Admin**: Manage teachers and students in their school
4. **Teacher**: Create classrooms, assignments, and manage students
5. **Student**: Access courses, submit assignments, track progress

## 🔐 Security

- Row Level Security (RLS) policies on all tables
- Non-recursive RLS policies to prevent infinite loops
- Secure session management via Supabase
- Role-based access control at database level

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

Quick deploy to Vercel:
1. Push to GitHub
2. Connect your repo to Vercel
3. Add environment variables
4. Deploy!

## 📝 Recent Fixes

✅ Fixed infinite recursion in RLS policies for `school_admins`, `schools`, `magic_links`, and `classrooms`
✅ Magic link creation and redemption working correctly
✅ School and classroom queries no longer return 500 errors
✅ Admin panel fully functional

## 🐛 Troubleshooting

### Magic Links Not Working
- Verify environment variables are set
- Check Supabase RLS policies are applied
- Ensure user has correct role in database

### 500 Errors on Queries
- Run latest migration: `scripts/021_fix_recursion_final.sql`
- Check Supabase logs for details

### Build Failures
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

[Your License Here]

---

Built with ❤️ for education
