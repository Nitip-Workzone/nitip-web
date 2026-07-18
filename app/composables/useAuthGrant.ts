/**
 * Auth Grant Token composable
 *
 * Handles the HMAC-SHA256 grant token flow required before login.
 *
 * Flow:
 * 1. Client computes: payload = timestamp + "." + SHA256(body)
 * 2. Client computes: signature = HMAC-SHA256(payload, api_secret)
 * 3. POST /auth/grant with X-API-Key, X-Timestamp, X-Signature headers
 * 4. Returns grant_token which is then used in X-Grant-Token header for login
 */

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSHA256(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const useAuthGrant = () => {
  const config = useRuntimeConfig()

  /**
   * Request a grant token from the backend.
   * Must be called before login.
   */
  async function getGrantToken(): Promise<string> {
    const apiKey = config.public.nitipApiKey as string
    const apiSecret = config.public.nitipApiSecret as string

    if (!apiKey || !apiSecret) {
      throw new Error('API key/secret not configured. Set NUXT_PUBLIC_NITIP_API_KEY and NUXT_PUBLIC_NITIP_API_SECRET in .env')
    }

    const timestamp = new Date().toISOString()
    const body = '' // POST /auth/grant has no body
    const bodyHash = await sha256Hex(body)
    const payload = `${timestamp}.${bodyHash}`
    const signature = await hmacSHA256(payload, apiSecret)

    const rawApiUrl = (config.public.nitipApiUrl as string || '').replace(/\/$/, '')
    const baseURL = rawApiUrl 
      ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
      : '/api/v1'
    const res = await $fetch<{ data: { grant_token: string; expires_at: string } }>(
      `${baseURL}/auth/grant`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
      },
    )

    if (!res.data?.grant_token) {
      throw new Error('Failed to obtain grant token')
    }

    return res.data.grant_token
  }

  return { getGrantToken }
}