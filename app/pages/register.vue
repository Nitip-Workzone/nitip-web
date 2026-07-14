<script setup lang="ts">
definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const name = ref('')
const email = ref('')
const whatsappNumber = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isObscured = ref(true)

const handleRegister = async () => {
  errorMessage.value = ''

  if (!name.value.trim()) {
    errorMessage.value = 'Nama wajib diisi'
    return
  }
  if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errorMessage.value = 'Format email tidak valid'
    return
  }
  if (!whatsappNumber.value.trim()) {
    errorMessage.value = 'Nomor WhatsApp wajib diisi'
    return
  }
  if (password.value.length < 6) {
    errorMessage.value = 'Password minimal 6 karakter'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password tidak cocok'
    return
  }

  isSubmitting.value = true
  try {
    const success = await authStore.register({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      whatsapp_number: whatsappNumber.value.trim(),
    })

    if (success) {
      await authStore.fetchProfile()
      navigateTo('/dashboard')
    } else {
      errorMessage.value = 'Registrasi gagal. Email mungkin sudah terdaftar.'
    }
  } catch {
    errorMessage.value = 'Terjadi kesalahan. Silakan coba lagi.'
  } finally {
    isSubmitting.value = false
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
        <h1 class="text-2xl font-bold tracking-tight mt-3">Buat Akun</h1>
        <p class="text-white/70 text-sm">Daftar sebagai Penitip untuk mulai titip barang</p>
      </div>

      <!-- Card -->
      <div class="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
        <form class="space-y-4" @submit.prevent="handleRegister">
          <UiInput v-model="name" label="Nama Lengkap" placeholder="Masukkan nama lengkap" required />
          <UiInput v-model="email" label="Alamat Email" type="email" placeholder="email@gmail.com" required />
          <UiInput v-model="whatsappNumber" label="Nomor WhatsApp" type="tel" placeholder="08xxxxxxxxxx" required />
          
          <div class="relative">
            <UiInput v-model="password" label="Kata Sandi" :type="isObscured ? 'password' : 'text'" placeholder="Minimal 6 karakter" required />
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

          <UiInput v-model="confirmPassword" label="Konfirmasi Kata Sandi" type="password" placeholder="Ulangi kata sandi" required />

          <!-- Error Message -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {{ errorMessage }}
          </div>

          <!-- Register Button -->
          <UiButton
            type="submit"
            class="w-full h-[52px] bg-primary text-white font-bold text-base rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-50"
            :loading="isSubmitting || authStore.loading"
          >
            Daftar
          </UiButton>

          <!-- Login Link -->
          <div class="text-center pt-2">
            <span class="text-xs text-muted-foreground">Sudah punya akun? </span>
            <NuxtLink to="/login" class="text-xs text-primary font-bold hover:underline">
              Masuk
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>