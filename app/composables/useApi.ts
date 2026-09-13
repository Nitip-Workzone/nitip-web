import { useConnectivityStore } from '~/stores/connectivity'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

interface ApiOptions {
    method?: HttpMethod
    body?: Record<string, unknown> | BodyInit | null
    headers?: Record<string, string>
    query?: Record<string, string | number | boolean>
    signal?: AbortSignal
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

    // Single-flight refresh shared across requests
    let refreshPromise: Promise<boolean> | null = null
    const doRefresh = async (): Promise<boolean> => {
        if (refreshPromise) return refreshPromise
        refreshPromise = (async () => {
            try {
                const auth = useAuthStore()
                const ok = await auth.refreshSession()
                return ok
            } catch { return false } finally { refreshPromise = null }
        })()
        return refreshPromise
    }

    return {
        async request<T>(path: string, options: ApiOptions = {}) {
            // X-Platform always web for web app; never 'mobile'
            const headers: Record<string, string> = {
                'X-Platform': 'web',
                ...options.headers,
            }

            if (authStore.token) {
                headers['Authorization'] = `Bearer ${authStore.token}`
            }

            const startTime = Date.now()

            // If path starts with /, combine manually with baseURL to avoid ofetch overriding baseURL
            const targetPath = path.startsWith('/') ? `${baseURL}${path}` : `${baseURL}/${path}`

            const connectivityStore = useConnectivityStore()
            // Proactive watchdog: if the request takes more than 3 seconds, show the poor connection banner immediately
            const poorConnectionTimeout = setTimeout(() => {
                connectivityStore.setPoorConnection(true)
            }, 3000)

            return $fetch<T>(targetPath, {
                method: options.method,
                body: options.body,
                query: options.query,
                headers,
                signal: options.signal,
                onRequest() {
                    // verbose request logging removed for performance & security (2026-07-28 cleanup)
                },
                onResponse() {
                    clearTimeout(poorConnectionTimeout)
                    const duration = Date.now() - startTime
                    try {
                        if (duration < 1500) {
                            connectivityStore.setPoorConnection(false)
                        }
                    } catch { }
                },
                async onResponseError({ request, response }) {
                    clearTimeout(poorConnectionTimeout)
                    try {
                        connectivityStore.setPoorConnection(true)
                    } catch { }

                    const isLoginRequest = request.toString().includes('/auth/login')
                    const status = response?.status

                    if (!response) {
                        // Network error / connection refused
                        try {
                            const errorStore = useErrorStore()
                            errorStore.showError('Gagal terhubung ke server. Pastikan koneksi internet Anda aktif.', 'Kesalahan Jaringan')
                        } catch { }
                        return
                    }

                    if (status === 401) {
                        const isRefreshRequest = request.toString().includes('/auth/refresh')
                        const isLogoutRequest = request.toString().includes('/auth/logout')
                        const errorCode = (response._data as any)?.error_code as string | undefined
                        const isSessionExpired = !errorCode || errorCode === 'SESSION_EXPIRED' || errorCode === 'ACCOUNT_NOT_FOUND'
                        const isSuspended = errorCode === 'ACCOUNT_SUSPENDED' || errorCode === 'ACCOUNT_DELETED'
                        if (isRefreshRequest || isLogoutRequest) {
                            // refresh/logout failure: clear session
                            try {
                                if (import.meta.client) {
                                    const userId = authStore.user?.id
                                    if (userId) localStorage.removeItem(`nitip:fcm-token:${userId}`)
                                    authStore.logout()
                                } else authStore.token = null
                            } catch {}
                            return
                        }
                        if (!isLoginRequest && isSessionExpired) {
                            // try single-flight refresh once, then retry original request
                            const ok = await doRefresh()
                            if (ok) {
                                // retry original request with new token
                                const retryHeaders: Record<string, string> = { 'X-Platform': 'web', ...options.headers }
                                if (authStore.token) retryHeaders['Authorization'] = `Bearer ${authStore.token}`
                                const retryPath = request.toString().includes(baseURL) ? request.toString() : targetPath
                                try {
                                    const retryRes = await $fetch<T>(retryPath, { method: options.method, body: options.body, query: options.query, headers: retryHeaders, signal: options.signal })
                                    return retryRes as any
                                } catch {}
                            }
                            try {
                                if (import.meta.client) {
                                    const userId = authStore.user?.id
                                    if (userId) localStorage.removeItem(`nitip:fcm-token:${userId}`)
                                    authStore.logout()
                                } else authStore.token = null
                            } catch {}
                            return
                        }
                        if (isSuspended) {
                            try {
                                const errorStore = useErrorStore()
                                const msg = (response._data as any)?.message || 'Akun ditangguhkan.'
                                errorStore.showError(msg, 'Akses Ditolak')
                                if (import.meta.client) authStore.logout()
                            } catch {}
                            return
                        }
                        if (!isLoginRequest) {
                            try {
                                if (import.meta.client) {
                                    const userId = authStore.user?.id
                                    if (userId) {
                                        localStorage.removeItem(`nitip:fcm-token:${userId}`)
                                    }
                                    authStore.logout()
                                } else {
                                    authStore.token = null
                                }
                            } catch { }
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
                            } catch { }
                        }
                    } else if (status && status >= 400 && status <= 599) {
                        try {
                            const errorStore = useErrorStore()
                            const errData = response._data as { message?: string; error_code?: string; errors?: Array<{ field: string; message: string }> }
                            let msg = errData?.message || 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.'

                            // Extract and join validation errors if present
                            const validationErrors = errData?.errors
                            if (validationErrors && validationErrors.length > 0) {
                                msg = validationErrors.map(e => e.message).join(', ')
                            }

                            if (errData?.error_code === 'KYC_REQUIRED') {
                                errorStore.showError(
                                    `${msg}\n\nSilakan lengkapi verifikasi e-KYC (Facebook & Selfie) Anda di halaman Profil untuk membuka akses tanpa batas.`,
                                    'Verifikasi e-KYC Diperlukan'
                                )
                                return
                            }

                            const lowerMsg = msg.toLowerCase()
                            if (lowerMsg.includes('connection refused') || lowerMsg.includes('failed to connect') || lowerMsg.includes('network error')) {
                                msg = 'Gagal terhubung ke server. Pastikan koneksi internet Anda aktif.'
                            } else if (status === 502) {
                                msg = 'Server sedang tidak dapat diakses (502). Silakan coba beberapa saat lagi.'
                            } else if (status === 503) {
                                msg = 'Server sedang dalam pemeliharaan (503). Silakan coba beberapa saat lagi.'
                            } else if (status === 504) {
                                msg = 'Server membutuhkan waktu terlalu lama untuk merespons (504). Silakan coba beberapa saat lagi.'
                            }
                            // Jangan throw 500 ke error.vue, cukup toast
                            errorStore.showError(msg, 'Permintaan Gagal')
                        } catch { }
                    }
                },
            })
        },
    }
}
