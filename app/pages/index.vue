<script setup lang="ts">
import { ShieldCheck, Lock, Zap } from 'lucide-vue-next'

definePageMeta({
  layout: false,
})

const featureChips = [
  { icon: ShieldCheck, label: 'Terverifikasi' },
  { icon: Lock, label: 'Aman' },
  { icon: Zap, label: 'Cepat' },
]
</script>

<template>
  <div class="min-h-[100dvh] h-[100dvh] bg-background flex flex-col overflow-hidden max-w-md mx-auto border-x border-border/40 shadow-sm">
    <!-- Top Logo Bar -->
    <header class="px-6 pt-6 shrink-0 flex justify-center">
      <CommonAppLogo :size="16" :font-size="18" />
    </header>

    <!-- All content centered together -->
    <main class="flex-1 flex flex-col items-center justify-center px-6">
      <div class="w-full text-center space-y-6">
        <!-- Illustration -->
        <div class="flex items-end justify-center h-[24vh] pb-2">
          <img
            src="/welcome_illustration.png"
            alt="Kirim & Titip Barang"
            class="max-h-[26vh] w-auto object-contain"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          >
        </div>

        <!-- Headline -->
        <div class="space-y-2">
          <h1 class="text-2xl font-extrabold text-foreground leading-tight tracking-tight">
            Kirim & Titip Barang<br>Lebih Mudah.
          </h1>
          <p class="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Solusi terpercaya untuk segala kebutuhan titip-menitip Anda. Aman, cepat, dan transparan.
          </p>
        </div>

        <!-- Feature Chips -->
        <div class="flex items-center justify-center gap-2 flex-wrap">
          <div
            v-for="chip in featureChips"
            :key="chip.label"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-full border border-primary/10"
          >
            <component :is="chip.icon" class="w-3.5 h-3.5 text-primary" />
            <span class="text-[11px] font-bold text-primary">{{ chip.label }}</span>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div class="pt-4 space-y-3 max-w-xs mx-auto w-full">
          <NuxtLink
            to="/register"
            class="w-full h-12 bg-primary text-white font-bold text-sm rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center shadow-md shadow-primary/10"
          >
            Mulai Sekarang
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="w-full h-12 bg-card text-primary font-bold text-sm rounded-xl border border-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center hover:bg-accent/40"
          >
            Masuk ke Akun
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>