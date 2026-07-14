import { defineStore } from 'pinia'

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    is_read: boolean
    created_at: string
}

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        notifications: [] as Notification[],
        unreadCount: 0,
        loading: false,
    }),

    actions: {
        async fetchNotifications() {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: Notification[] }>('/notifications')
                if (res.data) {
                    this.notifications = res.data
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
