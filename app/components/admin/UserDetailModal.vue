<script setup lang="ts">
import { Shield, ShieldOff, Star, ShieldAlert, CreditCard, Lock, User, KeyRound, Eye, EyeOff } from '@lucide/vue'
import type { AdminUser } from '~/stores/users'
import type { UserBankAccount } from '~/stores/user-wallet'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  open: boolean
  user: AdminUser | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'updated'): void
}>()

const usersStore = useUsersStore()
const authStore = useAuthStore()
const { success, error } = useToast()

const activeTab = ref('profile')
const trustInput = ref(0)
const suspendReason = ref('')
const showSetupTotpModal = ref(false)

const bankAccount = ref<UserBankAccount | null>(null)
const loadingBank = ref(false)
const bankForm = ref({
  bank_name: '',
  account_no: '',
  account_name: '',
  admin_password: '',
  totp_code: '',
})

const passwordForm = ref({
  new_password: '',
  confirm_password: '',
  admin_password: '',
  totp_code: '',
})
const showNewPass = ref(false)
const showConfirmPass = ref(false)

watch(() => props.user, (u) => {
  if (u) {
    trustInput.value = u.trust_score
    suspendReason.value = u.suspended_reason || ''
  }
}, { immediate: true })

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    activeTab.value = 'profile'
  }
})

const loadBankAccount = async () => {
  if (!props.user) return
  loadingBank.value = true
  try {
    const res = await usersStore.fetchUserBankAccount(props.user.id)
    bankAccount.value = res
  } catch {
    bankAccount.value = null
  } finally {
    loadingBank.value = false
  }
}

watch([() => props.user, activeTab], async () => {
  if (!props.user) return
  if (activeTab.value === 'bank') {
    bankForm.value = {
      bank_name: '',
      account_no: '',
      account_name: '',
      admin_password: '',
      totp_code: '',
    }
    await loadBankAccount()
    if (bankAccount.value) {
      bankForm.value.bank_name = bankAccount.value.bank_name
      bankForm.value.account_no = bankAccount.value.account_no
      bankForm.value.account_name = bankAccount.value.account_name
    }
  } else if (activeTab.value === 'security') {
    passwordForm.value = {
      new_password: '',
      confirm_password: '',
      admin_password: '',
      totp_code: '',
    }
    showNewPass.value = false
    showConfirmPass.value = false
  }
}, { immediate: true })

const close = () => emit('update:open', false)

const handleVerify = async () => {
  if (!props.user) return
  const newVal = !props.user.is_verified
  const ok = await usersStore.verifyUser(props.user.id, newVal)
  if (ok) {
    success(`User ${newVal ? 'verified' : 'unverified'} successfully`)
    emit('updated')
  }
}

const handleUpdateTrust = async () => {
  if (!props.user) return
  const ok = await usersStore.updateTrust(props.user.id, trustInput.value)
  if (ok) {
    success('Trust score updated successfully')
    emit('updated')
  }
}

const handleSuspend = async () => {
  if (!props.user) return
  const newVal = !props.user.is_suspended
  
  if (newVal && !suspendReason.value.trim()) {
    error('Please provide a reason for suspension')
    return
  }

  const ok = await usersStore.suspendUser(props.user.id, newVal, suspendReason.value)
  if (ok) {
    success(`User ${newVal ? 'suspended' : 'unsuspended'} successfully`)
    emit('updated')
  }
}

const handleDisableTotp = async () => {
  if (!props.user) return
  if (confirm(`Yakin ingin menonaktifkan 2FA (TOTP) untuk pengguna ${props.user.name}?`)) {
    const ok = await usersStore.adminDisableTotp(props.user.id)
    if (ok) {
      success(`2FA (TOTP) untuk ${props.user.name} berhasil dinonaktifkan`)
      emit('updated')
    }
  }
}

const handleSubmitBank = async () => {
  if (!props.user) return
  if (!bankForm.value.bank_name || !bankForm.value.account_no || !bankForm.value.account_name || !bankForm.value.admin_password || !bankForm.value.totp_code) {
    error('Mohon lengkapi data rekening beserta Password & Kode TOTP Admin.')
    return
  }

  try {
    const ok = await usersStore.registerUserBankAccount(props.user.id, bankForm.value)
    if (ok) {
      success('Nomor rekening bank pengguna berhasil diperbarui.')
      await loadBankAccount()
      bankForm.value.admin_password = ''
      bankForm.value.totp_code = ''
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string } }
    const msg = errorObj.data?.message || 'Gagal mendaftarkan rekening. Pastikan password & TOTP valid.'
    error(msg)
  }
}

const handleResetPassword = async () => {
  if (!props.user) return
  if (!passwordForm.value.new_password || !passwordForm.value.confirm_password || !passwordForm.value.admin_password || !passwordForm.value.totp_code) {
    error('Mohon lengkapi password baru beserta Password & Kode TOTP Admin.')
    return
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    error('Konfirmasi password tidak cocok.')
    return
  }
  if (passwordForm.value.new_password.length < 8) {
    error('Password baru minimal 8 karakter.')
    return
  }
  if (!confirm(`Yakin ingin mereset password untuk ${props.user.name}? Semua sesi aktif user akan di-logout.`)) {
    return
  }
  try {
    const ok = await usersStore.resetUserPassword(props.user.id, {
      new_password: passwordForm.value.new_password,
      admin_password: passwordForm.value.admin_password,
      totp_code: passwordForm.value.totp_code,
    })
    if (ok) {
      success(`Password ${props.user.name} berhasil direset. Semua sesi user telah di-logout.`)
      passwordForm.value = { new_password: '', confirm_password: '', admin_password: '', totp_code: '' }
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string } }
    const msg = errorObj.data?.message || 'Gagal mereset password. Pastikan password admin & TOTP valid.'
    error(msg)
  }
}

const roleVariant = (role: string) => {
  if (role === ROLE_ADMIN) return 'destructive'
  if (role === ROLE_CS) return 'warning'
  if (role === ROLE_RUNNER) return 'info'
  return 'secondary'
}
</script>

<template>
  <UiModal
    :open="open"
    :title="user?.name || 'User Detail'"
    description="View and manage user details"
    max-width="max-w-xl"
    @update:open="close"
  >
    <div v-if="user" class="space-y-6">
      <!-- Tabs Navigation -->
      <div class="flex border-b border-border mb-4">
        <button
          type="button"
          class="flex-1 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2"
          :class="activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'profile'"
        >
          <User class="w-4 h-4" />
          Profil
        </button>
        <button
          type="button"
          class="flex-1 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2"
          :class="activeTab === 'bank' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'bank'"
        >
          <CreditCard class="w-4 h-4" />
          Rekening
        </button>
        <button
          type="button"
          class="flex-1 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2"
          :class="activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'security'"
        >
          <KeyRound class="w-4 h-4" />
          Keamanan
        </button>
      </div>

      <!-- Tab Content: Profile -->
      <div v-if="activeTab === 'profile'" class="space-y-6">
        <!-- Avatar + Basic Info -->
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
            {{ user.name.substring(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-foreground text-base">{{ user.name }}</p>
            <p class="text-sm text-muted-foreground truncate">{{ user.email }}</p>
            <div class="flex items-center gap-2 mt-1">
              <UiBadge :variant="roleVariant(user.role)">{{ user.role }}</UiBadge>
              <UiBadge :variant="user.is_verified ? 'success' : 'warning'">
                {{ user.is_verified ? 'Verified' : 'Unverified' }}
              </UiBadge>
              <UiBadge v-if="user.is_suspended" variant="destructive">
                Suspended
              </UiBadge>
            </div>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-secondary/40 rounded-lg p-3 border border-border/50">
            <p class="text-xs text-muted-foreground">Trust Score</p>
            <p class="text-2xl font-bold text-foreground mt-0.5">{{ user.trust_score }}</p>
          </div>
          <div class="bg-secondary/40 rounded-lg p-3 border border-border/50">
            <p class="text-xs text-muted-foreground">Member Since</p>
            <p class="text-sm font-semibold text-foreground mt-0.5">
              {{ new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) }}
            </p>
          </div>
        </div>

        <!-- Trust Score Editor -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Update Trust Score</label>
          <div class="flex items-center gap-2">
            <UiInput
              v-model="trustInput"
              type="number"
              placeholder="0-100"
              class="flex-1"
            />
            <UiButton
              variant="secondary"
              :loading="usersStore.actionLoading"
              @click="handleUpdateTrust"
            >
              <Star class="w-4 h-4 mr-1.5" />
              Save
            </UiButton>
          </div>
        </div>

        <!-- Verify Action -->
        <div class="border border-border/50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Account Verification</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ user.is_verified ? 'This account is currently verified.' : 'This account is not yet verified.' }}
            </p>
          </div>
          <UiButton
            :variant="user.is_verified ? 'destructive' : 'primary'"
            size="sm"
            :loading="usersStore.actionLoading"
            @click="handleVerify"
          >
            <ShieldOff v-if="user.is_verified" class="w-4 h-4 mr-1.5" />
            <Shield v-else class="w-4 h-4 mr-1.5" />
            {{ user.is_verified ? 'Unverify' : 'Verify' }}
          </UiButton>
        </div>

        <!-- Suspend Action -->
        <div class="border border-border/50 rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Suspend Account</p>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ user.is_suspended ? 'This user is currently restricted.' : 'Restrict user from making or receiving orders.' }}
              </p>
            </div>
            <UiButton
              :variant="user.is_suspended ? 'secondary' : 'destructive'"
              size="sm"
              :loading="usersStore.actionLoading"
              @click="handleSuspend"
            >
              <ShieldAlert v-if="!user.is_suspended" class="w-4 h-4 mr-1.5" />
              {{ user.is_suspended ? 'Unsuspend' : 'Suspend User' }}
            </UiButton>
          </div>
          
          <div v-if="!user.is_suspended || user.is_suspended" class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {{ user.is_suspended ? 'Suspended Reason' : 'Suspension Reason (Required)' }}
            </label>
            <UiInput
              v-model="suspendReason"
              placeholder="e.g. Unusual activity or payment failure"
              :disabled="user.is_suspended && usersStore.actionLoading"
            />
          </div>
        </div>

        <!-- TOTP Action -->
        <div v-if="user.totp_enabled" class="border border-red-200/50 bg-red-50/30 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-red-700">Nonaktifkan 2FA (TOTP)</p>
            <p class="text-xs text-red-600/80 mt-0.5">
              Gunakan fitur ini jika pengguna kehilangan akses ke aplikasi Authenticator mereka.
            </p>
          </div>
          <UiButton
            variant="destructive"
            size="sm"
            :loading="usersStore.actionLoading"
            @click="handleDisableTotp"
          >
            <ShieldOff class="w-4 h-4 mr-1.5" />
            Matikan 2FA
          </UiButton>
        </div>
      </div>

      <!-- Tab Content: Bank Account -->
      <div v-else-if="activeTab === 'bank'" class="space-y-6">
        <!-- 2FA Verification Constraint Card -->
        <div v-if="!authStore.user?.totp_enabled" class="border border-amber-200/50 bg-amber-50/30 rounded-2xl p-5 space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Lock class="w-5 h-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-amber-800">Autentikasi 2FA Admin Diperlukan</h4>
              <p class="text-xs text-amber-700/80 mt-1 leading-relaxed">
                Untuk melindungi keamanan finansial pengguna, Anda wajib mengaktifkan Autentikasi Dua Langkah (2FA / TOTP) terlebih dahulu pada akun Anda sebelum dapat mendaftarkan atau memperbarui data rekening bank.
              </p>
            </div>
          </div>
          <UiButton
            variant="primary"
            size="sm"
            class="w-full sm:w-auto"
            @click="showSetupTotpModal = true"
          >
            Aktifkan 2FA Sekarang
          </UiButton>
        </div>

        <!-- Bank Account CRUD (Only if Admin TOTP is enabled) -->
        <template v-else>
          <!-- Current Account Status Card -->
          <div class="border border-border/60 bg-slate-50/50 rounded-2xl p-4 space-y-3">
            <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Rekening Terdaftar</h4>
            
            <div v-if="loadingBank" class="py-4 flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span class="text-xs text-muted-foreground">Memeriksa rekening...</span>
            </div>
            
            <div v-else-if="bankAccount" class="space-y-2">
              <div class="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                <span class="text-muted-foreground">Nama Bank:</span>
                <span class="font-bold text-foreground flex items-center gap-1.5">
                  <img 
                    v-if="['BCA', 'MANDIRI', 'BRI', 'DANA', 'OVO'].includes(bankAccount.bank_name.toUpperCase())" 
                    :src="`/images/providers/${bankAccount.bank_name.toLowerCase()}.png`" 
                    class="h-4 object-contain"
                    alt="Logo"
                  >
                  {{ bankAccount.bank_name }}
                </span>
              </div>
              <div class="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                <span class="text-muted-foreground">Nomor Rekening:</span>
                <span class="font-mono font-bold text-foreground select-all">{{ bankAccount.account_no }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Nama Pemilik:</span>
                <span class="font-bold text-foreground">{{ bankAccount.account_name }}</span>
              </div>
            </div>
            
            <div v-else class="py-4 text-center">
              <p class="text-xs font-semibold text-muted-foreground">Pengguna ini belum memiliki rekening terdaftar.</p>
            </div>
          </div>

          <!-- CRUD Form -->
          <form class="space-y-4" @submit.prevent="handleSubmitBank">
            <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1.5">
              {{ bankAccount ? 'Perbarui Informasi Rekening' : 'Daftarkan Rekening Baru' }}
            </h4>
            
            <!-- Bank Name Input -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Nama Bank</label>
              <div class="relative flex items-center">
                <select
                  v-model="bankForm.bank_name"
                  class="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer appearance-none"
                  required
                >
                  <option value="" disabled>Pilih Bank atau E-Wallet</option>
                  <option value="BCA">BCA</option>
                  <option value="MANDIRI">Mandiri</option>
                  <option value="BRI">BRI</option>
                  <option value="DANA">Dana (E-Wallet)</option>
                  <option value="OVO">Ovo (E-Wallet)</option>
                </select>
                <div class="pointer-events-none absolute right-3 flex items-center text-muted-foreground">
                  <svg class="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            <!-- Selected Bank Info (Logo & Biaya Admin) -->
            <div v-if="bankForm.bank_name" class="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-border/60 animate-in fade-in duration-200">
              <img 
                :src="`/images/providers/${bankForm.bank_name.toLowerCase()}.png`" 
                class="w-10 h-10 object-contain p-1.5 bg-white rounded-lg border border-border/50"
                alt="Logo Provider"
              >
              <div class="text-xs space-y-0.5">
                <p class="font-bold text-foreground">Metode Terpilih: {{ bankForm.bank_name }}</p>
                <p v-if="['DANA', 'OVO'].includes(bankForm.bank_name.toUpperCase())" class="text-amber-600 font-semibold">
                  * Biaya admin penarikan: Rp 1.000 (Dikenakan potongan sesuai kebijakan e-wallet)
                </p>
                <p v-else-if="['BCA', 'MANDIRI'].includes(bankForm.bank_name.toUpperCase())" class="text-emerald-600 font-semibold">
                  * Biaya admin penarikan: Gratis (Rp 0)
                </p>
                <p v-else class="text-slate-500 font-semibold">
                  * Biaya admin penarikan: Rp 2.500 (Dikenakan potongan sesuai kebijakan bank)
                </p>
              </div>
            </div>

            <!-- Account Number Input -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Nomor Rekening</label>
              <UiInput
                v-model="bankForm.account_no"
                type="text"
                placeholder="Masukkan nomor rekening"
                required
              />
            </div>

            <!-- Account Name Input -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Nama Pemilik Rekening</label>
              <UiInput
                v-model="bankForm.account_name"
                type="text"
                placeholder="Nama lengkap di buku tabungan"
                required
              />
            </div>

            <!-- Otorisasi Keamanan Admin -->
            <div class="border border-red-200/50 bg-red-50/10 rounded-2xl p-4 space-y-3.5">
              <h5 class="text-xs font-bold text-red-700 flex items-center gap-1.5">
                <Lock class="w-3.5 h-3.5" />
                Otorisasi Keamanan Admin
              </h5>
              <p class="text-[10px] text-red-600/80 leading-relaxed">
                Demi melindungi integritas data finansial, tindakan ini memerlukan otorisasi sandi dan kode OTP pribadi Anda.
              </p>

              <!-- Password Admin -->
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-red-700 uppercase">Kata Sandi Anda (Admin)</label>
                <UiInput
                  v-model="bankForm.admin_password"
                  type="password"
                  placeholder="Masukkan kata sandi admin Anda"
                  required
                  class="border-red-200 focus:ring-red-400 bg-background"
                />
              </div>

              <!-- TOTP Code Admin -->
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-red-700 uppercase">Kode TOTP Admin</label>
                <UiInput
                  v-model="bankForm.totp_code"
                  type="text"
                  maxlength="6"
                  placeholder="123456"
                  required
                  class="border-red-200 focus:ring-red-400 bg-background font-mono text-center tracking-[0.2em]"
                />
              </div>
            </div>

            <UiButton
              type="submit"
              variant="primary"
              class="w-full"
              :loading="usersStore.actionLoading"
            >
              {{ bankAccount ? 'Simpan Perubahan Rekening' : 'Daftarkan Rekening' }}
            </UiButton>
          </form>
        </template>
      </div>

      <!-- Tab Content: Security - Reset Password -->
      <div v-else-if="activeTab === 'security'" class="space-y-6">
        <!-- 2FA Verification Constraint Card -->
        <div v-if="!authStore.user?.totp_enabled" class="border border-amber-200/50 bg-amber-50/30 rounded-2xl p-5 space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Lock class="w-5 h-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-amber-800">Autentikasi 2FA Admin Diperlukan</h4>
              <p class="text-xs text-amber-700/80 mt-1 leading-relaxed">
                Untuk keamanan, Anda wajib mengaktifkan 2FA (TOTP) terlebih dahulu sebelum dapat mereset password pengguna.
              </p>
            </div>
          </div>
          <UiButton
            variant="primary"
            size="sm"
            class="w-full sm:w-auto"
            @click="showSetupTotpModal = true"
          >
            Aktifkan 2FA Sekarang
          </UiButton>
        </div>

        <template v-else>
          <div class="border border-amber-200/50 bg-amber-50/20 rounded-xl p-3">
            <p class="text-[11px] text-amber-800 leading-relaxed">
              ⚠️ Aksi ini akan <b>mereset password</b> user <b>{{ user.name }}</b> dan otomatis <b>logout semua sesi aktif</b> user tersebut. Berikan password baru ke user secara aman (offline).
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleResetPassword">
            <!-- New Password -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Password Baru (min 8 karakter)</label>
              <div class="relative">
                <UiInput
                  v-model="passwordForm.new_password"
                  :type="showNewPass ? 'text' : 'password'"
                  placeholder="Password baru untuk user"
                  required
                  class="pr-9"
                />
                <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" @click="showNewPass = !showNewPass">
                  <EyeOff v-if="showNewPass" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Confirm -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Konfirmasi Password Baru</label>
              <div class="relative">
                <UiInput
                  v-model="passwordForm.confirm_password"
                  :type="showConfirmPass ? 'text' : 'password'"
                  placeholder="Ulangi password baru"
                  required
                  class="pr-9"
                />
                <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" @click="showConfirmPass = !showConfirmPass">
                  <EyeOff v-if="showConfirmPass" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Otorisasi -->
            <div class="border border-red-200/50 bg-red-50/10 rounded-2xl p-4 space-y-3.5">
              <h5 class="text-xs font-bold text-red-700 flex items-center gap-1.5">
                <Lock class="w-3.5 h-3.5" />
                Otorisasi Keamanan Admin
              </h5>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-red-700 uppercase">Kata Sandi Anda (Admin)</label>
                <UiInput
                  v-model="passwordForm.admin_password"
                  type="password"
                  placeholder="Kata sandi admin Anda"
                  required
                  class="border-red-200 focus:ring-red-400 bg-background"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-red-700 uppercase">Kode TOTP Admin</label>
                <UiInput
                  v-model="passwordForm.totp_code"
                  type="text"
                  maxlength="6"
                  placeholder="123456"
                  required
                  class="border-red-200 focus:ring-red-400 bg-background font-mono text-center tracking-[0.2em]"
                />
              </div>
            </div>

            <UiButton type="submit" variant="destructive" class="w-full" :loading="usersStore.actionLoading">
              <KeyRound class="w-4 h-4 mr-2" />
              Reset Password User
            </UiButton>
          </form>
        </template>
      </div>
    </div>

    <!-- Admin Setup TOTP Modal Shortcut -->
    <AdminTotpModal v-model="showSetupTotpModal" />

    <template #footer>
      <UiButton variant="ghost" class="w-full" @click="close">Close</UiButton>
    </template>
  </UiModal>
</template>
