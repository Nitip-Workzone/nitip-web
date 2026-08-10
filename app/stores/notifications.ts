import { defineStore } from 'pinia'

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    type?: string
    is_read: boolean
    created_at: string
    metadata?: Record<string, unknown>
}

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        notifications: [] as Notification[],
        unreadCount: 0,
        loading: false,
        notifiedIds: [] as string[],
        pollingIntervalId: null as any,
    }),

    actions: {
        async requestPermission() {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (window.Notification.permission === 'default') {
                    await window.Notification.requestPermission()
                }
            }
        },

        async fetchNotifications(triggerWebNotif = false) {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: Notification[] }>('/notifications')
                if (res.data) {
                    this.notifications = res.data
                    
                    // Web/Desktop Notification trigger
                    if (triggerWebNotif && typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
                        const newUnread = res.data.filter(n => !n.is_read && !this.notifiedIds.includes(n.id))
                        for (const notif of newUnread) {
                            this.notifiedIds.push(notif.id)
                            new window.Notification(notif.title, {
                                body: notif.message,
                                icon: '/favicon.ico'
                            })
                        }
                    } else {
                        // Track existing notification IDs
                        res.data.forEach(n => {
                            if (!this.notifiedIds.includes(n.id)) {
                                this.notifiedIds.push(n.id)
                            }
                        })
                    }
                }
                await this.fetchUnreadCount()
            } catch (error) {
                console.error('Failed to fetch notifications:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchUnreadCount() {
            const { request } = useApi()
            try {
                const res = await request<{ data: { unread_count: number } }>('/notifications/unread-count')
                if (res.data) {
                    this.unreadCount = res.data.unread_count ?? 0
                }
            } catch (error) {
                console.error('Failed to fetch unread count:', error)
            }
        },

        startPolling() {
            if (typeof window === 'undefined') return
            if (this.pollingIntervalId) return
            
            // Ask permission if default
            this.requestPermission()
            
            // Initial load triggering web notification
            this.fetchNotifications(true)
            
            // Poll every 15 seconds
            this.pollingIntervalId = setInterval(() => {
                this.fetchNotifications(true)
            }, 15000)
        },

        stopPolling() {
            if (this.pollingIntervalId) {
                clearInterval(this.pollingIntervalId)
                this.pollingIntervalId = null
            }
        },

        async markAsRead(id: string) {
            const { request } = useApi()
            try {
                await request(`/notifications/${id}/read`, { method: 'PUT' })
                const notif = this.notifications.find(n => n.id === id)
                if (notif && !notif.is_read) {
                    notif.is_read = true
                    this.unreadCount = Math.max(0, this.unreadCount - 1)
                }
            } catch (error) {
                console.error(`Failed to mark notification ${id} as read:`, error)
            }
        },

        async markAllAsRead() {
            const { request } = useApi()
            try {
                await request('/notifications/read-all', { method: 'PUT' })
                this.notifications.forEach(n => n.is_read = true)
                this.unreadCount = 0
            } catch (error) {
                console.error('Failed to mark all notifications as read:', error)
            }
        }
    }
})
