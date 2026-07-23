<script setup lang="ts">
const { $pwa } = useNuxtApp()
const showInstallBanner = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deferredPrompt = ref<any>(null)

// State untuk update prompt
const showUpdateBanner = computed(() => {
  return $pwa?.needRefresh
})

onMounted(() => {
  // Hanya jalankan di client-side
  if (!import.meta.client) return

  // Cek apakah sudah terinstall (standalone display mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  if (isStandalone) return

  // Cek local storage untuk cooldown penolakan banner (7 hari)
  const dismissedTime = localStorage.getItem('pwa-install-dismissed')
  if (dismissedTime) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissed < 7) {
      console.log('[PWA] Installation banner is in cooldown period.')
      return
    }
  }

  // Tangkap event prompt install bawaan browser
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallBanner.value = true
    console.log('[PWA] beforeinstallprompt event captured.')
  })
})

const installPwa = async () => {
  if (!deferredPrompt.value) return
  
  // Tampilkan prompt bawaan OS
  deferredPrompt.value.prompt()
  
  // Tunggu respon user
  const { outcome } = await deferredPrompt.value.userChoice
  console.log(`[PWA] User choice outcome: ${outcome}`)
  
  if (outcome === 'accepted') {
    showInstallBanner.value = false
  }
  deferredPrompt.value = null
}

const dismissInstallBanner = () => {
  showInstallBanner.value = false
  // Simpan timestamp penolakan untuk cooldown 7 hari
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}

const updateApp = () => {
  if ($pwa?.updateServiceWorker) {
    $pwa.updateServiceWorker(true)
  }
}
</script>

<template>
  <div class="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-4 sm:max-w-md">
    <!-- 1. Banner Penawaran Install PWA -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-10 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-10 opacity-0"
    >
      <div
        v-if="showInstallBanner"
        class="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-2xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <!-- Icon App (Mobile-like) -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-6 w-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-gray-900 dark:text-white">Gunakan Aplikasi Nihtip</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Pasang aplikasi di layar utama Anda untuk akses lebih cepat, hemat kuota, dan pengalaman tanpa hambatan.
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button
            class="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="dismissInstallBanner"
          >
            Nanti Saja
          </button>
          <button
            class="flex-1 rounded-xl bg-blue-600 py-2.5 text-center text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            @click="installPwa"
          >
            Pasang Sekarang
          </button>
        </div>
      </div>
    </Transition>

    <!-- 2. Banner Pemberitahuan Pembaruan Aplikasi -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-10 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-10 opacity-0"
    >
      <div
        v-if="showUpdateBanner"
        class="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/90 p-4 shadow-xl backdrop-blur-xl dark:border-blue-900/50 dark:bg-blue-950/40"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-5 w-5 animate-spin">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-blue-900 dark:text-blue-100">Versi Baru Tersedia</p>
            <p class="text-[10px] text-blue-700/80 dark:text-blue-300/80">Pembaruan siap dipasang di web Anda.</p>
          </div>
        </div>
        <button
          class="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:bg-blue-800"
          @click="updateApp"
        >
          Perbarui
        </button>
      </div>
    </Transition>
  </div>
</template>
