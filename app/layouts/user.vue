<script setup lang="ts">
import { Home, Package, User, Truck, Store, ShoppingBag, CreditCard, Utensils, WifiOff, AlertTriangle } from '@lucide/vue'
import { useNotificationsStore } from '~/stores/notifications'
import { useConnectivityStore } from '~/stores/connectivity'

const route = useRoute()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const connectivityStore = useConnectivityStore()

const navItems = computed(() => {
  if (authStore.user?.role === 'merchant') {
    return [
      { path: '/merchant/menu', label: 'Dashboard', icon: Store },
      { path: '/merchant/menu/catalog', label: 'Katalog', icon: Utensils },
      { path: '/merchant/orders', label: 'Order Aktif', icon: ShoppingBag },
      { path: '/wallet', label: 'Dompet', icon: CreditCard },
      { path: '/profile', label: 'Profil', icon: User },
    ]
  }
  return [
    { path: '/dashboard', label: 'Beranda', icon: Home },
    { path: '/trips', label: 'Cari Trip', icon: Truck },
    { path: '/orders', label: 'Order Saya', icon: Package },
    { path: '/wallet', label: 'Wallet', icon: CreditCard },
    { path: '/profile', label: 'Profil', icon: User },
  ]
})

const isActive = (path: string) => {
  const cleanRoutePath = route.path.replace(/\/$/, '')
  const cleanPath = path.replace(/\/$/, '')
  if (cleanPath === '/dashboard' || cleanPath === '/merchant/menu') {
    return cleanRoutePath === cleanPath
  }
  return cleanRoutePath.startsWith(cleanPath)
}

onMounted(() => {
  connectivityStore.initialize()
  if (authStore.isAuthenticated) {
    notificationsStore.startPolling()
  }
})

onUnmounted(() => {
  notificationsStore.stopPolling()
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col font-sans">
    <!-- Connectivity Banner -->
    <div 
      v-if="connectivityStore.isOffline" 
      class="bg-red-600 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm"
    >
      <WifiOff class="w-4 h-4" />
      <span>Tidak ada koneksi internet</span>
    </div>
    <div 
      v-else-if="connectivityStore.isPoorConnection" 
      class="bg-amber-600 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm"
    >
      <AlertTriangle class="w-4 h-4" />
      <span>Koneksi internet lambat / tidak stabil</span>
    </div>

    <!-- Page Content -->
    <main class="flex-1 max-w-md mx-auto w-full pt-4 pb-20">
      <slot />
    </main>

    <!-- Bottom Navigation (Full-width, Always Visible) -->
    <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-bottom">
      <div class="flex justify-around items-center h-16 max-w-md mx-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
          :class="isActive(item.path) ? 'text-primary' : 'text-slate-400'"
        >
          <component :is="item.icon" class="w-5 h-5" stroke-width="2.5" />
          <span class="text-[10px] font-bold tracking-wide">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
