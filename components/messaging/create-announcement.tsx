'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/security/csrf-client'

export function CreateAnnouncement({ classroomId }: { classroomId: string }) {
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('normal')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function createAnnouncement() {
    if (!message.trim()) return

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/announcements/create', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          classroom_id: classroomId,
          message,
          priority,
        }),
      })

      if (response.ok) {
        setResult({ type: 'success', text: 'Announcement posted successfully!' })
        setMessage('')
        setPriority('normal')
      } else {
        setResult({ type: 'error', text: 'Failed to post announcement' })
      }
    } catch (error) {
      console.error('[v0] Error creating announcement:', error)
      setResult({ type: 'error', text: 'Failed to post announcement' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Post Class Announcement
        </CardTitle>
        <CardDescription>
          Post a message that all students in this class will see on their dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement">Announcement Message</Label>
          <Textarea
            id="announcement"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your announcement..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Will be displayed as: "{message || 'Your message'}" - Your Name
          </p>
        </div>

        {result && (
          <p className={`text-sm ${result.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {result.text}
          </p>
        )}

        <Button
          onClick={createAnnouncement}
          disabled={sending || !message.trim()}
          className="w-full gap-2"
        >
          <Bell className="w-4 h-4" />
          {sending ? 'Posting...' : 'Post Announcement'}
        </Button>
      </CardContent>
    </Card>
  )
}
