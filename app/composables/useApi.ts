type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

interface ApiOptions {
    method?: HttpMethod
    body?: Record<string, unknown> | BodyInit | null
    headers?: Record<string, string>
    query?: Record<string, string | number | boolean>
}

export const useApi = () => {
    const authStore = useAuthStore()
    const config = useRuntimeConfig()
    // Jika NUXT_PUBLIC_NITIP_API_URL diset (production), browser menembak langsung ke API domain
    // Jika kosong (development), gunakan proxy lokal /api/v1 via Nitro
    const rawApiUrl = (config.public.nitipApiUrl as string || '').replace(/\/$/, '')
    const baseURL = rawApiUrl 
        ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
        : '/api/v1'

    return {
        async request<T>(path: string, options: ApiOptions = {}) {
            const headers: Record<string, string> = {
                'X-Platform': authStore.token ? 'mobile' : 'web-admin',
                ...options.headers,
            }

            if (authStore.token) {
                headers['Authorization'] = `Bearer ${authStore.token}`
            }

            // If path starts with /, combine manually with baseURL to avoid ofetch overriding baseURL
            const targetPath = path.startsWith('/') ? `${baseURL}${path}` : `${baseURL}/${path}`

            return $fetch<T>(targetPath, {
                method: options.method,
                body: options.body,
                query: options.query,
                headers,
                onRequest({ request, options }) {
                    try {
                    const reqHeaders = options.headers || headers
                    const payload = options.body ? JSON.stringify(options.body).substring(0, 1000) : 'empty'
                    console.log(`[API Request] ${options.method || 'GET'} ${request.toString()}`, '\n  Headers:', JSON.stringify(reqHeaders, null, 2), '\n  Query:', options.query, '\n  Payload:', payload)
                    } catch {}
                },
                onResponse({ request, response }) {
                    try {
                    const respHeaders = response.headers ? Object.fromEntries(response.headers.entries()) : {}
                    const bodyPreview = JSON.stringify(response._data || {}).substring(0, 2000)
                    console.log(`[API Response] ${request.toString()} - Status: ${response.status}`, '\n  Resp Headers:', JSON.stringify(respHeaders, null, 2), '\n  Body:', bodyPreview)
                    } catch {}
                },
                async onResponseError({ request, response }) {
                    try {
                    console.error(`[API Error] ${request.toString()} - Status: ${response.status}`, response._data)
                    } catch {}
                    const isLoginRequest = request.toString().includes('/auth/login')

                    if (response.status === 401) {
                        try { console.error('[API Error] 401 Unauthorized detected. Logging out...') } catch {}
                        if (!isLoginRequest) {
                            try {
                            if (import.meta.client) {
                                authStore.logout()
                            } else {
                                authStore.token = null
                            }
                            } catch {}
                        } else {
                            try {
                            const errorStore = useErrorStore()
                            const serverMessage = (response._data as { message?: string })?.message
                            let humanMessage = 'Email atau kata sandi Anda salah. Silakan periksa kembali detail masuk Anda.'
                            if (serverMessage) {
                                const lowerMsg = serverMessage.toLowerCase()
                                if (lowerMsg.includes('missing x-grant-token') || lowerMsg.includes('grant token')) {
                                    humanMessage = 'Keamanan login gagal (Grant Token tidak valid). Coba muat ulang halaman ini.'
                                } else if (lowerMsg.includes('suspended')) {
                                    humanMessage = 'Akun Anda sedang ditangguhkan. Silakan hubungi dukungan pelanggan/admin.'
                                } else if (lowerMsg.includes('administrator')) {
                                    humanMessage = 'Akses ditolak: Administrator harus masuk melalui panel admin.'
                                }
                            }
                            errorStore.showError(humanMessage, 'Gagal Masuk')
                            } catch {}
                        }
                    } else if (response.status >= 400 && response.status <= 599) {
                        try {
                        const errorStore = useErrorStore()
                        let msg = (response._data as { message?: string })?.message || 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.'
                        const lowerMsg = msg.toLowerCase()
                        if (lowerMsg.includes('connection refused') || lowerMsg.includes('failed to connect') || lowerMsg.includes('network error')) {
                            msg = 'Gagal terhubung ke server. Pastikan koneksi internet Anda aktif.'
                        } else if (response.status === 502) {
                            msg = 'Server sedang tidak dapat diakses (502). Silakan coba beberapa saat lagi.'
                        } else if (response.status === 503) {
                            msg = 'Server sedang dalam pemeliharaan (503). Silakan coba beberapa saat lagi.'
                        } else if (response.status === 504) {
                            msg = 'Server membutuhkan waktu terlalu lama untuk merespons (504). Silakan coba beberapa saat lagi.'
                        }
                        // Jangan throw 500 ke error.vue, cukup toast
                        errorStore.showError(msg, 'Permintaan Gagal')
                        } catch {}
                    }
                },
            })
        },
    }
}
