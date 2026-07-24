import { defineStore } from 'pinia'

export interface Review {
    id: string
    order_id: string
    reviewer_id: string
    runner_id: string
    runner_rating: number
    runner_comment?: string
    merchant_id?: string
    merchant_rating?: number
    merchant_comment?: string
    created_at: string
}

export interface UserOrder {
    id: string
    requester_id: string
    runner_id?: string
    merchant_id?: string
    item_details: string
    estimated_cost: number
    delivery_fee: number
    service_fee: number
    checking_fee: number
    total_payment: number
    tip_amount: number
    status: string
    payment_status: string
    payment_method: string
    payment_source?: string
    qris_data?: string
    created_at: string
    updated_at: string
    pickup_name?: string
    pickup_address: string
    pickup_lat: number
    pickup_lng: number
    delivery_name?: string
    delivery_address: string
    delivery_lat: number
    delivery_lng: number
    completion_code?: string
    receipt_image_url?: string
    delivery_image_url?: string
    dispute_reason?: string
    adjusted_cost?: number
    adjustment_reason?: string
    adjustment_status?: string
    service_category?: string
    receiver_name?: string
    receiver_phone?: string
    weight_kg?: number
    volume_liters?: number
    distance_km?: number
    order_type?: string
    cod_handling_fee?: number
    runner_name?: string
    runner_phone?: string
}

export const useUserOrdersStore = defineStore('user-orders', {
    state: () => ({
        orders: [] as UserOrder[],
        loading: false,
        actionLoading: false,
    }),

    getters: {
        activeOrders: (state) => state.orders.filter(o => !['completed', 'cancelled', 'expired'].includes(o.status)),
        pastOrders: (state) => state.orders.filter(o => ['completed', 'cancelled', 'expired'].includes(o.status)),
    },

    actions: {
        async fetchMyOrders(page = 1, limit = 15) {
            this.loading = page === 1
            const { request } = useApi()
            try {
                const res = await request<{ data: UserOrder[] }>(`/orders/me?page=${page}&limit=${limit}`)
                if (res.data) {
                    if (page === 1) {
                        this.orders = res.data
                    } else {
                        this.orders = [...this.orders, ...res.data]
                    }
                    return res.data
                }
                return []
            } catch (error) {
                console.error('Failed to fetch user orders:', error)
                return []
            } finally {
                this.loading = false
            }
        },

        async fetchOrderDetail(id: string): Promise<UserOrder | null> {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: UserOrder }>(`/orders/${id}`)
                return res.data || null
            } catch (error) {
                console.error(`Failed to fetch order detail for ID: ${id}`, error)
                return null
            } finally {
                this.loading = false
            }
        },

        async createOrder(payload: {
            item_details: string
            estimated_cost: number
            pickup_address: string
            pickup_lat: number
            pickup_lng: number
            delivery_address: string
            delivery_lat: number
            delivery_lng: number
            tip_amount: number
            payment_method: 'cod' | 'escrow'
            payment_source?: 'wallet' | 'qris'
            weight_kg: number
            volume_liters: number
            service_category: string
            merchant_id?: string
            items?: any[]
        }): Promise<UserOrder | null> {
            this.actionLoading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: UserOrder }>('/orders', {
                    method: 'POST',
                    body: payload
                })
                if (res.data) {
                    await this.fetchMyOrders()
                    return res.data
                }
                return null
            } catch (error) {
                console.error('Failed to create order:', error)
                return null
            } finally {
                this.actionLoading = false
            }
        },

        async refreshQRIS(id: string): Promise<UserOrder | null> {
            this.actionLoading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: UserOrder }>(`/orders/${id}/refresh-qris`, { method: 'POST' })
                if (res.data) {
                    await this.fetchMyOrders()
                    return res.data
                }
                return null
            } catch (error) {
                console.error('Failed to refresh QRIS:', error)
                return null
            } finally {
                this.actionLoading = false
            }
        },

        async cancelOrder(id: string): Promise<boolean> {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/orders/${id}/cancel`, { method: 'POST' })
                await this.fetchMyOrders()
                return true
            } catch (error) {
                console.error('Failed to cancel order:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async approveAdjustment(id: string): Promise<boolean> {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/orders/${id}/approve-adjustment`, { method: 'POST' })
                await this.fetchMyOrders()
                return true
            } catch (error) {
                console.error('Failed to approve price adjustment:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async rejectAdjustment(id: string): Promise<boolean> {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/orders/${id}/reject-adjustment`, { method: 'POST' })
                await this.fetchMyOrders()
                return true
            } catch (error) {
                console.error('Failed to reject price adjustment:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async disputeOrder(id: string, reason: string): Promise<boolean> {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/orders/${id}/dispute`, {
                    method: 'POST',
                    body: { reason }
                })
                await this.fetchMyOrders()
                return true
            } catch (error) {
                console.error('Failed to dispute order:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        },

        async fetchReview(orderId: string): Promise<Review | null> {
            const { request } = useApi()
            try {
                const res = await request<{ data: Review }>(`/orders/${orderId}/review`)
                return res.data || null
            } catch (error) {
                // 404 means no review yet — not an error
                return null
            }
        },

        async submitReview(
            id: string, 
            runnerRating: number, 
            runnerComment: string, 
            merchantRating?: number | null, 
            merchantComment?: string
        ): Promise<boolean> {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/orders/${id}/review`, {
                    method: 'POST',
                    body: { 
                        runner_rating: runnerRating, 
                        runner_comment: runnerComment,
                        merchant_rating: merchantRating || null,
                        merchant_comment: merchantComment || '',
                    }
                })
                await this.fetchMyOrders()
                return true
            } catch (error) {
                console.error('Failed to submit review:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        }
    }
})
