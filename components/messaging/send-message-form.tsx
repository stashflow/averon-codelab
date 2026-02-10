'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send } from 'lucide-react'

interface Student {
  id: string
  full_name: string
  email: string
}

export function SendMessageForm({ classroomId }: { classroomId?: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (classroomId) {
      loadStudents()
    }
  }, [classroomId])

  async function loadStudents() {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          student:student_id(id, full_name, email)
        `)
        .eq('classroom_id', classroomId)

      const studentsList = data?.map((e: any) => e.student).filter(Boolean) || []
      setStudents(studentsList)
    } catch (error) {
      console.error('[v0] Error loading students:', error)
    }
  }

  async function sendMessage() {
    if (!selectedStudent || !content.trim()) return

    setSending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedStudent,
          subject,
          content,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Message sent successfully!' })
        setSelectedStudent('')
        setSubject('')
        setContent('')
      } else {
        setMessage({ type: 'error', text: 'Failed to send message' })
      }
    } catch (error) {
      console.error('[v0] Error sending message:', error)
      setMessage({ type: 'error', text: 'Failed to send message' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send Private Message
        </CardTitle>
        <CardDescription>Send a secure, encrypted message to a student</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="student">Select Student</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger id="student">
              <SelectValue placeholder="Choose a student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name} ({student.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Message subject..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Message</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            rows={6}
          />
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <Button
          onClick={sendMessage}
          disabled={sending || !selectedStudent || !content.trim()}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send Message'}
        </Button>
      </CardContent>
    </Card>
  )
}
