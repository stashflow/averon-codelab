'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Send, Reply, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  subject: string | null
  content: string
  is_read: boolean
  created_at: string
  sender: {
    id: string
    full_name: string
    email: string
  }
  recipient: {
    id: string
    full_name: string
    email: string
  }
}

export function MessagesInbox() {
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([])
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [])

  async function loadMessages() {
    try {
      const [received, sent] = await Promise.all([
        fetch('/api/messages/inbox?type=received').then((r) => r.json()),
        fetch('/api/messages/inbox?type=sent').then((r) => r.json()),
      ])

      setReceivedMessages(received.messages || [])
      setSentMessages(sent.messages || [])
    } catch (error) {
      console.error('[v0] Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(messageId: string) {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
      })
      await loadMessages()
    } catch (error) {
      console.error('[v0] Error marking message as read:', error)
    }
  }

  async function sendReply() {
    if (!selectedMessage || !replyContent.trim()) return

    setSending(true)
    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedMessage.sender.id,
          subject: `Re: ${selectedMessage.subject || 'No subject'}`,
          content: replyContent,
          parent_message_id: selectedMessage.id,
        }),
      })

      setReplyContent('')
      setSelectedMessage(null)
      await loadMessages()
    } catch (error) {
      console.error('[v0] Error sending reply:', error)
    } finally {
      setSending(false)
    }
  }

  const unreadCount = receivedMessages.filter((m) => !m.is_read).length

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
          <CardDescription>View and respond to messages from teachers and admins</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="received">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received">
                Inbox ({receivedMessages.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent ({sentMessages.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="space-y-4">
              <ScrollArea className="h-[400px]">
                {receivedMessages.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No messages</p>
                ) : (
                  <div className="space-y-2">
                    {receivedMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                          !message.is_read ? 'bg-accent/50 border-primary' : ''
                        }`}
                        onClick={() => {
                          setSelectedMessage(message)
                          if (!message.is_read) {
                            markAsRead(message.id)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {message.sender.full_name}
                              </p>
                              {!message.is_read && (
                                <Badge variant="default" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mt-1">
                              {message.subject || 'No subject'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {message.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sent" className="space-y-4">
              <ScrollArea className="h-[400px]">
                {sentMessages.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No sent messages</p>
                ) : (
                  <div className="space-y-2">
                    {sentMessages.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              To: {message.recipient.full_name}
                            </p>
                            <p className="text-sm font-medium text-muted-foreground mt-1">
                              {message.subject || 'No subject'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {message.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5" />
              Reply to {selectedMessage.sender.full_name}
            </CardTitle>
            <CardDescription>
              Re: {selectedMessage.subject || 'No subject'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Original message:</p>
              <p className="text-sm">{selectedMessage.content}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply">Your reply</Label>
              <Textarea
                id="reply"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={5}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedMessage(null)
                  setReplyContent('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={sendReply}
                disabled={sending || !replyContent.trim()}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
