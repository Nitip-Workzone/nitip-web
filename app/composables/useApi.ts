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
                    console.log(`[API Request] ${options.method || 'GET'} ${request.toString()}`, 'Headers:', options.headers)
                },
                onResponse({ request, response }) {
                    console.log(`[API Response] ${request.toString()} - Status: ${response.status}`)
                },
                async onResponseError({ request, response }) {
                    console.error(`[API Error] ${request.toString()} - Status: ${response.status}`, response._data)
                    const isLoginRequest = request.toString().includes('/auth/login')

                    if (response.status === 401) {
                        console.error('[API Error] 401 Unauthorized detected. Logging out...')
                        if (!isLoginRequest) {
                            if (import.meta.client) {
                                authStore.logout()
                            } else {
                                authStore.token = null
                            }
                        } else {
                            const errorStore = useErrorStore()
                            const serverMessage = (response._data as { message?: string })?.message
                            let humanMessage = 'Email atau kata sandi Anda salah. Silakan periksa kembali detail masuk Anda.'
                            
                            // Map specific known backend errors to human readable Indonesian sentences
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
                        }
                    } else if (response.status >= 400 && response.status <= 599) {
                        const errorStore = useErrorStore()
                        let msg = (response._data as { message?: string })?.message || 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.'
                        
                        // Map technical error messages that might slip through from proxy/gateway
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
                        
                        errorStore.showError(msg, 'Permintaan Gagal')
                    }
                },
            })
        },
    }
}
