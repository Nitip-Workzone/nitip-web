export const ROLE_REQUESTER = 'requester'
export const ROLE_RUNNER = 'runner'
export const ROLE_ADMIN = 'admin'
export const ROLE_MERCHANT = 'merchant'

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PURCHASING: 'purchasing',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const
