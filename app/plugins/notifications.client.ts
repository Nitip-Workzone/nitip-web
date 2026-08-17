/**
 * Opsi A - BE only FCM dispatcher
 * Frontend tidak perlu Firebase config tambahan, hanya minta izin browser Notification API
 * untuk menampilkan notifikasi lokal jika tab hidden & ada order update via SSE/Realtime
 * Config BE: FCM_ENABLED=true + firebase-credentials.json saja
 * Free tier safety: tidak menambah beban, frontend hanya permission prompt sekali
 */
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return

  // Request permission setelah 3 detik interaksi untuk menghindari blocked auto prompt
  let asked = false
  const requestPermission = async () => {
    if (asked) return
    asked = true
    try {
      if (Notification.permission === 'default') {
        // Tunggu user click atau navigasi pertama agar dianggap gesture
        // Di sini kita langsung request dengan delay agar tidak mengganggu UX awal
        const perm = await Notification.requestPermission()
        console.log('[notifications] permission:', perm)
      }
    } catch (e) {
      console.warn('[notifications] permission error', e)
    }
  }

  // Trigger setelah user interaction atau setelah 3s idle
  if (Notification.permission === 'default') {
    const timer = setTimeout(requestPermission, 3000)
    const onInteraction = () => {
      clearTimeout(timer)
      requestPermission()
      window.removeEventListener('click', onInteraction)
      window.removeEventListener('keydown', onInteraction)
    }
    window.addEventListener('click', onInteraction, { once: true })
    window.addEventListener('keydown', onInteraction, { once: true })
  }

  // Helper global untuk menampilkan notifikasi lokal jika document hidden
  // Dipakai oleh realtime/order store untuk order_completed, reassign, dll
  const showLocalNotification = (title: string, body: string, data?: Record<string, string>) => {
    if (Notification.permission !== 'granted') return
    if (!document.hidden) return // hanya push jika tab tidak aktif agar tidak spam
    try {
      new Notification(title, {
        body,
        icon: '/favicon.png',
        data,
      })
    } catch {}
  }

  return {
    provide: {
      notifications: {
        requestPermission,
        showLocalNotification,
        isSupported: () => 'Notification' in window,
        permission: () => Notification.permission,
      },
    },
  }
})
