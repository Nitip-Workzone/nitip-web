import { defineStore } from 'pinia'

export interface KycSubmission {
  id: string
  user_id: string
  id_card_number: string
  id_card_image_url: string
  selfie_image_url: string
  status: string // 'pending' | 'approved' | 'rejected'
  admin_note?: string
  created_at: string
  updated_at: string
}

export const useKycStore = defineStore('kyc', {
  state: () => ({
    submissions: [] as KycSubmission[],
    loading: false,
    actionLoading: false,
  }),

  actions: {
    async fetchPendingKyc() {
      this.loading = true
      const { request } = useApi()
      try {
        const res = await request<{ data: KycSubmission[] }>('/admin/kyc/pending')
        if (res.data) {
          this.submissions = res.data
        }
      } catch (error) {
        console.error('Failed to fetch pending KYC:', error)
      } finally {
        this.loading = false
      }
    },

    async reviewKyc(id: string, approved: boolean, note: string = '') {
      this.actionLoading = true
      const { request } = useApi()
      try {
        await request(`/admin/kyc/${id}/review`, {
          method: 'POST',
          body: { approved, note },
        })
        // Remove from pending list
        this.submissions = this.submissions.filter((s) => s.id !== id)
        return true
      } catch (error) {
        console.error(`Failed to review KYC submission ${id}:`, error)
        return false
      } finally {
        this.actionLoading = false
      }
    },
  },
})
