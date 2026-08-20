// firebase-messaging-sw.js — Service Worker for background FCM, replaces polling with push
// PWA disabled but this SW is separate lightweight, does NOT cache pages, only handles FCM background messages
// Mechanism: BE dispatcher per-device bucket 20/10m + collapse_id prevents limit hit, safe to maximize FCM

// Import Firebase compat scripts for SW (compat required in SW)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

// Firebase config will be injected via fetch from /api/config? Or hardcoded placeholder — we try to get from query? For now use empty and rely on BE to send notification payload with collapse
// The service worker can work without config if BE sends notification directly? Actually need initializeApp
// We attempt to initialize with default project nihtip-f5178 — values from firebase-credentials.json BE side should match

// Firebase config — should be replaced with real values via NUXT_PUBLIC_FIREBASE_* envs
// Placeholder works for BE notification payload (title/body carried), but getToken in FE needs real config
// To get real config: Firebase Console > Project Settings > General > Your apps > SDK setup > Config
// For production build, Nuxt will inject firebase config via /_nuxt/firebase-messaging-sw.js? Or env replacement at build time
// Current placeholder ensures SW installs even without env, BE dispatcher still sends notification with collapse_id order_{id}
let firebaseConfig
try {
  // Try load from self config if injected by build (optional)
  firebaseConfig = {
    apiKey: "AIzaSy_placeholder",
    authDomain: "nihtip-f5178.firebaseapp.com",
    projectId: "nihtip-f5178",
    storageBucket: "nihtip-f5178.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
  }
  // Allow override via query param ?apiKey=... for debugging
  const urlParams = new URLSearchParams(self.location.search)
  if (urlParams.get('apiKey')) {
    firebaseConfig.apiKey = urlParams.get('apiKey')
    firebaseConfig.messagingSenderId = urlParams.get('messagingSenderId') || firebaseConfig.messagingSenderId
    firebaseConfig.appId = urlParams.get('appId') || firebaseConfig.appId
    firebaseConfig.projectId = urlParams.get('projectId') || firebaseConfig.projectId
    firebaseConfig.authDomain = urlParams.get('authDomain') || firebaseConfig.authDomain
    firebaseConfig.storageBucket = urlParams.get('storageBucket') || firebaseConfig.storageBucket
  }
  firebase.initializeApp(firebaseConfig)
  console.log('[SW][FCM] Firebase initialized with project', firebaseConfig.projectId)
} catch (e) {
  console.log('[SW][FCM] init fallback', e)
}
// NOTE: Set NUXT_PUBLIC_FIREBASE_* in .env for real web push token. Placeholder works for BE notification-only push.

let messaging
try {
  messaging = firebase.messaging()
} catch (e) {
  console.warn('[SW][FCM] messaging not available', e)
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW][FCM] Background message', payload)
    const data = payload.data || {}
    const notification = payload.notification || {}

    const title = notification.title || data.title || 'Nihtip'
    const body = notification.body || data.body || data.message || 'Ada pembaruan pesanan'
    const type = data.type || 'unknown'
    const orderId = data.order_id || data.orderId

    // Show notification with collapse to prevent spam (per-device 20 burst)
    const options = {
      body: body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: data.collapse_id || `order_${orderId || type}`, // collapse similar to BE collapse_id order_{id}
      data: data,
      renotify: false
    }

    // Forward to all clients via postMessage for foreground handling when tab hidden -> becomes visible
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'fcm-background',
          data: data,
          notification: notification
        })
      })
    })

    return self.registration.showNotification(title, options)
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const orderId = data.order_id || data.orderId
  let url = '/'
  if (data.url) {
    url = data.url
  } else if (data.click_action) {
    url = data.click_action
  } else if (orderId) {
    url = `/orders/${orderId}`
  } else if (data.type === 'merchant_order') {
    url = '/merchant/orders'
  } else if (data.type && data.type.startsWith('support')) {
    url = '/admin/support'
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})
