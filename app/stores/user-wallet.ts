import { defineStore } from 'pinia'

export interface WalletBalance {
    balance: number
}

export interface WalletTransaction {
    id: string
    wallet_id: string
    order_id?: string
    type: string
    amount: number
    reference?: string
    status: string
    created_at: string
    unique_code?: number
}

export interface WithdrawalChannel {
    id: string
    name: string
    code: string
    type: string
    admin_fee_flat: number
    admin_fee_percent: number
    min_amount: number
    estimated_time: string
    is_active: boolean
}

export interface InquiryResponse {
    account_name: string
    status: string
}

export interface UserBankAccount {
    id: string
    user_id: string
    bank_name: string
    account_no: string
    account_name: string
}

export const useUserWalletStore = defineStore('user-wallet', {
    state: () => ({
        balance: 0,
        transactions: [] as WalletTransaction[],
        withdrawalChannels: [] as WithdrawalChannel[],
        loading: false,
        actionLoading: false,
    }),

    actions: {
        async fetchBalance() {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: WalletBalance }>('/wallets/balance')
                if (res.data) {
                    this.balance = res.data.balance
                }
            } catch (error) {
                console.error('Failed to fetch wallet balance:', error)
            } finally {
                this.loading = false
            }
        },

        async fetchTransactions(page = 1, limit = 15) {
            this.loading = page === 1
            const { request } = useApi()
            try {
                const res = await request<{ data: WalletTransaction[] }>(`/wallets/transactions?page=${page}&limit=${limit}`)
                if (res.data) {
                    if (page === 1) {
                        this.transactions = res.data
                    } else {
                        this.transactions = [...this.transactions, ...res.data]
                    }
                    return res.data
                }
                return []
            } catch (error) {
                console.error('Failed to fetch wallet transactions:', error)
                return []
            } finally {
                this.loading = false
            }
        },

        async topUp(amount: number) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: { redirect_url?: string; qris_string?: string; reference?: string; pg_fee?: number } }>('/wallets/topup', {
                    method: 'POST',
                    body: { amount }
                })
                await this.fetchBalance()
                return res.data
            } catch (error) {
                console.error('Failed to top up:', error)
                throw error
            } finally {
                this.actionLoading = false
            }
        },

        async fetchWithdrawalChannels() {
            this.loading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: WithdrawalChannel[] }>('/wallets/withdrawal-channels')
                if (res.data) {
                    this.withdrawalChannels = res.data.filter(c => c.is_active)
                }
            } catch (error) {
                console.error('Failed to fetch withdrawal channels:', error)
            } finally {
                this.loading = false
            }
        },

        async inquiryAccount(channelCode: string, accountNo: string) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: InquiryResponse }>('/wallets/withdraw/inquiry', {
                    method: 'POST',
                    body: {
                        channel_code: channelCode,
                        account_no: accountNo
                    }
                })
                return res.data
            } catch (error) {
                console.error('Failed to verify account:', error)
                throw error
            } finally {
                this.actionLoading = false
            }
        },

        async withdraw(payload: {
            amount: number
            channel_id: string
            pin: string
            metadata: Record<string, unknown>
        }) {
            this.actionLoading = true
            const { request } = useApi()
            try {
                const res = await request<{ data: WalletTransaction }>('/wallets/withdraw', {
                    method: 'POST',
                    body: payload
                })
                await this.fetchBalance()
                return res.data
            } catch (error) {
                console.error('Failed to request withdrawal:', error)
                throw error
            } finally {
                this.actionLoading = false
            }
        },

        async fetchRegisteredBankAccount() {
            const { request } = useApi()
            try {
                const res = await request<{ data: UserBankAccount | null; message?: string; success?: boolean }>('/users/me/bank-account')
                // Backend now returns 200 with data=null when not yet registered
                if (res && (res as { data?: UserBankAccount | null }).data) {
                    return (res as { data: UserBankAccount }).data
                }
                return null
            } catch (error) {
                console.warn('Failed to fetch registered bank account or none found:', error)
                return null
            }
        }
    }
})
