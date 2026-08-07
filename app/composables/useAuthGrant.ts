/**
 * Auth Grant Token composable
 *
 * Handles public client handshake without requiring API client secret.
 */

export const useAuthGrant = () => {
  const config = useRuntimeConfig()

  /**
   * Request a grant token from the backend.
   * Must be called before login.
   */
  async function getGrantToken(): Promise<string> {
    const apiKey = (config.public.nitipApiKey as string) || ''

    if (!apiKey) {
      console.error('[AuthGrant] API key missing — this causes 500 in WebView prod build. Key must be set at build time via NUXT_PUBLIC_NITIP_API_KEY env')
      throw new Error('Konfigurasi API tidak tersedia di build ini. Hubungi admin untuk rebuild web dengan env yang benar.')
    }

    const timestamp = new Date().toISOString()

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
          'X-Signature': '', // Signature is bypassed on backend for public web clients
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