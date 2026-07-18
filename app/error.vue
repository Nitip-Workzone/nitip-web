<script setup lang="ts">
import { Home, RefreshCw, Wrench, WifiOff, Clock, ServerCrash, Search } from '@lucide/vue'

const props = defineProps<{
  error: {
    statusCode: number
    statusMessage?: string
    message?: string
  }
}>()

const statusCode = computed(() => props.error?.statusCode || 500)

const errorConfig = computed(() => {
  switch (statusCode.value) {
    case 404:
      return {
        icon: Search,
        title: 'Halaman Tidak Ditemukan',
        message: 'Maaf, halaman yang Anda cari tidak tersedia atau mungkin telah dipindahkan.',
        color: 'text-blue-500',
        badgeBg: 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/50 dark:border-blue-800',
        iconBg: 'bg-blue-50 dark:bg-blue-950/30',
      }
    case 502:
      return {
        icon: WifiOff,
        title: 'Server Tidak Dapat Diakses',
        message: 'Server sedang tidak dapat diakses. Tim teknis kami sedang menangani masalah ini.',
        color: 'text-orange-500',
        badgeBg: 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/50 dark:border-orange-800',
        iconBg: 'bg-orange-50 dark:bg-orange-950/30',
      }
    case 503:
      return {
        icon: Wrench,
        title: 'Sedang Dalam Pemeliharaan',
        message: 'Layanan kami sedang dalam proses pemeliharaan. Silakan kembali beberapa saat lagi.',
        color: 'text-amber-500',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/50 dark:border-amber-800',
        iconBg: 'bg-amber-50 dark:bg-amber-950/30',
      }
    case 504:
      return {
        icon: Clock,
        title: 'Server Terlalu Lama Merespons',
        message: 'Server membutuhkan waktu terlalu lama untuk merespons. Silakan coba beberapa saat lagi.',
        color: 'text-purple-500',
        badgeBg: 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-950/50 dark:border-purple-800',
        iconBg: 'bg-purple-50 dark:bg-purple-950/30',
      }
    default:
      return {
        icon: ServerCrash,
        title: 'Terjadi Gangguan Pada Server',
        message: 'Maaf, terjadi kesalahan yang tidak terduga. Tim teknis kami sedang menyelidiki masalah ini.',
        color: 'text-red-500',
        badgeBg: 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/50 dark:border-red-800',
        iconBg: 'bg-red-50 dark:bg-red-950/30',
      }
  }
})

const IconComponent = computed(() => errorConfig.value.icon)

function handleRefresh() {
  clearError({ redirect: '/' })
}

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md text-center space-y-6">
      <!-- Icon -->
      <div class="flex justify-center">
        <div
          :class="[
            errorConfig.iconBg,
            'w-24 h-24 rounded-full flex items-center justify-center',
          ]"
        >
          <component :is="IconComponent" :class="[errorConfig.color, 'w-12 h-12']" />
        </div>
      </div>

      <!-- Error Code Badge -->
      <div class="flex justify-center">
        <span
          :class="[
            errorConfig.badgeBg,
            'inline-block px-4 py-1.5 text-sm font-bold rounded-full border',
          ]"
        >
          Error {{ statusCode }}
        </span>
      </div>

      <!-- Text Content -->
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-foreground">
          {{ errorConfig.title }}
        </h1>
        <p class="text-muted-foreground leading-relaxed">
          {{ errorConfig.message }}
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
          v-if="statusCode >= 500"
          class="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl border border-border transition-colors"
          @click="handleRefresh"
        >
          <RefreshCw class="w-4 h-4" />
          Coba Lagi
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