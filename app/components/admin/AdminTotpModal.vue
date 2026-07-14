<script setup lang="ts">
import { ref } from 'vue'
import { ShieldCheck, X } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const authStore = useAuthStore()
const toastStore = useToastStore()

const totpStep = ref(1) // 1: Info/QR, 2: Verification, 3: Disable
const qrBase64 = ref('')
const totpSecret = ref('')
const totpCode = ref('')
const totpError = ref('')
const totpSubmitting = ref(false)

const closeModal = () => {
  if (!totpSubmitting.value) {
    emit('update:modelValue', false)
  }
}

const openTotpModal = async (isDisableFlow = false) => {
  totpError.value = ''
  totpCode.value = ''
  
  if (isDisableFlow) {
    totpStep.value = 3
  } else {
    try {
      const data = await authStore.setupTotp()
      qrBase64.value = data?.qr_base64 || ''
      totpSecret.value = data?.secret || ''
      totpStep.value = 1
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      toastStore.add(err.data?.message || 'Gagal memulai setup TOTP')
      closeModal()
    }
  }
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const isEnabled = authStore.user?.totp_enabled || false
    openTotpModal(isEnabled)
  }
})

const handleTotpSubmit = async () => {
  totpError.value = ''
  if (totpCode.value.length !== 6 || !/^\d+$/.test(totpCode.value)) {
    totpError.value = 'Kode TOTP harus 6 digit angka'
    return
  }

  totpSubmitting.value = true
  try {
    if (totpStep.value === 2) {
      await authStore.enableTotp(totpCode.value)
      toastStore.add('Autentikasi 2-Langkah berhasil diaktifkan! Silakan login kembali.')
      closeModal()
      authStore.logout()
    } else if (totpStep.value === 3) {
      await authStore.disableTotp(totpCode.value)
      toastStore.add('Autentikasi 2-Langkah dinonaktifkan! Silakan login kembali.')
      closeModal()
      authStore.logout()
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string } }
    totpError.value = err.data?.message || 'Kode TOTP tidak valid'
  } finally {
    totpSubmitting.value = false
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="closeModal">
      <div class="bg-card rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-5 duration-300 relative">
        <button
          class="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          @click="closeModal"
        >
          <X class="w-5 h-5" />
        </button>

        <!-- Step 1: Info & QR Code -->
        <div v-if="totpStep === 1" class="text-center space-y-4 pt-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-blue-500/10 text-blue-500">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-foreground">Setup Authenticator</h3>
            <p class="text-xs text-muted-foreground mt-1">Scan QR Code ini menggunakan aplikasi Google Authenticator atau Authy.</p>
          </div>
          
          <div class="bg-white p-4 rounded-2xl flex items-center justify-center border border-border">
            <img v-if="qrBase64" :src="qrBase64" alt="TOTP QR Code" class="w-40 h-40 object-contain rounded-xl mix-blend-multiply">
            <div v-else class="w-40 h-40 flex items-center justify-center border border-dashed rounded-xl border-muted">
              <span class="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
            </div>
          </div>

          <div class="text-left bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
            <p class="text-[10px] font-bold text-blue-500 mb-1">Tidak bisa scan QR?</p>
            <p class="text-xs text-foreground font-mono break-all select-all">{{ totpSecret }}</p>
          </div>

          <UiButton class="w-full" variant="primary" @click="totpStep = 2">
            Lanjutkan
          </UiButton>
        </div>

        <!-- Step 2/3: Verification Input -->
        <div v-if="totpStep === 2 || totpStep === 3" class="space-y-4 pt-4">
          <div class="text-center">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" :class="totpStep === 2 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <h3 class="text-base font-extrabold text-foreground">
              {{ totpStep === 2 ? 'Verifikasi Kode' : 'Nonaktifkan 2FA' }}
            </h3>
            <p class="text-xs text-muted-foreground mt-1">
              Masukkan 6-digit kode dari aplikasi Authenticator Anda.
            </p>
          </div>

          <div class="space-y-1.5">
            <input
              v-model="totpCode"
              type="text"
              maxlength="6"
              placeholder="123456"
              class="w-full h-12 text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-input bg-background focus:border-primary focus:outline-none transition-all placeholder:tracking-normal placeholder:font-normal"
            >
          </div>

          <p v-if="totpError" class="text-center text-xs font-semibold text-destructive">{{ totpError }}</p>

          <div class="flex items-center gap-3 pt-1">
            <UiButton
              class="flex-1"
              variant="secondary"
              @click="totpStep === 2 ? totpStep = 1 : closeModal()"
            >
              Kembali
            </UiButton>
            <UiButton
              class="flex-1"
              :variant="totpStep === 2 ? 'primary' : 'destructive'"
              :loading="totpSubmitting"
              @click="handleTotpSubmit"
            >
              {{ totpStep === 2 ? 'Konfirmasi' : 'Matikan 2FA' }}
            </UiButton>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>
