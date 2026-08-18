import { defineStore } from 'pinia'

interface User {
    id: string
    name: string
    email: string
    role: string
    trust_score: number
    is_verified: boolean
    whatsapp_number?: string
    avatar_url?: string
    has_pin?: boolean
    has_passkey?: boolean
    totp_enabled?: boolean
    home_address?: string
    home_lat?: number
    home_lng?: number
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as User | null,
        token: null as string | null,
        loading: false,
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
        isAdmin: (state) => state.user?.role === ROLE_ADMIN,
        isRequester: (state) => state.user?.role === ROLE_REQUESTER,
        isCS: (state) => state.user?.role === ROLE_CS,
    },

    actions: {
        setUser(user: User | null) {
            this.user = user
        },
        setToken(token: string | null) {
            this.token = token
            if (typeof window !== 'undefined') {
                // Client-side: Gunakan document.cookie secara langsung karena useCookie 
                // akan gagal jika dipanggil di luar konteks setup (misal setelah await)
                if (token) {
                    const maxAge = 60 * 60 * 24 * 7 // 7 hari
                    document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
                } else {
                    document.cookie = `auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
                }

                // Kirim token ke native bridge jika berjalan di dalam WebView
                const w = window as any
                if (w.NitipToken) {
                    try {
                        w.NitipToken.postMessage(token || '')
                    } catch (e) {
                        console.warn('[FCM-WebView] Gagal mengirim token ke native bridge:', e)
                    }
                }
            }
        },
        async login(email: string, pass: string, totpCode?: string, platform = 'web') {
            this.loading = true
            try {
                // Step 1: Get grant token via HMAC
                const { getGrantToken } = useAuthGrant()
                const grantToken = await getGrantToken()

                // Step 2: Login with grant token
                const config = useRuntimeConfig()
                const rawApiUrl = (config.public.nitipApiUrl as string || '').replace(/\/$/, '')
                const baseURL = rawApiUrl 
                    ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
                    : '/api/v1'
                const res = await $fetch<{ data: { token?: string, require_totp?: boolean } }>(
                    `${baseURL}/auth/login`,
                    {
                        method: 'POST',
                        body: { email, password: pass, device_id: 'web-client', totp_code: totpCode },
                        headers: {
                            'X-Grant-Token': grantToken,
                            'X-Platform': platform,
                        },
                    },
                )

                if (res.data?.require_totp) {
                    return { requireTotp: true }
                }

                if (res.data?.token) {
                    this.setToken(res.data.token)
                    return { success: true }
                }
                return { success: false }
            } catch (error: unknown) {
                console.error('Login failed:', error)
                const message = (error as { data?: { message?: string }, message?: string })?.data?.message || (error as { message?: string })?.message || 'Login gagal. Silakan periksa kembali email dan kata sandi Anda.'
                // Harden: jangan throw ke error.vue 500
                try {
                const errStore = useErrorStore()
                const finalTitle = 'Gagal Masuk'
                let finalMessage = message as string
                if (finalMessage === 'Login failed. Please check your credentials.') {
                    finalMessage = 'Email atau kata sandi salah. Silakan coba lagi.'
                } else if ((finalMessage as string).toLowerCase().includes('konfigurasi api')) {
                    finalMessage = 'Konfigurasi API tidak tersedia di build web ini. Admin perlu rebuild dengan NUXT_PUBLIC_NITIP_API_KEY/SECRET terisi.'
                } else if ((finalMessage as string).includes('missing X-Grant-Token') || (finalMessage as string).toLowerCase().includes('grant token')) {
                    finalMessage = 'Token keamanan (Grant Token) tidak ditemukan atau tidak valid. Silakan muat ulang halaman.'
                }
                errStore.showError(finalMessage, finalTitle)
                } catch {}
                return { success: false }
            } finally {
                this.loading = false
            }
        },
        async register(payload: { name: string; email: string; password: string; whatsapp_number: string; latitude?: number; longitude?: number }) {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: { id: string } }>('/users/register', {
                    method: 'POST',
                    body: {
                        ...payload,
                        role: ROLE_REQUESTER,
                        device_id: 'web-client',
                    },
                })

                if (res.data?.id) {
                    // Auto-login after successful registration
                    const loginRes = await this.login(payload.email, payload.password)
                    return loginRes.success === true
                }
                return false
            } catch (error: unknown) {
                console.error('Registration failed:', error)
                return false
            } finally {
                this.loading = false
            }
        },
        async fetchProfile(force = false) {
            if (this.user && !force) return
            const { request } = useApi()
            try {
                const res = await request<{ data: User }>('/users/me')
                if (res.data) {
                    this.setUser(res.data)
                }
            } catch (error) {
                console.error('Fetch profile failed:', error)
                throw error // Rethrow agar middleware tahu kalau request gagal
            }
        },
        async setupPin(pin: string) {
            this.loading = true
            const { request } = useApi()
            try {
                await request('/users/pin/setup', {
                    method: 'POST',
                    body: { pin }
                })
                await this.fetchProfile(true)
                return true
            } catch (error) {
                console.error('Setup PIN failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async changePin(oldPin: string, newPin: string) {
            this.loading = true
            const { request } = useApi()
            try {
                await request('/users/pin/change', {
                    method: 'POST',
                    body: { old_pin: oldPin, new_pin: newPin }
                })
                await this.fetchProfile(true)
                return true
            } catch (error) {
                console.error('Change PIN failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async setupTotp() {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: { secret: string, qr_base64: string } }>('/users/totp/setup', {
                    method: 'POST'
                })
                return res.data
            } catch (error) {
                console.error('Setup TOTP failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async enableTotp(code: string) {
            this.loading = true
            const { request } = useApi()
            try {
                await request('/users/totp/enable', {
                    method: 'POST',
                    body: { code }
                })
                await this.fetchProfile(true)
                return true
            } catch (error) {
                console.error('Enable TOTP failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async disableTotp(code: string) {
            this.loading = true
            const { request } = useApi()
            try {
                await request('/users/totp/disable', {
                    method: 'POST',
                    body: { code }
                })
                await this.fetchProfile(true)
                return true
            } catch (error) {
                console.error('Disable TOTP failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async webauthnRegisterBegin() {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: any }>('/auth/webauthn/register/begin', {
                    method: 'POST'
                })
                return res.data
            } catch (error) {
                console.error('WebAuthn register begin failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async webauthnRegisterFinish(credential: any) {
            this.loading = true
            const { request } = useApi()
            try {
                await request('/auth/webauthn/register/finish', {
                    method: 'POST',
                    body: credential
                })
                return true
            } catch (error) {
                console.error('WebAuthn register finish failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async webauthnLoginBegin(email: string) {
            this.loading = true
            const { request } = useApi()
            try {
                // Since this is standard login flow, we can use useApi which points to the correct baseURL
                const res = await request<{ data: any }>('/auth/webauthn/login/begin', {
                    method: 'POST',
                    body: { email }
                })
                return res.data
            } catch (error) {
                console.error('WebAuthn login begin failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        async webauthnLoginFinish(email: string, credential: any) {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: { token: string; user: User } }>(`/auth/webauthn/login/finish?email=${encodeURIComponent(email)}`, {
                    method: 'POST',
                    body: credential
                })
                if (res.data?.token) {
                    this.setToken(res.data.token)
                    this.setUser(res.data.user)
                    return { success: true }
                }
                return { success: false }
            } catch (error) {
                console.error('WebAuthn login finish failed:', error)
                throw error
            } finally {
                this.loading = false
            }
        },
        logout() {
            this.setUser(null)
            this.setToken(null)
            if (import.meta.client) {
                navigateTo('/login')
            }
        },
    },
})