<script setup lang="ts">
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Wallet, 
  Settings, 
  Menu, 
  X, 
  LogOut, 
  ShieldCheck,
  History,
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const { isOpen, toggle, close } = useSidebar()
const route = useRoute()

const showTotpModal = ref(false)

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'KYC Submissions', href: '/admin/kyc', icon: ShieldCheck },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Wallets', href: '/admin/wallets', icon: Wallet },
  { name: 'Audit Logs', href: '/admin/audit', icon: History },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

// Fetch profile on mount
onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchProfile()
  }
})

// Handle mobile responsiveness
const isMobile = ref(false)
if (import.meta.client) {
  isMobile.value = window.innerWidth < 1024
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 1024
    if (isMobile.value) close()
  })
}

const isActive = (href: string) => {
  if (href === '/admin') return route.path === '/admin'
  return route.path.startsWith(href)
}

watch(() => route.path, () => {
  if (isMobile.value) close()
})
</script>

<template>
  <div class="min-h-screen bg-background flex overflow-hidden">
    
    <!-- Mobile Overlay -->
    <div 
      v-if="isOpen && isMobile" 
      class="fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden"
      @click="close"
    />

    <!-- Sidebar -->
    <aside 
      class="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0"
      :class="[isOpen ? 'translate-x-0' : '-translate-x-full lg:w-20']"
    >
      <div class="flex flex-col h-full">
        <div class="flex items-center h-16 px-4 border-b border-border/50">
          <NuxtLink to="/admin" class="flex items-center gap-2 overflow-hidden group">
            <img src="/logo.webp" alt="Nihtip" class="w-12 h-12 object-contain transition-transform duration-200 group-hover:scale-110 flex-shrink-0" >
            <span v-if="isOpen || isMobile" class="font-bold text-lg tracking-tight truncate">Nihtip Admin</span>
          </NuxtLink>
          <button class="lg:hidden p-1 rounded-md hover:bg-accent" @click="toggle">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-accent text-muted-foreground hover:text-foreground"
            :class="{ 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary font-medium': isActive(item.href) }"
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="isOpen || isMobile" class="text-sm">{{ item.name }}</span>
            <div
              v-if="isOpen || isMobile"
              class="ml-auto w-1.5 h-1.5 rounded-full bg-primary opacity-0 transition-opacity"
              :class="{ 'opacity-100': isActive(item.href) }"
            />
          </NuxtLink>
        </nav>

        <!-- User Profile Bottom -->
        <div class="p-4 border-t border-border/50 bg-background/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
              {{ authStore.user?.name?.substring(0, 2).toUpperCase() || 'AD' }}
            </div>
            <div v-if="isOpen || isMobile" class="flex-1 overflow-hidden">
              <p class="text-sm font-medium truncate">{{ authStore.user?.name || 'Admin User' }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ authStore.user?.email || 'admin@nitip.com' }}</p>
            </div>
          </div>

          <div v-if="isOpen || isMobile" class="mt-4 space-y-2">
            <button 
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
              @click="showTotpModal = true"
            >
              <ShieldCheck class="w-4 h-4" />
              <span>{{ authStore.user?.totp_enabled ? 'Matikan 2FA (TOTP)' : 'Setup 2FA (TOTP)' }}</span>
            </button>

            <button 
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              @click="authStore.logout()"
            >
              <LogOut class="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <AdminTotpModal v-model="showTotpModal" />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Navbar -->
      <header class="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div class="flex items-center gap-4">
          <button class="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground" @click="toggle">
            <Menu class="w-5 h-5" />
          </button>
          <h2 class="text-phi-lg font-bold truncate hidden sm:block">
            {{ navigation.find(n => route.path.startsWith(n.href))?.name || 'Dashboard' }}
          </h2>
        </div>

        <div class="flex items-center gap-3">
          <!-- Notification Placeholder -->
          <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span class="text-xs font-medium text-emerald-500 uppercase tracking-wider">System Live</span>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
        <slot />
      </main>
    </div>
  </div>
</template>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>
