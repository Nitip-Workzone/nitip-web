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
        // FCM listener handle — no interval polling anymore
        _fcmUnsub: null as any,
        _fcmListenerRegistered: false,
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
            
            // Disable if inside NitipMerchant WebView — handled natively by Flutter FCM
            if (typeof navigator !== 'undefined' && navigator.userAgent.includes('NitipMerchant')) {
                console.log('[Store-Notifications] Running inside NitipMerchant WebView: disabling web polling.')
                return
            }
            
            this.requestPermission()
            
            // Single initial fetch — no interval, replaced by FCM
            this.fetchNotifications(true)

            // Register FCM listener if available (via useFcm composable)
            if (!this._fcmListenerRegistered) {
                this._fcmListenerRegistered = true
                try {
                    // Lazy import to avoid circular dep — use window custom event emitted by useFcm / firebase plugin
                    if (typeof window !== 'undefined') {
                        const handler = (e: any) => {
                            const detail = e?.detail || {}
                            // Any new notification FCM -> refresh unread count + list
                            // data.type: new_notification, order_status_changed, payment_confirmed, merchant_order etc
                            if (detail) {
                                this.fetchNotifications(true)
                            }
                        }
                        window.addEventListener('nitip:fcm-notification' as any, handler)
                        this._fcmUnsub = () => window.removeEventListener('nitip:fcm-notification' as any, handler)
                    }
                } catch {}
            }
            console.log('[Store-Notifications] Polling disabled — using FCM + single fetch. Interval removed.')
        },

        stopPolling() {
            if (this._fcmUnsub) {
                try { this._fcmUnsub() } catch {}
                this._fcmUnsub = null
            }
            this._fcmListenerRegistered = false
            // No interval to clear anymore
            this.pollingIntervalId = null
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
