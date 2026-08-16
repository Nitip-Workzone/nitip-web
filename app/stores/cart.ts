import { defineStore } from 'pinia'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  notes: string
  image_url: string
}

export interface AppliedPromotion {
  id: string
  code?: string | null
  title: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  discount_amount: number
  first_purchase_only?: boolean
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    merchantId: null as string | null,
    merchantName: null as string | null,
    appliedPromotion: null as AppliedPromotion | null,
    promotionCodeInput: '' as string,
  }),

  getters: {
    totalItems(): number {
      return this.items.reduce((sum, item) => sum + item.quantity, 0)
    },
    subtotal(): number {
      return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    },
    deliveryFeeSurcharge(): number {
      const count = this.totalItems
      return count > 1 ? (count - 1) * 2000 : 0
    },
    discountTotal(): number {
      return this.appliedPromotion?.discount_amount ?? 0
    },
    totalAfterDiscount(): number {
      return Math.max(0, this.subtotal + this.deliveryFeeSurcharge - this.discountTotal)
    },
  },

  actions: {
    addToCart(item: Omit<CartItem, 'quantity' | 'notes'>, merchant: { id: string; name: string }) {
      // Single merchant constraint validation
      if (this.merchantId && this.merchantId !== merchant.id) {
        throw new Error('DIFFERENT_MERCHANT')
      }

      this.merchantId = merchant.id
      this.merchantName = merchant.name

      const existing = this.items.find(i => i.id === item.id)
      if (existing) {
        if (this.totalItems >= 10) {
          throw new Error('MAX_ITEMS_LIMIT')
        }
        existing.quantity++
      } else {
        if (this.totalItems >= 10) {
          throw new Error('MAX_ITEMS_LIMIT')
        }
        this.items.push({
          ...item,
          quantity: 1,
          notes: '',
        })
      }
    },

    updateQuantity(itemId: string, qty: number) {
      const item = this.items.find(i => i.id === itemId)
      if (!item) return

      const currentTotalWithoutItem = this.totalItems - item.quantity
      if (currentTotalWithoutItem + qty > 10) {
        throw new Error('MAX_ITEMS_LIMIT')
      }

      item.quantity = qty
      if (item.quantity <= 0) {
        this.removeFromCart(itemId)
      }
    },

    updateNotes(itemId: string, notes: string) {
      const item = this.items.find(i => i.id === itemId)
      if (item) {
        item.notes = notes
      }
    },

    removeFromCart(itemId: string) {
      this.items = this.items.filter(i => i.id !== itemId)
      if (this.items.length === 0) {
        this.clearCart()
      }
    },

    clearCart() {
      this.items = []
      this.merchantId = null
      this.merchantName = null
      this.appliedPromotion = null
      this.promotionCodeInput = ''
    },

    async applyPromotion(code: string, merchantId: string | null, deliveryTotal = 0) {
      // Prioritas Food only: voucher hanya jika merchant_id ada (terafiliasi merchant)
      if (!merchantId) {
        throw new Error('Voucher hanya berlaku untuk Nitip Food (terafiliasi merchant), tidak bisa untuk Nitip Beli/Kirim')
      }
      const { request } = useApi()
      try {
        const payload = {
          code: code?.trim() || undefined,
          merchant_id: merchantId,
          item_total: this.subtotal,
          delivery_total: deliveryTotal,
          total: this.subtotal + this.deliveryFeeSurcharge + deliveryTotal,
        }
        const res = await request<{ data: { discount_amount: number; promotion: { id: string; code?: string | null; title: string; discount_type: 'flat' | 'percent'; discount_value: number; first_purchase_only?: boolean }; valid: boolean; message?: string } }>('/promotions/validate', {
          method: 'POST',
          body: payload,
        })
        if (res.data && res.data.discount_amount > 0 && res.data.promotion) {
          const p = res.data.promotion
          this.appliedPromotion = {
            id: p.id,
            code: p.code,
            title: p.title,
            discount_type: p.discount_type,
            discount_value: p.discount_value,
            discount_amount: res.data.discount_amount,
            first_purchase_only: p.first_purchase_only,
          }
          return this.appliedPromotion
        }
        throw new Error(res.data?.message || 'Voucher tidak valid')
      } catch (e: unknown) {
        console.error('Failed to apply promotion', e)
        this.appliedPromotion = null
        throw e
      }
    },

    removePromotion() {
      this.appliedPromotion = null
      this.promotionCodeInput = ''
    },

    setPromotionCodeInput(code: string) {
      this.promotionCodeInput = code
    },
  },
})
