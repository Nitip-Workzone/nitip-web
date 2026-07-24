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
    totp_enabled?: boolean
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
                const errStore = useErrorStore()
                const message = (error as { data?: { message?: string } })?.data?.message || 'Login gagal. Silakan periksa kembali email dan kata sandi Anda.'
                
                // Translate the title and message if it defaults to english in this store catch
                const finalTitle = 'Gagal Masuk'
                let finalMessage = message
                if (message === 'Login failed. Please check your credentials.') {
                    finalMessage = 'Email atau kata sandi salah. Silakan coba lagi.'
                } else if (message.includes('missing X-Grant-Token') || message.includes('grant token')) {
                    finalMessage = 'Token keamanan (Grant Token) tidak ditemukan atau tidak valid. Silakan muat ulang halaman.'
                }
                
                errStore.showError(finalMessage, finalTitle)
                return { success: false }
            } finally {
                this.loading = false
            }
        },
        async register(payload: { name: string; email: string; password: string; whatsapp_number: string }) {
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
        logout() {
            this.setUser(null)
            this.setToken(null)
            if (import.meta.client) {
                navigateTo('/login')
            }
        },
    },
})