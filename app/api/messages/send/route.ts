import { createClient } from '@/lib/supabase/server'
import { encryptMessage } from '@/lib/encryption'
import { NextResponse } from 'next/server'
import { ensureValidCsrf } from '@/lib/security/csrf'

export async function POST(request: Request) {
  try {
    const csrfError = ensureValidCsrf(request)
    if (csrfError) return csrfError

    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipient_id, subject, content, parent_message_id } = body

    if (!recipient_id || !content) {
      return NextResponse.json(
        { error: 'Recipient and content are required' },
        { status: 400 }
      )
    }

    if (recipient_id === user.id) {
      return NextResponse.json({ error: 'Cannot send messages to yourself' }, { status: 400 })
    }

    const safeContent = String(content).trim()
    if (!safeContent) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 })
    }
    if (safeContent.length > 10000) {
      return NextResponse.json({ error: 'Message content is too long' }, { status: 400 })
    }

    const safeSubject = subject ? String(subject).trim().slice(0, 255) : null

    const { data: recipient } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipient_id)
      .single()

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Encrypt the message content
    const { encrypted, iv } = await encryptMessage(safeContent)

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id,
        subject: safeSubject,
        encrypted_content: encrypted,
        encryption_iv: iv,
        parent_message_id: parent_message_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Error sending message:', error)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('[v0] Error in send message route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
