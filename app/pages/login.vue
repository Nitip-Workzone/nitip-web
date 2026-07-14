<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const isObscured = ref(true)
const rememberMe = ref(true)

const showTotp = ref(false)
const totpCode = ref('')

const handleLogin = async () => {
  const result = await authStore.login(email.value, password.value, showTotp.value ? totpCode.value : undefined)
  if (result?.requireTotp) {
    showTotp.value = true
    return
  }
  if (result?.success) {
    await authStore.fetchProfile()
    if (authStore.isAdmin) {
      navigateTo('/admin')
    } else {
      navigateTo('/dashboard')
    }
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F8FAFC] relative overflow-hidden flex items-center justify-center p-4">
    <!-- Background Decorator -->
    <div
      class="absolute top-0 left-0 right-0 bg-primary"
      style="height: 40%; clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);"
    />

    <!-- Content -->
    <div class="relative z-10 w-full max-w-md space-y-6">
      <div class="text-center space-y-2 text-white">
        <CommonAppLogo :size="16" :font-size="20" class="justify-center" :dark-mode="true" />
        <h1 class="text-2xl font-bold tracking-tight mt-3">Masuk</h1>
        <p class="text-white/70 text-sm">Silakan masuk untuk melanjutkan</p>
      </div>

      <!-- Card -->
      <div class="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
        <form class="space-y-5" @submit.prevent="handleLogin">
          <template v-if="!showTotp">
            <UiInput v-model="email" label="Alamat Email" type="email" placeholder="email@gmail.com" required />
            
            <div class="relative">
              <UiInput v-model="password" label="Kata Sandi" :type="isObscured ? 'password' : 'text'" placeholder="••••••••••••" required />
              <button
                type="button"
                class="absolute right-3 top-[38px] text-muted-foreground"
                @click="isObscured = !isObscured"
              >
                <svg v-if="isObscured" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                  class="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                >
                <span class="text-xs text-muted-foreground">Ingat saya</span>
              </label>
              <button type="button" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Lupa Kata Sandi?
              </button>
            </div>
          </template>

          <template v-else>
            <div class="space-y-2 text-center mb-4">
              <p class="text-sm font-medium text-foreground">Verifikasi 2-Langkah</p>
              <p class="text-xs text-muted-foreground">Masukkan 6-digit kode TOTP dari aplikasi Authenticator Anda.</p>
            </div>
            <UiInput v-model="totpCode" label="Kode TOTP" type="text" placeholder="123456" required maxlength="6" />
          </template>

          <UiButton
            type="submit"
            class="w-full h-[52px] bg-primary text-white font-bold text-base rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-50"
            :loading="authStore.loading"
          >
            Masuk
          </UiButton>

          <!-- Register Link -->
          <div class="text-center pt-2">
            <span class="text-xs text-muted-foreground">Belum punya akun? </span>
            <NuxtLink to="/register" class="text-xs text-primary font-bold hover:underline">
              Daftar
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>