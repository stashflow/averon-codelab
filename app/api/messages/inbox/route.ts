import { createClient } from '@/lib/supabase/server'
import { decryptMessage } from '@/lib/encryption'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'received' or 'sent'

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, full_name, email),
        recipient:recipient_id(id, full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (type === 'received') {
      query = query.eq('recipient_id', user.id)
    } else {
      query = query.eq('sender_id', user.id)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('[v0] Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Decrypt messages
    const decryptedMessages = await Promise.all(
      messages.map(async (msg) => {
        try {
          const decryptedContent = await decryptMessage(
            msg.encrypted_content,
            msg.encryption_iv
          )
          return {
            ...msg,
            content: decryptedContent,
            // Remove encrypted fields from response
            encrypted_content: undefined,
            encryption_iv: undefined,
          }
        } catch (error) {
          console.error('[v0] Error decrypting message:', msg.id, error)
          return {
            ...msg,
            content: '[Error decrypting message]',
            encrypted_content: undefined,
            encryption_iv: undefined,
          }
        }
      })
    )

    return NextResponse.json({ messages: decryptedMessages })
  } catch (error) {
    console.error('[v0] Error in inbox route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
