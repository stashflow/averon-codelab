-- Messaging System
-- Teachers/Admins can send messages to students (private & classwide)
-- Students can reply to private messages
-- Classwide messages appear on student dashboard

-- Private Messages Table (encrypted content)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  encrypted_content TEXT NOT NULL, -- AES-256 encrypted message
  encryption_iv TEXT NOT NULL, -- Initialization vector for decryption
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL, -- For threading/replies
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classwide Announcements (shown on student dashboards)
CREATE TABLE IF NOT EXISTS public.class_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track which students have seen announcements
CREATE TABLE IF NOT EXISTS public.announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.class_announcements(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, student_id)
);

-- Message attachments (optional for future expansion)
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Messages Policies
CREATE POLICY "messages_select_own" ON public.messages 
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "messages_insert" ON public.messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      -- Teachers/admins can message students
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'district_admin', 'school_admin', 'full_admin')) OR
      -- Students can reply to messages from teachers/admins
      EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.profiles p ON p.id = m.sender_id
        WHERE m.id = parent_message_id 
          AND m.recipient_id = auth.uid()
          AND p.role IN ('teacher', 'district_admin', 'school_admin', 'full_admin')
      )
    )
  );

CREATE POLICY "messages_update_own" ON public.messages 
  FOR UPDATE USING (
    auth.uid() = recipient_id -- Only recipients can mark as read
  );

-- Class Announcements Policies
CREATE POLICY "announcements_select_students" ON public.class_announcements 
  FOR SELECT USING (
    -- Students in the class can see announcements
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE classroom_id = class_announcements.classroom_id 
        AND student_id = auth.uid()
    ) OR
    -- Teachers/admins who created it or manage the class
    auth.uid() = teacher_id OR
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = class_announcements.classroom_id 
        AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "announcements_insert_teachers" ON public.class_announcements 
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id AND (
      -- Teacher owns the classroom
      EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_id AND teacher_id = auth.uid()
      ) OR
      -- Or is an admin
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
    )
  );

CREATE POLICY "announcements_update_teachers" ON public.class_announcements 
  FOR UPDATE USING (
    auth.uid() = teacher_id OR
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = classroom_id AND teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
  );

CREATE POLICY "announcements_delete_teachers" ON public.class_announcements 
  FOR DELETE USING (
    auth.uid() = teacher_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('district_admin', 'school_admin', 'full_admin'))
  );

-- Announcement Views Policies
CREATE POLICY "announcement_views_select_own" ON public.announcement_views 
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM public.class_announcements ca
      WHERE ca.id = announcement_id AND ca.teacher_id = auth.uid()
    )
  );

CREATE POLICY "announcement_views_insert_own" ON public.announcement_views 
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
  );

-- Message Attachments Policies
CREATE POLICY "attachments_select" ON public.message_attachments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id 
        AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
  );

CREATE POLICY "attachments_insert" ON public.message_attachments 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_classroom ON public.class_announcements(classroom_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.class_announcements(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_announcement_views_student ON public.announcement_views(student_id);
