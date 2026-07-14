import { defineStore } from 'pinia'

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource: string
  resource_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string
  user_agent: string
  created_at: string
}

export interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

export const useAuditStore = defineStore('audit', {
  state: () => ({
    logs: [] as AuditLog[],
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    filters: {
      action: '',
    },
  }),

  actions: {
    async fetchAuditLogs(page: number = 1, action: string = '') {
      this.loading = true
      const { request } = useApi()
      try {
        const params: Record<string, string> = {
          page: page.toString(),
          limit: this.limit.toString(),
        }
        if (action) params.action = action

        const query = new URLSearchParams(params).toString()
        const res = await request<{ data: AuditResponse }>(`/admin/audits?${query}`)
        if (res.data) {
          this.logs = res.data.logs || []
          this.total = res.data.total || 0
          this.page = res.data.page || 1
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error)
      } finally {
        this.loading = false
      }
    },
  },
})
