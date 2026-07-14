import { defineStore } from 'pinia'

export interface SystemConfig {
  key: string
  value: string
  description: string
  created_at?: string
  updated_at?: string
}

export const useConfigsStore = defineStore('configs', {
  state: () => ({
    configs: [] as SystemConfig[],
    loading: false,
    actionLoading: false,
  }),

  actions: {
    async fetchConfigs() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: SystemConfig[] }>('/admin/configs')
        if (res.data) {
          this.configs = res.data
        }
      } catch (error) {
        console.error('Failed to fetch configs:', error)
      } finally {
        this.loading = false
      }
    },

    async updateConfig(key: string, value: string, description: string = '') {
      this.actionLoading = true
      const { request } = useApi()
      try {
        await request(`/admin/configs/${key}`, {
          method: 'PUT',
          body: { value, description },
        })
        const cfg = this.configs.find((c) => c.key === key)
        if (cfg) {
          cfg.value = value
          cfg.description = description
        }
        return true
      } catch (error) {
        console.error(`Failed to update config ${key}:`, error)
        return false
      } finally {
        this.actionLoading = false
      }
    },
  },
})
