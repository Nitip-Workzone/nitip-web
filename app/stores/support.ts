import { defineStore } from 'pinia'

export interface SupportTicket {
  id: string
  user_id: string
  order_id?: string
  category: string
  title: string
  description: string
  status: string
  priority: number
  assigned_cs_id?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  closed_at?: string
  user_name?: string
  user_email?: string
  user_whatsapp?: string
  assigned_cs_name?: string
  assigned_cs_whatsapp?: string
}

export interface SupportMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_role: string
  message: string
  is_internal: boolean
  created_at: string
  sender_name?: string
}

export interface SupportFAQ {
  id: string
  category: string
  question: string
  answer: string
  keywords?: string
  is_active: boolean
  created_at: string
}

export const useSupportStore = defineStore('support', {
  state: () => ({
    myTickets: [] as SupportTicket[],
    queueTickets: [] as SupportTicket[],
    allTickets: [] as SupportTicket[],
    queueTotal: 0,
    allTotal: 0,
    currentTicket: null as SupportTicket | null,
    messages: [] as SupportMessage[],
    faqs: [] as SupportFAQ[],
    activeCsTicket: null as SupportTicket | null,
    loading: false,
    messagesLoading: false,
    actionLoading: false,
  }),

  actions: {
    async fetchMyTickets() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: SupportTicket[] }>('/support/tickets?limit=50')
        if (res.data) this.myTickets = res.data
      } catch (e) {
        console.error('Failed fetch my tickets', e)
      } finally {
        this.loading = false
      }
    },

    async fetchQueue() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: { tickets: SupportTicket[], total: number } }>('/cs/support/queue?limit=50')
        if (res.data) {
          // backend returns {tickets, total} inside data
          const data = res.data as { tickets?: SupportTicket[]; total?: number }
          if (data.tickets) {
            this.queueTickets = data.tickets
            this.queueTotal = data.total || data.tickets.length
          } else if (Array.isArray(res.data)) {
            // fallback if direct
            this.queueTickets = res.data as unknown as SupportTicket[]
            this.queueTotal = this.queueTickets.length
          }
        }
      } catch (e) {
        console.error('Failed fetch queue', e)
      } finally {
        this.loading = false
      }
    },

    async fetchAllTickets(status = '', category = '', search = '') {
      this.loading = true
      const { request } = useApi()
      try {
        const params = new URLSearchParams()
        if (status) params.set('status', status)
        if (category) params.set('category', category)
        if (search) params.set('search', search)
        params.set('limit', '50')
        const res = await request<{ data: { tickets: SupportTicket[], total: number } }>(`/cs/support/tickets?${params.toString()}`)
        const data = res.data as { tickets?: SupportTicket[]; total?: number }
        if (data?.tickets) {
          this.allTickets = data.tickets
          this.allTotal = data.total || 0
        } else if (Array.isArray(res.data)) {
          this.allTickets = res.data as unknown as SupportTicket[]
        }
      } catch (e) {
        console.error('Failed fetch all tickets', e)
      } finally {
        this.loading = false
      }
    },

    async fetchMyActiveCsTicket() {
      const { request } = useApi()
      try {
        const res = await request<{ data: SupportTicket | null }>('/cs/support/tickets/my-active')
        this.activeCsTicket = res.data || null
        return res.data
      } catch {
        this.activeCsTicket = null
        return null
      }
    },

    async fetchTicketDetail(id: string, isAdmin = false) {
      this.loading = true
      const { request } = useApi()
      try {
        const endpoint = isAdmin ? `/cs/support/tickets/${id}` : `/support/tickets/${id}`
        const res = await request<{ data: SupportTicket }>(endpoint)
        if (res.data) this.currentTicket = res.data
        return res.data
      } catch (e) {
        console.error('Failed fetch ticket detail', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchMessages(id: string, isAdmin = false, afterId?: string) {
      this.messagesLoading = true
      const { request } = useApi()
      try {
        const params = new URLSearchParams()
        if (afterId) params.set('after_id', afterId)
        params.set('limit', '100')
        const endpoint = isAdmin ? `/cs/support/tickets/${id}/messages?${params.toString()}` : `/support/tickets/${id}/messages?${params.toString()}`
        const res = await request<{ data: SupportMessage[] }>(endpoint)
        if (res.data) {
          if (afterId) {
            // append only new
            const newMsgs = res.data.filter(m => !this.messages.some(existing => existing.id === m.id))
            if (newMsgs.length > 0) {
              this.messages = [...this.messages, ...newMsgs]
              
              // Play iconic sound for incoming chat messages
              const hasIncoming = newMsgs.some(m => {
                if (isAdmin) {
                  return m.sender_role === 'user'
                } else {
                  return m.sender_role === 'cs' || m.sender_role === 'admin'
                }
              })
              if (hasIncoming && typeof window !== 'undefined') {
                const audio = new Audio('/sounds/nitip_chime.wav')
                audio.play().catch(() => {})
              }
            }
          } else {
            this.messages = res.data
          }
        }
        return res.data
      } catch (e) {
        console.error('Failed fetch messages', e)
        throw e
      } finally {
        this.messagesLoading = false
      }
    },

    async sendMessage(id: string, message: string, isAdmin = false, isInternal = false) {
      const { request } = useApi()
      try {
        const endpoint = isAdmin ? `/cs/support/tickets/${id}/messages` : `/support/tickets/${id}/messages`
        const res = await request<{ data: SupportMessage }>(endpoint, {
          method: 'POST',
          body: { message, is_internal: isInternal },
        })
        if (res.data) {
          this.messages.push(res.data)
        }
        return res.data
      } catch (e) {
        console.error('Failed send message', e)
        throw e
      }
    },

    async createTicket(payload: { title: string, description: string, category: string, order_id?: string, priority?: number }) {
      const { request } = useApi()
      try {
        const res = await request<{ data: SupportTicket }>('/support/tickets', {
          method: 'POST',
          body: payload,
        })
        await this.fetchMyTickets()
        return res.data
      } catch (e) {
        console.error('Failed create ticket', e)
        throw e
      }
    },

    async claimTicket(id: string) {
      this.actionLoading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: SupportTicket }>(`/cs/support/tickets/${id}/claim`, { method: 'POST' })
        await this.fetchMyActiveCsTicket()
        await this.fetchQueue()
        return res.data
      } catch (e) {
        console.error('Failed claim ticket', e)
        throw e
      } finally {
        this.actionLoading = false
      }
    },

    async releaseTicket(id: string) {
      const { request } = useApi()
      try {
        const res = await request<{ data: SupportTicket }>(`/cs/support/tickets/${id}/release`, { method: 'POST' })
        await this.fetchMyActiveCsTicket()
        await this.fetchQueue()
        return res.data
      } catch (e) {
        console.error('Failed release ticket', e)
        throw e
      }
    },

    async resolveTicket(id: string) {
      const { request } = useApi()
      try {
        const res = await request<{ data: SupportTicket }>(`/cs/support/tickets/${id}/resolve`, { method: 'POST' })
        await this.fetchMyActiveCsTicket()
        return res.data
      } catch (e) {
        console.error('Failed resolve ticket', e)
        throw e
      }
    },

    async closeTicket(id: string, isAdmin = false) {
      const { request } = useApi()
      try {
        const endpoint = isAdmin ? `/cs/support/tickets/${id}/close` : `/support/tickets/${id}/close`
        const res = await request<{ data: SupportTicket }>(endpoint, { method: 'POST' })
        return res.data
      } catch (e) {
        console.error('Failed close ticket', e)
        throw e
      }
    },

    async searchFaq(q: string, category = '') {
      const { request } = useApi()
      try {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (category) params.set('category', category)
        const res = await request<{ data: SupportFAQ[] }>(`/support/faq/search?${params.toString()}`)
        if (res.data) this.faqs = res.data
        return res.data
      } catch (e) {
        console.error('Failed search faq', e)
        return []
      }
    },

    async fetchFaqs(activeOnly = true) {
      const { request } = useApi()
      try {
        const endpoint = activeOnly ? '/support/faq' : '/admin/support/faq'
        const res = await request<{ data: SupportFAQ[] }>(endpoint)
        if (res.data) this.faqs = res.data
        return res.data
      } catch (e) {
        console.error('Failed fetch faqs', e)
        return []
      }
    },
  },
})
