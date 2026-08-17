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
  image_url?: string
  cover_url?: string
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

export interface ActivePromotion {
  id: string
  code?: string | null
  title: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  budget_remaining: number
  max_uses: number
  used_count: number
  first_purchase_only: boolean
  merchant_id?: string | null
}

export const useMerchantsStore = defineStore('merchants', {
  state: () => ({
    merchants: [] as Merchant[],
    adminMerchants: [] as Merchant[],
    currentMerchant: null as Merchant | null,
    merchantMenus: [] as Menu[],
    merchantOrders: [] as Array<Record<string, unknown> & { id?: string; status?: string }>,
    activePromotions: {} as Record<string, ActivePromotion | null>,
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
        const res = await request<{ data: Menu[] }>(`/merchants/${merchantId}/menu?with_variants=true`)
        if (res.data) {
          this.merchantMenus = res.data as any
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

    async updateMerchantProfile(payload: {
      name: string
      description?: string
      address: string
      latitude: number
      longitude: number
      category: string
    }) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Merchant }>('/merchant/profile', {
          method: 'PUT',
          body: payload,
        })
        if (res.data) {
          this.currentMerchant = res.data
        }
        return res.data
      } catch (error) {
        console.error('Failed to update merchant profile:', error)
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
        const res = await request<{ data: Array<Record<string, unknown>> }>('/orders/merchant/orders')
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

    async fetchActivePromotion(merchantId: string) {
      const { request } = useApi()
      try {
        const res = await request<{ data: ActivePromotion[] }>(`/promotions/active?merchant_id=${merchantId}`)
        if (res.data && res.data.length > 0) {
          // prefer auto or first
          this.activePromotions[merchantId] = res.data[0]
          return res.data[0]
        } else {
          this.activePromotions[merchantId] = null
          return null
        }
      } catch {
        this.activePromotions[merchantId] = null
        return null
      }
    },

    async fetchOwnerPromotions() {
      const { request } = useApi()
      try {
        const res = await request<{ data: ActivePromotion[] }>('/merchant/promotions')
        return res.data || []
      } catch {
        return []
      }
    },

    async fetchOwnerSettlement(merchantId?: string) {
      const { request } = useApi()
      try {
        const q = merchantId ? `?merchant_id=${merchantId}` : ''
        const res = await request<{ data: { total_liability: number; total_orders: number; items: Array<{ merchant_id: string; merchant_name: string; total_liability: number; order_count: number }> } }>(`/merchant/promotions/settlement${q}`)
        return res.data
      } catch {
        return null
      }
    },

    async fetchActivePromotionsBatch(merchantIds: string[]) {
      for (const id of merchantIds.slice(0, 10)) {
        await this.fetchActivePromotion(id)
      }
    },

    // === Menu V2 - Kategori, Varian ± dengan image, Topping dengan image ===
    async fetchCategories() {
      const { request } = useApi()
      try {
        const res = await request<{ data: Array<{ id: string; name: string; image_url?: string; sort_order: number; is_active: boolean }> }>('/merchant/categories')
        return res.data || []
      } catch { return [] }
    },
    async createCategory(payload: { name: string; image_url?: string; sort_order?: number }) {
      const { request } = useApi()
      const res = await request<{ data: { id: string; name: string } }>('/merchant/categories', { method: 'POST', body: payload })
      return res.data
    },
    async updateCategory(id: string, payload: { name: string; image_url?: string; sort_order?: number; is_active?: boolean }) {
      const { request } = useApi()
      const res = await request<{ data: { id: string } }>(`/merchant/categories/${id}`, { method: 'PUT', body: payload })
      return res.data
    },
    async deleteCategory(id: string) {
      const { request } = useApi()
      await request(`/merchant/categories/${id}`, { method: 'DELETE' })
    },

    async fetchMenuWithVariants(onlyAvailable = false) {
      const { request } = useApi()
      this.loading = true
      try {
        const q = onlyAvailable ? '?only_available=true&with_variants=true' : '?with_variants=true'
        const res = await request<{ data: Menu[] }>(`/merchant/menu${q}`)
        if (res.data) this.merchantMenus = res.data as unknown as Menu[]
        return res.data
      } catch (e) { console.error(e); return [] } finally { this.loading = false }
    },

    async fetchVariantGroups(menuId: string) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Array<Record<string, unknown>> }>(`/merchant/menu/${menuId}/variants`)
        return res.data || []
      } catch { return [] }
    },
    async createVariantGroup(menuId: string, payload: { name: string; type: string; is_required?: boolean; min_select?: number; max_select?: number | null; sort_order?: number }) {
      const { request } = useApi()
      const res = await request<{ data: { id: string } }>(`/merchant/menu/${menuId}/variants`, { method: 'POST', body: payload })
      return res.data
    },
    async createVariantOption(groupId: string, payload: { label: string; price_delta?: number; image_url?: string; is_default?: boolean; is_available?: boolean; sort_order?: number }) {
      const { request } = useApi()
      const res = await request<{ data: { id: string } }>(`/merchant/menu/variants/${groupId}/options`, { method: 'POST', body: payload })
      return res.data
    },
    async deleteVariantGroup(id: string) {
      const { request } = useApi()
      await request(`/merchant/menu/variants/${id}`, { method: 'DELETE' })
    },
    async deleteVariantOption(id: string) {
      const { request } = useApi()
      await request(`/merchant/menu/variants/options/${id}`, { method: 'DELETE' })
    },

    async fetchToppingGroups(menuId: string) {
      const { request } = useApi()
      try {
        const res = await request<{ data: Array<Record<string, unknown>> }>(`/merchant/menu/${menuId}/toppings`)
        return res.data || []
      } catch { return [] }
    },
    async createToppingGroup(menuId: string, payload: { name: string; type: string; variant_option_id?: string | null; is_required?: boolean; min_select?: number; max_select?: number | null; sort_order?: number }) {
      const { request } = useApi()
      const res = await request<{ data: { id: string } }>(`/merchant/menu/${menuId}/toppings`, { method: 'POST', body: payload })
      return res.data
    },
    async createToppingOption(groupId: string, payload: { label: string; price_delta?: number; image_url?: string; is_available?: boolean; sort_order?: number }) {
      const { request } = useApi()
      // Fix: endpoint yang benar adalah /merchant/menu/toppings/:groupId/options atau /merchant/menu/addons/:groupId/options
      // Bug sebelumnya salah pakai /merchant/menu/:groupId/options -> 404 Cannot POST /merchant/menu/{id}/options
      try {
        const res = await request<{ data: { id: string } }>(`/merchant/menu/toppings/${groupId}/options`, { method: 'POST', body: payload })
        return res.data
      } catch {
        // fallback alias baru bahasa Indonesia: Tambahan
        const res2 = await request<{ data: { id: string } }>(`/merchant/menu/addons/${groupId}/options`, { method: 'POST', body: payload })
        return res2.data
      }
    },
    async deleteToppingGroup(id: string) {
      const { request } = useApi()
      await request(`/merchant/menu/toppings/${id}`, { method: 'DELETE' })
    },
    async deleteToppingOption(id: string) {
      const { request } = useApi()
      await request(`/merchant/menu/toppings/options/${id}`, { method: 'DELETE' })
    },
  },
})
