<script setup lang="ts">
import { Home, Package, User, Truck } from 'lucide-vue-next'
import { useNotificationsStore } from '~/stores/notifications'

const route = useRoute()
const router = useRouter()
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

const showNav = ref(true)
const lastScrollTop = ref(0)
const isKeyboardOpen = ref(false)

const handleScroll = () => {
  if (isKeyboardOpen.value) return
  const currentScroll = window.scrollY || document.documentElement.scrollTop
  if (currentScroll > lastScrollTop.value && currentScroll > 60) {
    // Scrolling down - hide nav
    showNav.value = false
  } else {
    // Scrolling up - show nav
    showNav.value = true
  }
  // Avoid negative values from bounce scroll
  lastScrollTop.value = currentScroll <= 0 ? 0 : currentScroll
}

// Detect virtual keyboard via Visual Viewport API
const handleViewportResize = () => {
  if (!window.visualViewport) return
  const viewportHeight = window.visualViewport.height
  const windowHeight = window.innerHeight
  // Keyboard is considered open when viewport shrinks by more than 150px
  const keyboardThreshold = 150
  const keyboardDetected = (windowHeight - viewportHeight) > keyboardThreshold

  isKeyboardOpen.value = keyboardDetected
  if (keyboardDetected) {
    showNav.value = false
  } else {
    showNav.value = true
  }
}

// Swipe Gesture Logic
const touchStartX = ref(0)
const touchStartY = ref(0)

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

const handleTouchEnd = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  if (!touch) return
  const touchEndX = touch.clientX
  const touchEndY = touch.clientY
  
  const diffX = touchEndX - touchStartX.value
  const diffY = touchEndY - touchStartY.value
  
  // Thresholds to ensure it's a horizontal swipe, not vertical scroll
  if (Math.abs(diffX) > 70 && Math.abs(diffY) < 50) {
    const currentPath = route.path
    // Map current path to one of the nav items
    let currentIndex = navItems.findIndex(item => item.path === currentPath)
    if (currentIndex === -1) {
      if (currentPath.startsWith('/orders')) currentIndex = 1
      else if (currentPath.startsWith('/profile')) currentIndex = 2
      else if (currentPath.startsWith('/dashboard')) currentIndex = 0
    }
    
    if (currentIndex !== -1) {
      if (diffX > 70 && currentIndex > 0) {
        // Swipe Right -> Move to previous tab (left)
        const prev = navItems[currentIndex - 1]
        if (prev) router.push(prev.path)
      } else if (diffX < -70 && currentIndex < navItems.length - 1) {
        // Swipe Left -> Move to next tab (right)
        const next = navItems[currentIndex + 1]
        if (next) router.push(next.path)
      }
    }
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    notificationsStore.fetchUnreadCount()
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  
  // Attach swipe gesture listeners to window
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })

  // Listen for virtual keyboard open/close via Visual Viewport
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchend', handleTouchEnd)

  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleViewportResize)
  }
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col font-sans">


    <!-- Page Content -->
    <main class="flex-1 max-w-md mx-auto w-full pt-4 pb-28">
      <slot />
    </main>

    <!-- Bottom Navigation (Floating Pill with Scroll Hide) -->
    <nav 
      class="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 transition-all duration-300 ease-out transform"
      :class="[
        showNav 
          ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' 
          : 'translate-y-16 opacity-0 scale-90 pointer-events-none'
      ]"
    >
      <div class="glass flex justify-around p-2 rounded-full shadow-2xl shadow-primary/25 border border-primary/10 min-w-[280px] w-full max-w-xs pointer-events-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center w-16 h-12 gap-1 transition-all relative group rounded-full"
          :class="isActive(item.path) ? 'text-primary' : 'text-slate-400 hover:text-slate-600'"
        >
          <!-- Active Background Pill -->
          <div 
            class="absolute inset-0 bg-primary/10 rounded-full transition-all duration-300"
            :class="isActive(item.path) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
          />
          
          <div class="relative z-10 flex flex-col items-center">
            <component :is="item.icon" class="w-5 h-5 transition-transform duration-300" :class="isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'" stroke-width="2.5" />
            <span class="text-[9px] font-bold mt-0.5 tracking-wide" :class="isActive(item.path) ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'">{{ item.label }}</span>
          </div>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>