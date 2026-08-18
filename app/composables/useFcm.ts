// useFcm — central FCM handler for web, replaces all interval polling
// Mechanism: BE dispatcher per-device bucket 20/10m refill 3m delay + collapse_id prevents limit hit
// Replaces: notifications 15s, orders active 10s, QRIS 5s, merchant fallback 30s, CS queue 10s
// SSE useMerchantPoolStream remains primary, FCM backup + hidden tab

export interface FcmPayload {
  type?: string
  order_id?: string
  orderId?: string
  reference?: string
  status?: string
  amount?: string
  title?: string
  body?: string
  [key: string]: any
}

let fcmInitialized = false
let messagingInstance: any = null
let unsubMessage: (() => void) | null = null

export function useFcm() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const isSupported = () => {
    if (typeof window === 'undefined') return false
    // Disable inside NitipMerchant WebView — handled natively by Flutter FCM
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('NitipMerchant')) return false
    return true
  }

  const getFirebaseConfig = () => {
    const pub = config.public as any
    // Allow empty — will fallback to firebase-credentials.json BE only if needed
    // But for web client we need at least projectId
    if (!pub.firebaseProjectId) return null
    return {
      apiKey: pub.firebaseApiKey,
      authDomain: pub.firebaseAuthDomain,
      projectId: pub.firebaseProjectId,
      storageBucket: pub.firebaseStorageBucket,
      messagingSenderId: pub.firebaseMessagingSenderId,
      appId: pub.firebaseAppId,
    }
  }

  const emitFcmEvent = (payload: FcmPayload) => {
    if (typeof window === 'undefined') return
    try {
      const ev = new CustomEvent('nitip:fcm-notification', { detail: payload })
      window.dispatchEvent(ev)
      console.log('[FCM] Dispatched nitip:fcm-notification', payload)
    } catch {}
  }

  const init = async () => {
    if (!isSupported()) return
    if (fcmInitialized) return
    const fbConfig = getFirebaseConfig()
    // If no firebase config in FE, skip client init — BE dispatcher still works via service worker? We need firebase JS for getToken
    // If config missing, we still allow event listening via custom event from SW
    if (!fbConfig || !fbConfig.apiKey) {
      console.log('[FCM] No Firebase config in FE env, skipping client init — BE FCM still works, SW may handle background')
      // Still register listener for custom event from manual testing or SW via postMessage?
      registerServiceWorkerListener()
      fcmInitialized = true
      return
    }

    try {
      const { initializeApp, getApps } = await import('firebase/app')
      const { getMessaging, getToken, onMessage, isSupported: isMessagingSupported } = await import('firebase/messaging')

      const supported = await isMessagingSupported().catch(() => false)
      if (!supported) {
        console.warn('[FCM] Messaging not supported in this browser')
        return
      }

      const app = getApps().length === 0 ? initializeApp(fbConfig) : getApps()[0]
      const messaging = getMessaging(app)
      messagingInstance = messaging

      // Request permission via existing notifications.client plugin logic already does after 3s
      // Here we ensure token
      const vapidKey = (config.public as any).firebaseVapidKey
      if (!vapidKey) {
        console.warn('[FCM] No VAPID key set NUXT_PUBLIC_FIREBASE_VAPID_KEY, getToken may fail')
      }

      // Register SW listener for background messages forwarded via postMessage
      registerServiceWorkerListener()

      // Foreground onMessage
      const unsub = onMessage(messaging, (payload: any) => {
        console.log('[FCM] Foreground message', payload)
        const data = payload.data || {}
        const notification = payload.notification || {}
        const fcmPayload: FcmPayload = {
          type: data.type || notification?.type || 'unknown',
          order_id: data.order_id || data.orderId,
          orderId: data.order_id || data.orderId,
          reference: data.reference,
          status: data.status,
          amount: data.amount,
          title: notification.title || data.title,
          body: notification.body || data.body,
          ...data,
        }

        // Show local notification if tab hidden and permission granted (fallback if SW didn't)
        if (typeof document !== 'undefined' && document.hidden && Notification.permission === 'granted') {
          try {
            new Notification(fcmPayload.title || 'Nihtip', { body: fcmPayload.body || 'Ada pembaruan', icon: '/favicon.png' })
          } catch {}
        }

        // Emit to app stores via custom event — replaces polling
        emitFcmEvent(fcmPayload)

        // Special handling
        if (fcmPayload.type === 'payment_confirmed' || fcmPayload.type === 'transaction_status' || fcmPayload.type === 'wallet_update') {
          // Will be handled by notifications store + top_up sheet via event
        }
      })

      unsubMessage = () => unsub()

      // Get token and save to backend
      try {
        const token = await getToken(messaging, { vapidKey: vapidKey || undefined })
        if (token) {
          console.log('[FCM] Token obtained')
          await saveToken(token)
        }
      } catch (e) {
        console.warn('[FCM] getToken failed', e)
      }

      fcmInitialized = true
    } catch (e) {
      console.warn('[FCM] init failed', e)
    }
  }

  const registerServiceWorkerListener = () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    // Listen message from firebase-messaging-sw.js via postMessage or BroadcastChannel
    navigator.serviceWorker.addEventListener('message', (event: any) => {
      const data = event.data || {}
      if (data.type && data.type.includes('fcm') || data.type?.startsWith('order_') || data.type?.startsWith('merchant_') || data.type === 'payment_confirmed') {
        emitFcmEvent(data)
      } else if (data.data) {
        emitFcmEvent(data.data)
      } else if (data.firebaseMessage) {
        const d = data.firebaseMessage.data || {}
        emitFcmEvent(d)
      }
    })
  }

  const saveToken = async (token: string) => {
    if (!token) return
    try {
      const { request } = useApi()
      await request('/users/fcm-token', { method: 'PUT', body: { fcm_token: token } })
      console.log('[FCM] Token saved to backend')
    } catch (e) {
      console.warn('[FCM] Failed to save token', e)
    }
  }

  const start = async () => {
    if (!isSupported()) {
      console.log('[FCM] Not supported or inside WebView, skip')
      return
    }
    await init()
    console.log('[FCM] Started — polling removed, using FCM antrian per-device bucket 20/10m')
  }

  const stop = () => {
    if (unsubMessage) {
      try { unsubMessage() } catch {}
      unsubMessage = null
    }
    fcmInitialized = false
    console.log('[FCM] Stopped')
  }

  return { init, start, stop, emitFcmEvent, isSupported }
}
