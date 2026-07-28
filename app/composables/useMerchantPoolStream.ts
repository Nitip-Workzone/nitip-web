/**
 * useMerchantPoolStream — lightweight SSE for merchant order pool
 * Best practice anti-beban:
 * - 1 EventSource only, auto close when tab hidden (visibilitychange)
 * - Exponential backoff + jitter max 30s (no spam reconnect)
 * - Single AudioContext reused (not create per event)
 * - Fallback polling only when disconnected
 * - Cleanup on unmount: close ES + clear timers + close AudioContext
 */

export interface MerchantPoolEvent {
  type: 'order_created' | 'order_claimed' | 'order_cancelled' | 'order_ready' | 'connected' | 'heartbeat' | string
  order_id?: string
  ts: number
  cell_key?: string
  data?: any
}

interface UseMerchantPoolStreamOpts {
  onOrderCreated?: (ev: MerchantPoolEvent) => void
  onOrderRemoved?: (ev: MerchantPoolEvent) => void
  onConnected?: () => void
  onError?: () => void
}

export function useMerchantPoolStream(opts: UseMerchantPoolStreamOpts = {}) {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const rawApiUrl = (config.public.nitipApiUrl as string || '').replace(/\/$/, '')
  const baseURL = rawApiUrl
    ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
    : '/api/v1'

  let es: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  const isLive = ref(false)

  // Reuse single AudioContext for beep (memory + autoplay friendly)
  let audioCtx: AudioContext | null = null
  const getAudio = (): AudioContext | null => {
    if (audioCtx) return audioCtx
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      audioCtx = new AC()
      return audioCtx
    } catch {
      return null
    }
  }

  const beep = () => {
    try {
      const ctx = getAudio()
      if (!ctx) return
      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch (e) {
      // silent
    }
  }

  const parseEvent = (e: MessageEvent): MerchantPoolEvent | null => {
    try {
      const parsed = JSON.parse(e.data) as MerchantPoolEvent
      return parsed
    } catch {
      return null
    }
  }

  const connect = () => {
    // Don't connect if tab hidden or no token
    if (typeof document !== 'undefined' && document.hidden) return
    if (!authStore.token) return

    // Close old
    if (es) {
      try { es.close() } catch {}
      es = null
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    const url = `${baseURL}/orders/merchant/stream?token=${encodeURIComponent(authStore.token)}`

    try {
      es = new EventSource(url)

      es.onopen = () => {
        isLive.value = true
        attempt = 0
        opts.onConnected?.()
      }

      es.onerror = () => {
        isLive.value = false
        try { es?.close() } catch {}
        es = null
        opts.onError?.()
        // Exponential backoff with jitter
        const jitter = Math.random() * 500
        const backoff = Math.min(1000 * Math.pow(2, attempt) + jitter, 30000)
        attempt += 1
        reconnectTimer = setTimeout(() => {
          connect()
        }, backoff)
      }

      const handleMessage = (e: MessageEvent) => {
        const ev = parseEvent(e)
        if (!ev) return
        // Ignore heartbeat/connected for business logic
        if (ev.type === 'heartbeat' || ev.type === 'connected') return

        if (ev.type === 'order_created' || ev.type === 'order_ready') {
          beep()
          opts.onOrderCreated?.(ev)
        } else if (ev.type === 'order_claimed' || ev.type === 'order_cancelled' || ev.type === 'order_expired' || ev.type === 'order_completed') {
          opts.onOrderRemoved?.(ev)
        }
      }

      // Listen both generic message and typed events (our backend writes event: <type> + data: JSON)
      es.onmessage = handleMessage
      es.addEventListener('order_created', handleMessage as any)
      es.addEventListener('order_ready', handleMessage as any)
      es.addEventListener('order_claimed', handleMessage as any)
      es.addEventListener('order_cancelled', handleMessage as any)
      es.addEventListener('order_expired', handleMessage as any)
      es.addEventListener('order_completed', handleMessage as any)

    } catch (err) {
      isLive.value = false
      const backoff = Math.min(1000 * Math.pow(2, attempt) + Math.random()*500, 30000)
      attempt += 1
      reconnectTimer = setTimeout(connect, backoff)
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (es) {
      try { es.close() } catch {}
      es = null
    }
    isLive.value = false
  }

  const handleVisibility = () => {
    if (typeof document === 'undefined') return
    if (document.hidden) {
      // Pause SSE when tab not visible - save battery & CPU
      if (es) {
        try { es.close() } catch {}
        es = null
      }
      isLive.value = false
    } else {
      // Resume when tab visible again
      connect()
    }
  }

  // Auto bind visibility if in client
  if (import.meta.client) {
    onMounted(() => {
      document.addEventListener('visibilitychange', handleVisibility)
    })
    onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibility)
      disconnect()
      if (audioCtx) {
        try { audioCtx.close() } catch {}
        audioCtx = null
      }
    })
  }

  return { connect, disconnect, isLive, beep }
}
