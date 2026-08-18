<script setup lang="ts">
import { Bell, BellOff, X, Check } from '@lucide/vue'
import { ref, onMounted } from 'vue'

const show = ref(false)
const permission = ref<NotificationPermission | 'unsupported'>('default')
const isSaving = ref(false)
const isInsideWebView = ref(false)

onMounted(() => {
  if (typeof window === 'undefined') return
  const authStore = useAuthStore()
  if (authStore.user?.role === 'merchant') {
    return // Hide for merchants completely on web
  }
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('NitipMerchant')) {
    isInsideWebView.value = true
    return
  }
  if (!('Notification' in window)) {
    permission.value = 'unsupported'
    return
  }
  permission.value = Notification.permission

  // Show banner if default (not yet asked) after 5s, or if denied show how to enable (less intrusive)
  if (permission.value === 'default') {
    setTimeout(() => {
      // Only show if still default and user authenticated (checked by parent)
      if (Notification.permission === 'default') {
        show.value = true
      }
    }, 5000)
  } else if (permission.value === 'denied') {
    // Show once per session if denied — help user enable manual
    const dismissed = sessionStorage.getItem('nitip:banner-denied-dismissed')
    if (!dismissed) {
      setTimeout(() => {
        show.value = true
      }, 8000)
    }
  }
})

async function enable() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  isSaving.value = true
  try {
    // requestPermissionAndGetToken dipanggil dari klik tombol (user gesture)
    // sehingga browser mengizinkan permission prompt tampil
    const { start, requestPermissionAndGetToken } = useFcm()
    // Pastikan Firebase sudah diinisialisasi
    await start()
    // Minta izin dan ambil token — ini HARUS dipanggil dari user gesture
    await requestPermissionAndGetToken()
    // Update state permission lokal
    permission.value = Notification.permission as NotificationPermission
    if (Notification.permission === 'granted') {
      show.value = false
    }
  } catch (e) {
    console.warn('[EnableNotificationBanner] enable failed', e)
  } finally {
    isSaving.value = false
  }
}

function dismiss() {
  show.value = false
  if (permission.value === 'denied') {
    sessionStorage.setItem('nitip:banner-denied-dismissed', '1')
  }
}

function openSettingsHelp() {
  // Browser settings guidance
  const ua = navigator.userAgent.toLowerCase()
  let helpUrl = ''
  if (ua.includes('chrome')) {
    helpUrl = 'chrome://settings/content/notifications'
  } else if (ua.includes('firefox')) {
    helpUrl = 'about:preferences#privacy'
  }
  alert(
    'Cara mengaktifkan notifikasi:\n\n' +
    'Chrome: Klik ikon gembok di address bar > Site settings > Notifications > Allow\n' +
    'Atau buka: chrome://settings/content/notifications\n\n' +
    'Firefox: about:preferences#privacy > Permissions > Notifications > Settings > Allow nihtip.com\n\n' +
    'Safari: Preferences > Websites > Notifications > Allow nihtip.com\n\n' +
    'Setelah Allow, refresh halaman — FCM akan dapat token dan backend bisa push bahkan saat tab tertutup (via SW firebase-messaging-sw.js).'
  )
}
</script>

<template>
  <div v-if="show && !isInsideWebView" class="px-4 pt-3">
    <div
      v-if="permission === 'default'"
      class="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3 items-start shadow-sm"
    >
      <div class="p-2 bg-amber-100 rounded-xl shrink-0">
        <Bell class="w-5 h-5 text-amber-700" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-amber-900">Aktifkan Notifikasi Realtime?</p>
        <p class="text-xs text-amber-800 mt-1 leading-relaxed">
          Dapatkan order masuk, status pesanan, dan pembayaran QRIS <b>tanpa refresh</b> — via FCM + SSE.
          Sekarang sudah ganti polling 15s/10s/5s/30s jadi push. Browser akan minta izin notifikasi.
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
            :disabled="isSaving"
            @click="enable"
          >
            <Check v-if="!isSaving" class="w-4 h-4" />
            <span v-if="!isSaving">Aktifkan</span>
            <span v-else>Menyimpan...</span>
          </button>
          <button
            class="px-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100"
            @click="dismiss"
          >
            Nanti
          </button>
        </div>
      </div>
      <button class="p-1 text-amber-600 hover:text-amber-800" @click="dismiss">
        <X class="w-4 h-4" />
      </button>
    </div>

    <div
      v-else-if="permission === 'denied'"
      class="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start shadow-sm"
    >
      <div class="p-2 bg-red-100 rounded-xl shrink-0">
        <BellOff class="w-5 h-5 text-red-700" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-red-900">Notifikasi Diblokir</p>
        <p class="text-xs text-red-800 mt-1 leading-relaxed">
          Kamu memblokir notifikasi. Untuk dapat order realtime tanpa polling (SSE + FCM), aktifkan manual di pengaturan browser.
          Tanpa ini, kamu masih dapat realtime via SSE, tapi tidak dapat push saat tab tertutup.
        </p>
        <div class="flex gap-2 mt-3">
          <button
            class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
            @click="openSettingsHelp"
          >
            Cara Aktifkan
          </button>
          <button
            class="px-4 py-2 rounded-xl bg-white border border-red-200 text-red-800 text-xs font-semibold hover:bg-red-100"
            @click="dismiss"
          >
            Tutup
          </button>
        </div>
      </div>
      <button class="p-1 text-red-600 hover:text-red-800" @click="dismiss">
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
