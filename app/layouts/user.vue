<script setup lang="ts">
import { Home, Package, User, Truck } from '@lucide/vue'
import { useNotificationsStore } from '~/stores/notifications'

const route = useRoute()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

const navItems = [
  { path: '/dashboard', label: 'Beranda', icon: Home },
  { path: '/trips', label: 'Cari Trip', icon: Truck },
  { path: '/orders', label: 'Order Saya', icon: Package },
  { path: '/profile', label: 'Profil', icon: User },
]

const isActive = (path: string) => {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(path)
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    notificationsStore.fetchUnreadCount()
  }
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col font-sans">

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
