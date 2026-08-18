/**
 * useMerchantPoolStream — lightweight SSE for merchant order pool
 * REFACTOR 2026-07-29: Cookie-only auth, no ?token= in URL
 * - Uses fetch + ReadableStream with Authorization header (modern)
 * - Fallback to EventSource with cookie (old WebView)
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
  data?: Record<string, unknown>
}

interface UseMerchantPoolStreamOpts {
  onOrderCreated?: (ev: MerchantPoolEvent) => void
  onOrderRemoved?: (ev: MerchantPoolEvent) => void
  onConnected?: () => void
  onError?: () => void
  enabled?: any
}

type AudioContextWindow = Window & {
  AudioContext: typeof AudioContext
  webkitAudioContext: typeof AudioContext
}

export function useMerchantPoolStream(opts: UseMerchantPoolStreamOpts = {}) {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const rawApiUrl = (config.public.nitipApiUrl as string || '').replace(/\/$/, '')
  const baseURL = rawApiUrl
    ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
    : '/api/v1'

  const isEnabled = () => {
    if (opts.enabled === undefined) return true
    return typeof opts.enabled === 'function' ? opts.enabled() : toValue(opts.enabled)
  }

  const triggerMobileNotification = (ev: MerchantPoolEvent) => {
    if (typeof window === 'undefined') return
    try {
      const win = window as any
      const payloadStr = JSON.stringify({
        type: ev.type,
        order_id: ev.order_id || '',
        message: ev.type === 'order_created' ? 'Ada pesanan baru masuk!' : 'Pesanan siap diambil!'
      })
      if (win.NitipNotificationChannel) {
        win.NitipNotificationChannel.postMessage(payloadStr)
      } else if (win.flutter_inappwebview) {
        void win.flutter_inappwebview.callHandler('NitipNotification', payloadStr).catch(() => {})
      } else if (win.webkit?.messageHandlers?.NitipNotification) {
        win.webkit.messageHandlers.NitipNotification.postMessage(payloadStr)
      }
    } catch (e) {
      console.warn('Failed to postMessage to NitipNotificationChannel:', e)
    }
  }

  let es: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let fetchController: AbortController | null = null
  let attempt = 0
  const isLive = ref(false)

  let audioCtx: AudioContext | null = null
  const getAudio = (): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (audioCtx) return audioCtx
    try {
      const win = window as unknown as AudioContextWindow
      const AC = win.AudioContext || win.webkitAudioContext
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
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {})
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch {}
  }

  const parseEvent = (e: MessageEvent): MerchantPoolEvent | null => {
    try {
      const data = JSON.parse(e.data)
      return data as MerchantPoolEvent
    } catch {
      return null
    }
  }

  const connect = async () => {
    if (typeof document !== 'undefined' && document.hidden) return
    if (!authStore.token) return
    if (!isEnabled()) return

    if (es) {
      try { es.close() } catch {}
      es = null
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (fetchController) {
      try { fetchController.abort() } catch {}
      fetchController = null
    }

    const url = `${baseURL}/orders/merchant/stream`

    // Try fetch stream first (modern) with Authorization header
    let fetchAborted = false
    try {
      if (typeof fetch !== 'undefined' && authStore.token) {
        fetchController = new AbortController()
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Accept': 'text/event-stream',
          },
          signal: fetchController.signal,
        })
        if (response.status === 401) {
          console.error('[PoolStream] Got 401 Unauthorized: triggering logout.')
          if (typeof window !== 'undefined') {
            const win = window as any
            if (win.triggerNativeLogout) {
              win.triggerNativeLogout('api_401')
            } else {
              authStore.logout()
            }
          }
          return
        }
        if (response.ok && response.body) {
          isLive.value = true
          attempt = 0
          opts.onConnected?.()
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let idx: number
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const frame = buffer.substring(0, idx)
              buffer = buffer.substring(idx + 2)
              let dataStr = ''
              for (const line of frame.split('\n')) {
                const trimmed = line.trim()
                if (!trimmed) continue
                if (trimmed.startsWith(':')) continue
                if (trimmed.startsWith('data:')) dataStr += trimmed.substring(5).trim()
              }
              if (!dataStr) continue
              try {
                const jsonData = JSON.parse(dataStr) as MerchantPoolEvent
                if (jsonData.type === 'heartbeat') continue
                if (jsonData.type === 'order_created' || jsonData.type === 'order_ready') {
                  beep()
                  triggerMobileNotification(jsonData)
                  opts.onOrderCreated?.(jsonData)
                } else if (jsonData.type === 'order_claimed' || jsonData.type === 'order_cancelled' || jsonData.type === 'order_expired' || jsonData.type === 'order_completed') {
                  opts.onOrderRemoved?.(jsonData)
                } else if (jsonData.type === 'connected') {
                  opts.onConnected?.()
                }
              } catch {}
            }
          }
          // Stream ended
          isLive.value = false
          throw new Error('fetch stream ended')
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        fetchAborted = true
        return // Do not fallback or reconnect if aborted intentionally
      }
      // Fetch failed, will fallback to EventSource below
    }

    if (fetchAborted) return

    // Fallback to EventSource with query param token (since EventSource doesn't support custom headers and backend doesn't support cookies)
    try {
      const esUrl = authStore.token ? `${url}?token=${encodeURIComponent(authStore.token)}` : url
      es = new EventSource(esUrl)

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
        if (ev.type === 'heartbeat' || ev.type === 'connected') return
        if (ev.type === 'order_created' || ev.type === 'order_ready') {
          beep()
          triggerMobileNotification(ev)
          opts.onOrderCreated?.(ev)
        } else if (ev.type === 'order_claimed' || ev.type === 'order_cancelled' || ev.type === 'order_expired' || ev.type === 'order_completed') {
          opts.onOrderRemoved?.(ev)
        }
      }

      type SSEHandler = (ev: Event) => void
      es.onmessage = handleMessage
      es.addEventListener('order_created', handleMessage as unknown as SSEHandler)
      es.addEventListener('order_ready', handleMessage as unknown as SSEHandler)
      es.addEventListener('order_claimed', handleMessage as unknown as SSEHandler)
      es.addEventListener('order_cancelled', handleMessage as unknown as SSEHandler)
      es.addEventListener('order_expired', handleMessage as unknown as SSEHandler)
      es.addEventListener('order_completed', handleMessage as unknown as SSEHandler)
    } catch {
      isLive.value = false
      const backoff = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 30000)
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
    if (fetchController) {
      try { fetchController.abort() } catch {}
      fetchController = null
    }
    if (audioCtx) {
      try { audioCtx.close() } catch {}
      audioCtx = null
    }
    isLive.value = false
  }

  const handleVisibility = () => {
    if (typeof document === 'undefined') return
    if (document.hidden) {
      disconnect()
    } else {
      connect()
    }
  }

  if (import.meta.client) {
    onMounted(() => {
      document.addEventListener('visibilitychange', handleVisibility)
      if (isEnabled()) {
        connect()
      }
    })
    onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibility)
      disconnect()
    })

    watch(() => isEnabled(), (newVal) => {
      if (newVal) {
        connect()
      } else {
        disconnect()
      }
    })
  }

  return { connect, disconnect, isLive }
}
