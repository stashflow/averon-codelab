// Simple message encryption utility
// Uses Web Crypto API for AES-256-GCM encryption
// Note: This is basic encryption for functional purposes, not enterprise-grade security

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

// Generate or retrieve encryption key.
async function getEncryptionKey(): Promise<CryptoKey> {
  const passphrase = process.env.MESSAGE_ENCRYPTION_KEY
  if (!passphrase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MESSAGE_ENCRYPTION_KEY must be set in production')
    }
  }

  const keySource = passphrase || 'averon-codelab-dev-only-key'
  const saltSource = process.env.MESSAGE_ENCRYPTION_SALT || 'averon-salt-dev'
  
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keySource),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(saltSource),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(plaintext: string): Promise<{ encrypted: string; iv: string }> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const key = await getEncryptionKey()
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    )

    // Convert to base64 for storage
    const encryptedBase64 = Buffer.from(encrypted).toString('base64')
    const ivBase64 = Buffer.from(iv).toString('base64')

    return {
      encrypted: encryptedBase64,
      iv: ivBase64,
    }
  } catch (error) {
    console.error('[v0] Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

export async function decryptMessage(encryptedBase64: string, ivBase64: string): Promise<string> {
  try {
    const encrypted = Buffer.from(encryptedBase64, 'base64')
    const iv = Buffer.from(ivBase64, 'base64')
    
    const key = await getEncryptionKey()
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('[v0] Decryption error:', error)
    throw new Error('Failed to decrypt message')
  }
}

// Helper to check if running in supported environment
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}
