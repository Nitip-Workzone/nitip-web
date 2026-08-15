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

const isBiometricsSupported = ref(false)
const isAppleDevice = ref(false)
const showBiometricPrompt = ref(false)

let webauthnCreate: any = null
let webauthnGet: any = null

onMounted(async () => {
  try {
    const webauthn = await import('@github/webauthn-json')
    webauthnCreate = webauthn.create
    webauthnGet = webauthn.get
    
    isBiometricsSupported.value = webauthn.supported()
    if (typeof window !== 'undefined') {
      isAppleDevice.value = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
    }
  } catch (err) {
    console.warn('WebAuthn is not supported in this environment:', err)
  }
})

const navigateToRoleDashboard = () => {
  const role = authStore.user?.role
  if (role === 'admin') {
    navigateTo('/admin')
  } else if (role === 'cs') {
    navigateTo('/admin/support')
  } else {
    navigateTo('/dashboard')
  }
}

const handleLogin = async () => {
  const result = await authStore.login(email.value, password.value, showTotp.value ? totpCode.value : undefined, 'web')
  if (result?.requireTotp) {
    showTotp.value = true
    return
  }
  if (result?.success) {
    await authStore.fetchProfile()
    if (isBiometricsSupported.value) {
      showBiometricPrompt.value = true
    } else {
      navigateToRoleDashboard()
    }
  }
}

const handleBiometricLogin = async () => {
  if (!email.value) {
    try {
      const errorStore = useErrorStore()
      errorStore.showError('Silakan masukkan Email atau Nomor WhatsApp terlebih dahulu untuk menggunakan Face ID / Fingerprint.', 'Masuk Instan')
    } catch {
      alert('Silakan masukkan Email atau Nomor WhatsApp terlebih dahulu.')
    }
    return
  }

  try {
    const options = await authStore.webauthnLoginBegin(email.value)
    if (!options) {
      throw new Error('Gagal mendapatkan konfigurasi biometrik')
    }

    const credential = await webauthnGet(options)
    const result = await authStore.webauthnLoginFinish(email.value, credential)
    if (result.success) {
      navigateToRoleDashboard()
    }
  } catch (err: any) {
    console.error(err)
    if (err.name !== 'NotAllowedError') {
      try {
        const errorStore = useErrorStore()
        errorStore.showError(err.message || 'Gagal memverifikasi biometrik Anda.', 'Gagal Masuk')
      } catch {
        alert('Gagal masuk dengan biometrik.')
      }
    }
  }
}

const registerBiometrics = async () => {
  showBiometricPrompt.value = false
  try {
    const options = await authStore.webauthnRegisterBegin()
    if (!options) {
      throw new Error('Gagal memproses pendaftaran biometrik')
    }

    const credential = await webauthnCreate(options)
    const success = await authStore.webauthnRegisterFinish(credential)
    if (success) {
      try {
        const errStore = useErrorStore()
        errStore.showError('Masuk Instan (Face ID / Fingerprint) berhasil diaktifkan untuk perangkat ini!', 'Sukses')
      } catch {
        alert('Biometrik berhasil diaktifkan!')
      }
    }
  } catch (err: any) {
    console.error('Webauthn registration error:', err)
    if (err.name !== 'NotAllowedError') {
      try {
        const errStore = useErrorStore()
        errStore.showError('Gagal mengaktifkan masuk biometrik: ' + (err.message || err), 'Registrasi Gagal')
      } catch {
        alert('Gagal mendaftarkan biometrik.')
      }
    }
  } finally {
    navigateToRoleDashboard()
  }
}

const skipBiometrics = () => {
  showBiometricPrompt.value = false
  navigateToRoleDashboard()
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
    <div class="relative z-10 w-full max-w-md space-y-5 -mt-6">
      <div class="text-center space-y-1 text-white">
        <CommonAppLogo :size="48" :font-size="20" class="justify-center" :dark-mode="true" :show-text="false" />
        <h1 class="text-2xl font-bold tracking-tight mt-1">Masuk</h1>
        <p class="text-white/70 text-sm">Silakan masuk untuk melanjutkan</p>
      </div>

      <!-- Card -->
      <div class="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
        <form class="space-y-5" @submit.prevent="handleLogin">
          <template v-if="!showTotp">
            <UiInput v-model="email" label="Email atau Nomor WhatsApp" type="text" placeholder="email@gmail.com atau 0812xxxx" required />
            
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

          <div class="flex gap-3">
            <UiButton
              type="submit"
              class="flex-1 h-[52px] bg-primary text-white font-bold text-base rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-50"
              :loading="authStore.loading"
            >
              Masuk
            </UiButton>
            <button
              v-if="isBiometricsSupported && !showTotp"
              type="button"
              @click="handleBiometricLogin"
              class="w-[52px] h-[52px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-border/50 rounded-xl active:scale-[0.95] transition-all text-primary shrink-0"
              title="Masuk dengan Sidik Jari / Wajah"
            >
              <svg v-if="isAppleDevice" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 22c5.523 0 10-4.577 10-10S17.523 2 12 2 2 6.577 2 12s4.523 10 10 10zM8 9.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm-5.5 6c.5 1.5 2 2.5 4.5 2.5s4-1 4.5-2.5" />
              </svg>
              <svg v-else class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0-1.657-1.343-3-3-3s-3 1.343-3 3v2c0 .552-.448 1-1 1s-1-.448-1-1v-2c0-2.761 2.239-5 5-5s5 2.239 5 5v2c0 .552-.448 1-1 1s-1-.448-1-1v-2zm-3-9c-5.523 0-10 4.477-10 10v1c0 .552.448 1 1 1s1-.448 1-1v-1c0-4.418 3.582-8 8-8s8 3.582 8 8v3c0 2.206-1.794 4-4 4s-4-1.794-4-4v-3c0-1.103-.897-2-2-2s-2 .897-2 2v3c0 3.309 2.691 6 6 6s6-2.691 6-6v-3c0-5.523-4.477-10-10-10zm0 15c-.552 0-1-.448-1-1v-1c0-.552.448-1 1-1s1 .448 1 1v1c0 .552-.448 1-1 1z" />
              </svg>
            </button>
          </div>

          <p v-if="!showTotp" class="text-xs text-center text-muted-foreground pt-2">
            Belum memiliki akun? 
            <NuxtLink to="/register" class="text-primary hover:underline font-bold">Daftar Sekarang</NuxtLink>
          </p>
        </form>
      </div>
    </div>

    <!-- Biometrics Prompt Modal -->
    <div v-if="showBiometricPrompt" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-border">
        <div class="flex flex-col items-center text-center space-y-2">
          <!-- Icon container -->
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <svg v-if="isAppleDevice" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 22c5.523 0 10-4.577 10-10S17.523 2 12 2 2 6.577 2 12s4.523 10 10 10zm-4-12.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm-5.5 6c.5 1.5 2 2.5 4.5 2.5s4-1 4.5-2.5" />
            </svg>
            <svg v-else class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0-1.657-1.343-3-3-3s-3 1.343-3 3v2c0 .552-.448 1-1 1s-1-.448-1-1v-2c0-2.761 2.239-5 5-5s5 2.239 5 5v2c0 .552-.448 1-1 1s-1-.448-1-1v-2zm-3-9c-5.523 0-10 4.477-10 10v1c0 .552.448 1 1 1s1-.448 1-1v-1c0-4.418 3.582-8 8-8s8 3.582 8 8v3c0 2.206-1.794 4-4 4s-4-1.794-4-4v-3c0-1.103-.897-2-2-2s-2 .897-2 2v3c0 3.309 2.691 6 6 6s6-2.691 6-6v-3c0-5.523-4.477-10-10-10zm0 15c-.552 0-1-.448-1-1v-1c0-.552.448-1 1-1s1 .448 1 1v1c0 .552-.448 1-1 1z" />
            </svg>
          </div>
          
          <h3 class="text-lg font-bold text-slate-800">Aktifkan Masuk Instan?</h3>
          <p class="text-sm text-slate-500">
            Ingin mengaktifkan {{ isAppleDevice ? 'Face ID / Touch ID' : 'Sidik Jari / Biometrik' }} untuk masuk ke akun Anda dengan lebih cepat di perangkat ini?
          </p>
        </div>

        <div class="flex flex-col gap-2 pt-2">
          <button 
            type="button" 
            @click="registerBiometrics" 
            class="w-full py-3 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-transform text-sm"
          >
            Aktifkan Sekarang
          </button>
          <button 
            type="button" 
            @click="skipBiometrics" 
            class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-[0.98] transition-transform text-sm"
          >
            Mungkin Nanti
          </button>
        </div>
      </div>
    </div>
  </div>
</template>