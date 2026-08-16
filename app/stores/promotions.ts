import { defineStore } from 'pinia'

export interface Promotion {
  id: string
  code?: string | null
  merchant_id?: string | null
  merchant_name?: string
  title: string
  description?: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  budget_total: number
  budget_used: number
  budget_remaining: number
  max_uses: number
  used_count: number
  per_user_limit: number
  first_purchase_only: boolean
  discount_scope: 'item' | 'delivery' | 'total'
  min_order_amount: number
  auto_apply: boolean
  is_active: boolean
  valid_from?: string | null
  valid_until?: string | null
  avg_order_value_snapshot?: number | null
  discount_flat_est: number
  discount_percent_est: number
  created_at: string
  updated_at: string
}

export interface PromotionUsage {
  id: string
  promotion_id: string
  order_id: string
  user_id: string
  merchant_id?: string | null
  discount_amount: number
  original_amount?: number | null
  created_at: string
}

export interface SettlementItem {
  merchant_id?: string | null
  merchant_name: string
  total_liability: number
  order_count: number
}

export interface SettlementResponse {
  total_liability: number
  total_orders: number
  items: SettlementItem[]
}

export interface CalculatePreviewResponse {
  flat_per_order: number
  avg_order_value: number
  percent_est: number
  message: string
}

export interface ValidatePromotionResponse {
  valid: boolean
  promotion?: Promotion
  discount_amount: number
  message?: string
}

export const usePromotionsStore = defineStore('promotions', {
  state: () => ({
    promotions: [] as Promotion[],
    currentPromotion: null as Promotion | null,
    usages: [] as PromotionUsage[],
    usagesTotal: 0,
    settlements: null as SettlementResponse | null,
    preview: null as CalculatePreviewResponse | null,
    loading: false,
    search: '',
  }),

  actions: {
    async fetchAdminPromotions(params: {
      merchant_id?: string
      is_active?: boolean
      search?: string
      first_purchase_only?: boolean
      offset?: number
      limit?: number
    } = {}) {
      this.loading = true
      const { request } = useApi()
      try {
        const q = new URLSearchParams()
        if (params.merchant_id) q.set('merchant_id', params.merchant_id)
        if (params.is_active !== undefined) q.set('is_active', String(params.is_active))
        if (params.search) q.set('search', params.search)
        if (params.first_purchase_only !== undefined) q.set('first_purchase_only', String(params.first_purchase_only))
        q.set('offset', String(params.offset ?? 0))
        q.set('limit', String(params.limit ?? 20))
        const res = await request<{ data: { data: Promotion[]; total: number } }>(`/admin/promotions?${q.toString()}`)
        if (res.data) {
          // API returns {data: [], total} wrapped in envelope data
          const inner = res.data as unknown as { data?: Promotion[]; total?: number } & Promotion[]
          if (Array.isArray(inner)) {
            this.promotions = inner as Promotion[]
          } else if (inner.data) {
            this.promotions = inner.data as Promotion[]
          } else {
            const nested = res as unknown as { data: { data: { data: Promotion[] } } }
            if (nested.data?.data?.data) {
              this.promotions = nested.data.data.data
            } else {
              const fallback = res.data as unknown as { data: Promotion[]; total?: number }
              this.promotions = fallback.data || this.promotions
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch promotions', e)
      } finally {
        this.loading = false
      }
    },

    async fetchPromotion(id: string) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Promotion }>(`/admin/promotions/${id}`)
        if (res.data) {
          this.currentPromotion = res.data
          return res.data
        }
      } catch (e) {
        console.error('Failed to fetch promotion', e)
        throw e
      }
    },

    async createPromotion(payload: {
      title: string
      description?: string
      code?: string | null
      merchant_id?: string | null
      discount_type: 'flat' | 'percent'
      discount_value: number
      budget_total: number
      max_uses: number
      per_user_limit?: number
      first_purchase_only?: boolean
      discount_scope?: string
      min_order_amount?: number
      auto_apply?: boolean
      valid_from?: string | null
      valid_until?: string | null
      admin_password: string
      totp_code: string
    }) {
      const { request } = useApi()
      const res = await request<{ data: Promotion }>('/admin/promotions', {
        method: 'POST',
        body: payload,
      })
      await this.fetchAdminPromotions()
      return res.data
    },

    async updatePromotion(id: string, payload: Record<string, unknown>) {
      const { request } = useApi()
      const res = await request<{ data: Promotion }>(`/admin/promotions/${id}`, {
        method: 'PUT',
        body: payload,
      })
      await this.fetchAdminPromotions()
      return res.data
    },

    async deletePromotion(id: string, secure: { admin_password: string; totp_code: string }) {
      const { request } = useApi()
      await request(`/admin/promotions/${id}`, {
        method: 'DELETE',
        body: secure,
      })
      await this.fetchAdminPromotions()
    },

    async fetchUsages(promotionId: string, offset = 0, limit = 20) {
      const { request } = useApi()
      try {
        const res = await request<{ data: { data: PromotionUsage[]; total: number } }>(
          `/admin/promotions/${promotionId}/usages?offset=${offset}&limit=${limit}`
        )
        if (res.data) {
          const inner = res.data as unknown as { data: PromotionUsage[]; total: number }
          if (inner.data) {
            this.usages = inner.data
            this.usagesTotal = inner.total ?? inner.data.length
          }
        }
      } catch (e) {
        console.error('Failed to fetch usages', e)
      }
    },

    async fetchStats(promotionId: string) {
      const { request } = useApi()
      const res = await request<{ data: Record<string, unknown> }>(`/admin/promotions/${promotionId}/stats`)
      return res.data
    },

    async calculatePreview(payload: {
      budget_total: number
      max_uses: number
      merchant_id?: string | null
      discount_type?: string
      discount_value?: number
    }) {
      const { request } = useApi()
      const res = await request<{ data: CalculatePreviewResponse }>('/admin/promotions/calculate-preview', {
        method: 'POST',
        body: payload,
      })
      if (res.data) {
        this.preview = res.data
        return res.data
      }
    },

    async fetchSettlements(params: { merchant_id?: string; from?: string; to?: string } = {}) {
      const { request } = useApi()
      const q = new URLSearchParams()
      if (params.merchant_id) q.set('merchant_id', params.merchant_id)
      if (params.from) q.set('from', params.from)
      if (params.to) q.set('to', params.to)
      const res = await request<{ data: SettlementResponse }>(`/admin/promotions/settlements?${q.toString()}`)
      if (res.data) {
        this.settlements = res.data
        return res.data
      }
    },

    async fetchActivePromotions(merchantId?: string) {
      const { request } = useApi()
      const q = merchantId ? `?merchant_id=${merchantId}` : ''
      const res = await request<{ data: Promotion[] }>(`/promotions/active${q}`)
      return res.data || []
    },

    async validatePromotion(payload: {
      code?: string
      merchant_id?: string | null
      item_total: number
      delivery_total: number
      total: number
    }) {
      const { request } = useApi()
      const res = await request<{ data: ValidatePromotionResponse }>('/promotions/validate', {
        method: 'POST',
        body: payload,
      })
      return res.data
    },
  },
})
