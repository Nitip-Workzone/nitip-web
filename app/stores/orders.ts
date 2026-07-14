import { defineStore } from 'pinia'

export interface AdminOrder {
    id: string
    requester_id: string
    runner_id?: string
    item_details: string
    status: string
    payment_status: string
    payment_method: string
    estimated_cost: number
    delivery_fee: number
    created_at: string
    updated_at: string
    receipt_image_url?: string
    delivery_image_url?: string
    dispute_reason?: string
}

export const useOrdersStore = defineStore('orders', {
    state: () => ({
        orders: [] as AdminOrder[],
        loading: false,
        actionLoading: false,
        filters: {
            status: '',
        },
    }),

    actions: {
        async fetchOrders() {
            this.loading = true
            const { request } = useApi()
            try {
                const params: Record<string, string> = {}
                if (this.filters.status) params.status = this.filters.status

                const query = new URLSearchParams(params).toString()
                const path = query ? `/admin/orders?${query}` : '/admin/orders'

                const res = await request<{ data: AdminOrder[] }>(path)
                if (res.data) {
                    this.orders = res.data
                }
            } catch (error) {
                console.error('Failed to fetch orders:', error)
            } finally {
                this.loading = false
            }
        },

        async cancelOrder(id: string) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/admin/orders/${id}/cancel`, {
                    method: 'POST'
                })
                await this.fetchOrders()
                return true
            } catch (error) {
                console.error('Failed to cancel order:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async resolveDispute(id: string, side: typeof ROLE_REQUESTER | typeof ROLE_RUNNER) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/admin/orders/${id}/resolve`, {
                    method: 'POST',
                    body: { side }
                })
                await this.fetchOrders()
                return true
            } catch (error) {
                console.error('Failed to resolve dispute:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        setFilter(status: string) {
            this.filters.status = status
            this.fetchOrders()
        }
    }
})
