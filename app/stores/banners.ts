import { defineStore } from 'pinia'

export interface Banner {
  id: string
  title: string
  image_url: string
  redirect_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const useBannersStore = defineStore('banners', {
  state: () => ({
    banners: [] as Banner[],
    adminBanners: [] as Banner[],
    loading: false,
  }),

  actions: {
    async fetchActiveBanners() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Banner[] }>('/banners')
        if (res.data) {
          this.banners = res.data
        }
      } catch (error) {
        console.error('Failed to fetch active banners:', error)
      } finally {
        this.loading = false
      }
    },

    async adminFetchAllBanners() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Banner[] }>('/admin/banners')
        if (res.data) {
          this.adminBanners = res.data
        }
      } catch (error) {
        console.error('Failed to fetch admin banners:', error)
      } finally {
        this.loading = false
      }
    },

    async adminCreateBanner(payload: {
      title: string
      image_url: string
      redirect_url?: string
      is_active: boolean
    }) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Banner }>('/admin/banners', {
          method: 'POST',
          body: payload,
        })
        await this.adminFetchAllBanners()
        return res.data
      } catch (error) {
        console.error('Failed to create banner:', error)
        throw error
      }
    },

    async adminUpdateBanner(
      id: string,
      payload: {
        title: string
        image_url: string
        redirect_url?: string
        is_active: boolean
      }
    ) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Banner }>(`/admin/banners/${id}`, {
          method: 'PUT',
          body: payload,
        })
        await this.adminFetchAllBanners()
        return res.data
      } catch (error) {
        console.error('Failed to update banner:', error)
        throw error
      }
    },

    async adminDeleteBanner(id: string) {
      const { request } = useApi()
      try {
        await request(`/admin/banners/${id}`, {
          method: 'DELETE',
        })
        await this.adminFetchAllBanners()
      } catch (error) {
        console.error('Failed to delete banner:', error)
        throw error
      }
    },
  },
})
