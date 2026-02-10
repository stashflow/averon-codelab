import { createClient } from '@/lib/supabase/server'
import { encryptMessage } from '@/lib/encryption'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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

    // Encrypt the message content
    const { encrypted, iv } = await encryptMessage(content)

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id,
        subject,
        encrypted_content: encrypted,
        encryption_iv: iv,
        parent_message_id,
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
