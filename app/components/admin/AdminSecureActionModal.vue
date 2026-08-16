<script setup lang="ts">
import { ShieldAlert } from '@lucide/vue'
const props = defineProps<{
  open: boolean
  actionTitle?: string
  loading?: boolean
}>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm', payload: { admin_password: string; totp_code: string }): void
}>()

const authStore = useAuthStore()
const showTotpModal = ref(false)

const adminPassword = ref('')
const totpCode = ref('')

const isValid = computed(() => {
  return adminPassword.value.length >= 6 && /^\d{6}$/.test(totpCode.value)
})

function onConfirm() {
  if (!isValid.value) return
  emit('confirm', { admin_password: adminPassword.value, totp_code: totpCode.value })
}

function onClose() {
  emit('update:open', false)
}

watch(() => props.open, (v) => {
  if (!v) {
    adminPassword.value = ''
    totpCode.value = ''
  }
})
</script>

<template>
  <UiModal :open="open" @update:open="emit('update:open', $event)" size="md">
    <template #title>
      <div class="flex items-center gap-2">
        <ShieldAlert class="w-5 h-5 text-red-600" />
        <span>{{ actionTitle || 'Verifikasi Keamanan Admin' }}</span>
      </div>
    </template>

    <div class="space-y-5">
      <!-- TOTP not enabled warning -->
      <div v-if="!authStore.user?.totp_enabled" class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <ShieldAlert class="w-5 h-5 text-amber-600 mt-0.5" />
          <div class="text-sm text-amber-800">
            <p class="font-semibold">Autentikasi 2FA Admin Diperlukan</p>
            <p class="mt-1">Tindakan ini memerlukan TOTP 2FA aktif. Aktifkan TOTP di pengaturan keamanan akun admin terlebih dahulu.</p>
          </div>
        </div>
        <UiButton variant="secondary" size="sm" @click="showTotpModal = true">Aktifkan TOTP</UiButton>
      </div>

      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-sm font-medium text-red-800">Otorisasi Keamanan Admin</p>
        <p class="text-xs text-red-600 mt-1">Masukkan password admin dan kode TOTP 6 digit untuk mengonfirmasi tindakan sensitif ini. Aksi akan dicatat di audit log.</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium">Password Admin</label>
          <UiInput v-model="adminPassword" type="password" placeholder="Masukkan password admin" class="mt-1" />
        </div>
        <div>
          <label class="text-sm font-medium">Kode TOTP (6 digit)</label>
          <input
            v-model="totpCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            class="mt-1 w-full h-12 text-center text-xl font-mono tracking-widest rounded-md border border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
          />
        </div>
      </div>

      <div class="flex gap-2 justify-end pt-2">
        <UiButton variant="secondary" @click="onClose">Batal</UiButton>
        <UiButton variant="primary" :disabled="!isValid || loading" @click="onConfirm">
          <span v-if="loading">Memproses...</span>
          <span v-else>Konfirmasi &amp; Lanjutkan</span>
        </UiButton>
      </div>
    </div>

    <AdminTotpModal v-model:open="showTotpModal" />
  </UiModal>
</template>
