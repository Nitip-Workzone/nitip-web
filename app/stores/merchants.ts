import { defineStore } from 'pinia'

export interface Merchant {
  id: string
  owner_id: string
  name: string
  description?: string
  address?: string
  latitude: number
  longitude: number
  category: string
  is_open: boolean
  auto_confirm: boolean
  max_active_orders: number
  rating: number
  created_at: string
  updated_at: string
}

export interface Menu {
  id: string
  merchant_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export const useMerchantsStore = defineStore('merchants', {
  state: () => ({
    merchants: [] as Merchant[],
    adminMerchants: [] as Merchant[],
    currentMerchant: null as Merchant | null,
    merchantMenus: [] as Menu[],
    merchantOrders: [] as any[],
    loading: false,
  }),

  actions: {
    async fetchNearbyMerchants(lat: number, lng: number, radiusKm = 10.0) {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant[] }>(
          `/merchants?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`
        )
        if (res.data) {
          this.merchants = res.data
        }
      } catch (error) {
        console.error('Failed to fetch nearby merchants:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchMerchantMenuPublic(merchantId: string) {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Menu[] }>(`/merchants/${merchantId}/menu`)
        if (res.data) {
          this.merchantMenus = res.data
        }
      } catch (error) {
        console.error('Failed to fetch merchant menu:', error)
      } finally {
        this.loading = false
      }
    },

    // Admin Actions
    async adminFetchAllMerchants() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant[] }>('/admin/merchants')
        if (res.data) {
          this.adminMerchants = res.data
        }
      } catch (error) {
        console.error('Failed to fetch admin merchants:', error)
      } finally {
        this.loading = false
      }
    },

    async adminCreateMerchant(payload: {
      owner_id: string
      name: string
      description?: string
      address?: string
      latitude: number
      longitude: number
      category: string
      auto_confirm: boolean
      max_active_orders: number
    }) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant }>('/admin/merchants', {
          method: 'POST',
          body: payload,
        })
        await this.adminFetchAllMerchants()
        return res.data
      } catch (error) {
        console.error('Failed to create merchant:', error)
        throw error
      }
    },

    async adminUpdateMerchant(
      id: string,
      payload: {
        name: string
        description?: string
        address?: string
        latitude: number
        longitude: number
        category: string
        max_active_orders: number
      }
    ) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant }>(`/admin/merchants/${id}`, {
          method: 'PUT',
          body: payload,
        })
        await this.adminFetchAllMerchants()
        return res.data
      } catch (error) {
        console.error('Failed to update merchant:', error)
        throw error
      }
    },

    async adminDeleteMerchant(id: string) {
      const { request } = useApi()
      try {
        await request(`/admin/merchants/${id}`, {
          method: 'DELETE',
        })
        await this.adminFetchAllMerchants()
      } catch (error) {
        console.error('Failed to delete merchant:', error)
        throw error
      }
    },

    // Merchant Owner Actions
    async fetchMerchantProfile() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant | null }>('/merchant/profile')
        if (res.data) {
          this.currentMerchant = res.data
        } else {
          this.currentMerchant = null
        }
        return res.data
      } catch (error) {
        console.error('Failed to fetch merchant profile:', error)
        this.currentMerchant = null
        throw error
      } finally {
        this.loading = false
      }
    },

    async createMerchantProfile(payload: {
      name: string
      description?: string
      address: string
      latitude: number
      longitude: number
      category: string
    }) {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant }>('/merchant/profile', {
          method: 'POST',
          body: payload,
        })
        if (res.data) {
          this.currentMerchant = res.data
        }
        return res.data
      } catch (error) {
        console.error('Failed to create merchant profile:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateMerchantStatus(payload: {
      is_open: boolean
      auto_confirm: boolean
      max_active_orders: number
    }) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant }>('/merchant/status', {
          method: 'PUT',
          body: payload,
        })
        this.currentMerchant = res.data
        return res.data
      } catch (error) {
        console.error('Failed to update merchant status:', error)
        throw error
      }
    },

    async fetchMerchantMenu() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: Menu[] }>('/merchant/menu')
        if (res.data) {
          this.merchantMenus = res.data
        }
      } catch (error) {
        console.error('Failed to fetch merchant menu:', error)
      } finally {
        this.loading = false
      }
    },

    async createMenuItem(payload: {
      name: string
      description?: string
      price: number
      image_url?: string
      is_available: boolean
    }) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Menu }>('/merchant/menu', {
          method: 'POST',
          body: payload,
        })
        await this.fetchMerchantMenu()
        return res.data
      } catch (error) {
        console.error('Failed to create menu item:', error)
        throw error
      }
    },

    async updateMenuItem(
      id: string,
      payload: {
        name: string
        description?: string
        price: number
        image_url?: string
        is_available: boolean
      }
    ) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Menu }>(`/merchant/menu/${id}`, {
          method: 'PUT',
          body: payload,
        })
        await this.fetchMerchantMenu()
        return res.data
      } catch (error) {
        console.error('Failed to update menu item:', error)
        throw error
      }
    },

    async deleteMenuItem(id: string) {
      const { request } = useApi()
      try {
        await request(`/merchant/menu/${id}`, {
          method: 'DELETE',
        })
        await this.fetchMerchantMenu()
      } catch (error) {
        console.error('Failed to delete menu item:', error)
        throw error
      }
    },

    async uploadMenuImage(file: File): Promise<string> {
      const { request } = useApi()
      const formData = new FormData()
      formData.append('image', file)

      try {
        const res = await request<{ data: { url: string } }>('/merchant/menu/upload', {
          method: 'POST',
          body: formData,
        })
        return res.data?.url || ''
      } catch (error) {
        console.error('Failed to upload menu image:', error)
        throw error
      }
    },

    async fetchMerchantOrders() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: any[] }>('/orders/merchant/orders')
        if (res.data) {
          this.merchantOrders = res.data
        }
        return res.data
      } catch (error) {
        console.error('Failed to fetch merchant orders:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async acceptMerchantOrder(id: string) {
      const { request } = useApi()
      try {
        const res = await request(`/orders/${id}/merchant-accept`, {
          method: 'POST',
        })
        await this.fetchMerchantOrders()
        return res
      } catch (error) {
        console.error('Failed to accept order:', error)
        throw error
      }
    },

    async readyMerchantOrder(id: string) {
      const { request } = useApi()
      try {
        const res = await request(`/orders/${id}/merchant-ready`, {
          method: 'POST',
        })
        await this.fetchMerchantOrders()
        return res
      } catch (error) {
        console.error('Failed to mark order ready:', error)
        throw error
      }
    },

    async toggleMenuAvailability(id: string, isAvailable: boolean) {
      const { request } = useApi()
      try {
        const res = await request(`/merchant/menu/${id}/toggle`, {
          method: 'PUT',
          body: { is_available: isAvailable },
        })
        await this.fetchMerchantMenu()
        return res
      } catch (error) {
        console.error('Failed to toggle menu availability:', error)
        throw error
      }
    },
  },
})
