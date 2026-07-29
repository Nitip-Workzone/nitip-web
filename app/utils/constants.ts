export const ROLE_REQUESTER = 'requester'
export const ROLE_RUNNER = 'runner'
export const ROLE_ADMIN = 'admin'
export const ROLE_MERCHANT = 'merchant'
export const ROLE_CS = 'cs'

export const ORDER_STATUS = {
  PENDING: 'pending',
  MERCHANT_ACCEPTED: 'merchant_accepted',
  COOKING: 'cooking',
  READY: 'ready',
  ACCEPTED: 'accepted',
  PURCHASING: 'purchasing',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  DISPUTED: 'disputed',
} as const

// Unified status flow per POV — single source of truth
export const ORDER_STATUS_FLOW = {
  // Regular (beli/kirim) non-food: pending -> accepted -> purchasing? -> delivering -> completed
  REGULAR: ['pending', 'accepted', 'purchasing', 'delivering', 'completed'] as const,
  // Food (merchant): pending -> merchant_accepted -> cooking -> ready -> delivering -> completed
  // Note: 'accepted' should NOT appear for food orders after hardening (cooking holds runner ID)
  FOOD: ['pending', 'merchant_accepted', 'cooking', 'ready', 'delivering', 'completed'] as const,
}

// Clear human labels per POV — no double meaning
export const STATUS_LABELS: Record<string, { requester: string; runner: string; merchant: string }> = {
  pending: { requester: 'Menunggu Dapur', runner: 'Menunggu', merchant: 'Masuk' },
  merchant_accepted: { requester: 'Diterima Dapur', runner: 'Diterima Dapur', merchant: 'Mencari Runner' },
  cooking: { requester: 'Sedang Dimasak', runner: 'Menuju Merchant', merchant: 'Sedang Dimasak' },
  ready: { requester: 'Siap Diambil', runner: 'Jemput Makanan', merchant: 'Siap Diambil' },
  accepted: { requester: 'Diterima Runner', runner: 'Pergi ke Toko', merchant: 'Mencari Runner (Legacy)' },
  purchasing: { requester: 'Sedang Belanja', runner: 'Belanja', merchant: 'Runner Belanja' },
  delivering: { requester: 'Sedang Diantar', runner: 'Mengantar', merchant: 'Kurir Mengantar' },
  completed: { requester: 'Selesai', runner: 'Selesai', merchant: 'Selesai' },
  cancelled: { requester: 'Dibatalkan', runner: 'Dibatalkan', merchant: 'Dibatalkan' },
  expired: { requester: 'Kadaluarsa', runner: 'Kadaluarsa', merchant: 'Kadaluarsa' },
  disputed: { requester: 'Sengketa', runner: 'Sengketa', merchant: 'Sengketa' },
}
