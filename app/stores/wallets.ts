import { defineStore } from 'pinia'

interface WalletTransaction {
    id: string
    wallet_id: string
    order_id?: string
    type: string
    amount: number
    reference?: string
    status: string
    created_at: string
}

export interface SystemBalanceSummary {
    balance: number
    total_collected: number
    today: number
    this_week: number
    this_month: number
}

export const useWalletsStore = defineStore('wallets', {
    state: () => ({
        withdrawals: [] as WalletTransaction[],
        systemBalance: null as SystemBalanceSummary | null,
        loading: false,
        systemBalanceLoading: false,
        actionLoading: false,
    }),

    actions: {
        async fetchWithdrawals() {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: WalletTransaction[] }>('/admin/wallets/withdrawals')
                if (res.data) {
                    this.withdrawals = res.data
                }
            } catch (error) {
                console.error('Failed to fetch withdrawals:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchSystemBalance() {
            this.systemBalanceLoading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: SystemBalanceSummary }>('/admin/wallets/system-balance')
                if (res.data) {
                    this.systemBalance = res.data
                }
            } catch (error) {
                console.error('Failed to fetch system balance:', error)
            } finally {
                this.systemBalanceLoading = false
            }
        },

        async approveWithdrawal(id: string) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                await request(`/admin/wallets/withdrawals/${id}/approve`, {
                    method: 'POST'
                })
                await this.fetchWithdrawals()
                return true
            } catch (error) {
                console.error('Failed to approve withdrawal:', error)
                return false
            } finally {
                this.actionLoading = false
            }
        }
    }
})