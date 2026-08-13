<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const toastStore = useToastStore()

const name = ref('')
const email = ref('')
const whatsappNumber = ref('')
const password = ref('')
const confirmPassword = ref('')
const isObscured = ref(true)

// Geolocation state
const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
const gpsState = ref<'pending' | 'success' | 'denied' | 'unsupported'>('pending')
const gpsErrorMsg = ref('')

const requestLocation = () => {
  if (!navigator.geolocation) {
    gpsState.value = 'unsupported'
    return
  }
  gpsState.value = 'pending'
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lat.value = pos.coords.latitude
      lng.value = pos.coords.longitude
      gpsState.value = 'success'
    },
    (err) => {
      gpsState.value = 'denied'
      if (err.code === err.PERMISSION_DENIED) {
        gpsErrorMsg.value = 'Akses GPS ditolak. Harap izinkan akses lokasi pada browser Anda.'
      } else {
        gpsErrorMsg.value = 'Gagal mendeteksi lokasi GPS Anda. Pastikan GPS aktif.'
      }
    },
    { enableHighAccuracy: true, timeout: 15000 }
  )
}

onMounted(() => {
  requestLocation()
})

const handleRegister = async () => {
  // Guard GPS
  if (gpsState.value !== 'success' || !lat.value || !lng.value) {
    toastStore.add('Akses lokasi (GPS) wajib aktif untuk mendaftar akun baru.')
    return
  }

  // Validasi lokal
  if (password.value !== confirmPassword.value) {
    toastStore.add('Kata sandi konfirmasi tidak cocok.')
    return
  }

  if (password.value.length < 6) {
    toastStore.add('Kata sandi harus minimal 6 karakter.')
    return
  }

  // Bersihkan format nomor WhatsApp
  let formattedWA = whatsappNumber.value.trim()
  if (formattedWA.startsWith('0')) {
    formattedWA = '62' + formattedWA.slice(1)
  } else if (formattedWA.startsWith('+')) {
    formattedWA = formattedWA.slice(1)
  }

  if (formattedWA.length < 10) {
    toastStore.add('Nomor WhatsApp tidak valid (terlalu pendek).')
    return
  }

  const success = await authStore.register({
    name: name.value,
    email: email.value,
    password: password.value,
    whatsapp_number: formattedWA,
    latitude: lat.value,
    longitude: lng.value,
  })

  if (success) {
    toastStore.add('Pendaftaran berhasil! Selamat datang di Nihtip.')
    // Redirect ke dashboard (auto-login dipicu oleh authStore)
    navigateTo('/dashboard')
  } else {
    // Tampilkan toast error detail dari store jika ada
    const errStore = useErrorStore()
    if (errStore.message) {
      toastStore.add(errStore.message)
    } else {
      toastStore.add('Pendaftaran gagal. Alamat email mungkin sudah terdaftar.')
    }
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F8FAFC] relative overflow-hidden flex items-center justify-center p-4">
    <!-- Background Decorator -->
    <div
      class="absolute top-0 left-0 right-0 bg-primary"
      style="height: 48%; clip-path: polygon(0 0, 100% 0, 100% 80%, 0 100%);"
    />

    <!-- Content -->
    <div class="relative z-10 w-full max-w-md space-y-5 my-6">
      <div class="text-center space-y-1 text-white">
        <CommonAppLogo :size="48" :font-size="20" class="justify-center" :dark-mode="true" :show-text="false" />
        <h1 class="text-2xl font-bold tracking-tight mt-1">Daftar Akun Baru</h1>
        <p class="text-white/70 text-sm">Buat akun untuk mulai menitip belanjaan</p>
      </div>

      <!-- Card -->
      <div class="bg-card border border-border/50 rounded-2xl p-6 shadow-xl space-y-4">
        <!-- GPS Status Banner -->
        <div v-if="gpsState === 'pending'" class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center flex items-center justify-center gap-2">
          <span class="w-3.5 h-3.5 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
          <span class="text-[10px] font-bold text-slate-600">Melacak lokasi GPS Anda...</span>
        </div>
        <div v-else-if="gpsState === 'success'" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center flex items-center justify-center gap-1.5">
          <span class="text-emerald-600 text-xs">🟢</span>
          <span class="text-[10px] font-bold text-emerald-800">Lokasi GPS Terverifikasi (Kotamobagu/Bolmong)</span>
        </div>
        <div v-else-if="gpsState === 'denied' || gpsState === 'unsupported'" class="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <span class="text-rose-600 text-xs">🔴</span>
            <span class="text-[10px] font-bold text-rose-800">{{ gpsErrorMsg || 'Akses lokasi dinonaktifkan.' }}</span>
          </div>
          <button 
            type="button" 
            class="text-[9px] font-black uppercase tracking-wider text-rose-600 underline hover:text-rose-800 block mx-auto" 
            @click="requestLocation"
          >
            Coba Minta Akses Lagi
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="handleRegister">
          <UiInput v-model="name" label="Nama Lengkap" type="text" placeholder="John Doe" required />
          
          <UiInput v-model="email" label="Alamat Email" type="email" placeholder="email@gmail.com" required />
          
          <UiInput v-model="whatsappNumber" label="Nomor WhatsApp" type="tel" placeholder="08123456789" required />
          
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

          <UiInput v-model="confirmPassword" label="Konfirmasi Kata Sandi" type="password" placeholder="••••••••••••" required />

          <UiButton
            type="submit"
            :disabled="gpsState !== 'success' || authStore.loading"
            class="w-full h-[52px] bg-primary text-white font-bold text-base rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-50 mt-2"
            :loading="authStore.loading"
          >
            {{ gpsState !== 'success' ? 'Izinkan Lokasi Dahulu' : 'Daftar Sekarang' }}
          </UiButton>

          <p class="text-xs text-center text-muted-foreground pt-2">
            Sudah memiliki akun? 
            <NuxtLink to="/login" class="text-primary hover:underline font-bold">Masuk di sini</NuxtLink>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>