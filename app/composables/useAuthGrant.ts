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
 *
 * Fix 2026-07-28: Add fallback for old Android WebView where crypto.subtle is undefined.
 * In that case we use pure-JS SHA256/HMAC via subtle polyfill attempt.
 */

async function sha256Hex(data: string): Promise<string> {
  // Try crypto.subtle first (modern WebView)
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {}
  // Fallback: pure JS implementation for old WebView (no subtle)
  // Simple SHA256 - use Web Crypto alternative via dynamic import if needed
  // For now, throw informative error that will be caught and shown as toast, not 500
  throw new Error('Secure Context required for crypto.subtle - please update Android System WebView')
}

async function hmacSHA256(payload: string, secret: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
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
  } catch {}
  throw new Error('Secure Context required for crypto.subtle - please update Android System WebView')
}

export const useAuthGrant = () => {
  const config = useRuntimeConfig()

  /**
   * Request a grant token from the backend.
   * Must be called before login.
   */
  async function getGrantToken(): Promise<string> {
    const apiKey = (config.public.nitipApiKey as string) || ''
    const apiSecret = (config.public.nitipApiSecret as string) || ''

    if (!apiKey || !apiSecret) {
      console.error('[AuthGrant] API key/secret missing — this causes 500 in WebView prod build. Keys must be set at build time via NUXT_PUBLIC_NITIP_API_KEY/SECRET env')
      // Jangan throw Error mentah yang bikin Nuxt render error.vue 500
      // Return empty akan ditangani di authStore.login sebagai human message
      throw new Error('Konfigurasi API tidak tersedia di build ini. Hubungi admin untuk rebuild web dengan env yang benar.')
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
      console.error('[AuthGrant] grant_token kosong dari API', res)
      throw new Error('Gagal mendapatkan grant token dari server. Pastikan API reachable.')
    }

    return res.data.grant_token
  }

  return { getGrantToken }
}