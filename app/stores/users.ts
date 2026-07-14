import { defineStore } from 'pinia'

export interface AdminUser {
    id: string
    name: string
    email: string
    role: string
    trust_score: number
    is_verified: boolean
    created_at: string
    updated_at: string
    fcm_token?: string | null
    last_lat?: number | null
    last_lng?: number | null
    is_suspended: boolean
    suspended_reason?: string | null
    deleted_at?: string | null
    totp_enabled?: boolean
}

export interface UserFilters {
    role: string
    is_verified: string // 'all' | 'true' | 'false'
}

export const useUsersStore = defineStore('users', {
    state: () => ({
        users: [] as AdminUser[],
        loading: false,
        actionLoading: false,
        filters: {
            role: '',
            is_verified: '',
        } as UserFilters,
    }),

    getters: {
        filteredUsers: (state) => state.users,
    },

    actions: {
        async fetchUsers() {
            this.loading = true
            const { request } = useApi()
            try {
                const params: Record<string, string> = {}
                if (this.filters.role) params.role = this.filters.role
                if (this.filters.is_verified !== '') params.is_verified = this.filters.is_verified

                const query = new URLSearchParams(params).toString()
                const path = query ? `/admin/users?${query}` : '/admin/users'

                const res = await request<{ data: AdminUser[] }>(path)
                if (res.data) {
                    this.users = res.data
                }
            } catch (error) {
                console.error('Failed to fetch users:', error)
            } finally {
                this.loading = false
            }
        },

        async verifyUser(id: string, isVerified: boolean) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/admin/users/${id}/verify?is_verified=${isVerified}`, {
                    method: 'PUT',
                })
                // Update local state immediately
                const user = this.users.find((u) => u.id === id)
                if (user) user.is_verified = isVerified
                return true
            } catch (error) {
                console.error('Failed to verify user:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async updateTrust(id: string, score: number) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/admin/users/${id}/trust?score=${score}`, {
                    method: 'PUT',
                })
                // Update local state immediately
                const user = this.users.find((u) => u.id === id)
                if (user) user.trust_score = score
                return true
            } catch (error) {
                console.error('Failed to update trust score:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async suspendUser(id: string, isSuspended: boolean, reason: string) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/admin/users/${id}/suspend?is_suspended=${isSuspended}&reason=${encodeURIComponent(reason)}`, {
                    method: 'PUT',
                })
                // Update local state immediately
                const user = this.users.find((u) => u.id === id)
                if (user) {
                    user.is_suspended = isSuspended
                    user.suspended_reason = isSuspended ? reason : null
                }
                return true
            } catch (error) {
                console.error('Failed to update suspend status:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async createUser(payload: Record<string, unknown>) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: AdminUser }>('/admin/users', {
                    method: 'POST',
                    body: payload,
                })
                if (res && res.data) {
                    this.users.unshift(res.data)
                }
                return true
            } catch (error) {
                console.error('Failed to create user:', error)
                throw error
            } finally {
                this.actionLoading = false
            }
        },

        async adminDisableTotp(id: string) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/admin/users/${id}/totp-disable`, {
                    method: 'POST',
                })
                // Update local state immediately
                const user = this.users.find((u) => u.id === id)
                if (user) {
                    user.totp_enabled = false
                }
                return true
            } catch (error) {
                console.error('Failed to disable TOTP:', error)
                throw error
            } finally {
                this.actionLoading = false
            }
        },

        setFilter(key: keyof UserFilters, value: string) {
            this.filters[key] = value
            this.fetchUsers()
        },
    },
})
