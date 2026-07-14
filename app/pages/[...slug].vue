<script setup lang="ts">
import { Home, ArrowLeft, Search } from 'lucide-vue-next'

definePageMeta({
  layout: false,
})

const route = useRoute()
const authStore = useAuthStore()

function goHome() {
  if (authStore.isAuthenticated && authStore.user?.role === 'admin') {
    navigateTo('/admin')
  } else if (authStore.isAuthenticated) {
    navigateTo('/dashboard')
  } else {
    navigateTo('/')
  }
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    goHome()
  }
}
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md text-center space-y-6">
      <!-- 404 Visual -->
      <div class="flex justify-center">
        <div class="relative">
          <!-- Large 404 number -->
          <span class="text-[120px] font-extrabold text-muted-foreground/10 leading-none select-none">404</span>
          <!-- Icon overlay -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <Search class="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- Text Content -->
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-foreground">
          Halaman Tidak Ditemukan
        </h1>
        <p class="text-muted-foreground leading-relaxed">
          Maaf, halaman <span class="font-mono text-sm bg-muted px-2 py-0.5 rounded">{{ route.path }}</span> tidak tersedia atau mungkin telah dipindahkan.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          class="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#1E3A5F] hover:bg-[#162D4A] rounded-xl transition-colors"
          @click="goHome"
        >
          <Home class="w-4 h-4" />
          Kembali ke Beranda
        </button>
        <button
          class="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl border border-border transition-colors"
          @click="goBack"
        >
          <ArrowLeft class="w-4 h-4" />
          Kembali
        </button>
      </div>

      <!-- Nitip Branding -->
      <div class="pt-8">
        <p class="text-xs text-muted-foreground/60">
          Nitip &mdash; Kirim & Titip Barang
        </p>
      </div>
    </div>
  </div>
</template>