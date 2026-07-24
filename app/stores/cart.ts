import { defineStore } from 'pinia'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  notes: string
  image_url: string
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    merchantId: null as string | null,
    merchantName: null as string | null,
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
    },
  },
})
