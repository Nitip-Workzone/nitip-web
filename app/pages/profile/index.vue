<script setup lang="ts">
import { LogOut, ChevronRight, Lock, ShieldCheck, Mail, Phone, UserCheck, KeySquare, HelpCircle } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'
import { useUserOrdersStore } from '~/stores/user-orders'
import { useUserWalletStore } from '~/stores/user-wallet'

definePageMeta({
  layout: 'user',
})

const authStore = useAuthStore()
const toastStore = useToastStore()
const ordersStore = useUserOrdersStore()
const walletStore = useUserWalletStore()
const { request } = useApi()

const isEditing = ref(false)
const editName = ref('')
const editWhatsapp = ref('')
const saving = ref(false)
const loading = ref(true)

// Modals state
const showPinModal = ref(false)
const isSetupFlow = ref(true) // true for Setup PIN, false for Change PIN
const pinValue1 = ref('')
const pinValue2 = ref('') // Used as new_pin in Change PIN flow
const pinError = ref('')
const pinSubmitting = ref(false)

onMounted(async () => {
  await Promise.all([
    authStore.fetchProfile(),
    ordersStore.fetchMyOrders(),
    walletStore.fetchBalance(),
  ])
  editName.value = authStore.user?.name || ''
  editWhatsapp.value = authStore.user?.whatsapp_number || ''
  loading.value = false
})

const totalOrders = computed(() => {
  return (ordersStore.activeOrders?.length || 0) + (ordersStore.pastOrders?.length || 0)
})

async function saveProfile() {
  saving.value = true
  try {
    const formData = new FormData()
    formData.append('name', editName.value)
    formData.append('whatsapp_number', editWhatsapp.value)
    await request('/users/profile', {
      method: 'PUT',
      body: formData,
    })
    await authStore.fetchProfile(true)
    isEditing.value = false
    toastStore.add('Profil berhasil diperbarui!')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string } }
    toastStore.add(err.data?.message || 'Gagal menyimpan profil.')
  } finally {
    saving.value = false
  }
}

function handleLogout() {
  authStore.logout()
  toastStore.add('Berhasil keluar dari akun')
}

const openPinModal = (setupMode: boolean) => {
  isSetupFlow.value = setupMode
  pinValue1.value = ''
  pinValue2.value = ''
  pinError.value = ''
  showPinModal.value = true
}

const handlePinSubmit = async () => {
  pinError.value = ''

  if (isSetupFlow.value) {
    if (pinValue1.value.length !== 6 || !/^\d+$/.test(pinValue1.value)) {
      pinError.value = 'PIN harus 6 digit angka'
      return
    }
    pinSubmitting.value = true
    try {
      await authStore.setupPin(pinValue1.value)
      toastStore.add('PIN Keamanan berhasil diatur!')
      showPinModal.value = false
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } }
      pinError.value = err.data?.message || 'Gagal mengatur PIN'
    } finally {
      pinSubmitting.value = false
    }
  } else {
    if (pinValue1.value.length !== 6 || !/^\d+$/.test(pinValue1.value)) {
      pinError.value = 'PIN lama harus 6 digit angka'
      return
    }
    if (pinValue2.value.length !== 6 || !/^\d+$/.test(pinValue2.value)) {
      pinError.value = 'PIN baru harus 6 digit angka'
      return
    }
    if (pinValue1.value === pinValue2.value) {
      pinError.value = 'PIN baru tidak boleh sama dengan PIN lama'
      return
    }
    pinSubmitting.value = true
    try {
      await authStore.changePin(pinValue1.value, pinValue2.value)
      toastStore.add('PIN Keamanan berhasil diubah!')
      showPinModal.value = false
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } }
      pinError.value = err.data?.message || 'Gagal mengubah PIN'
    } finally {
      pinSubmitting.value = false
    }
  }
}

// TOTP Modals state
const showTotpModal = ref(false)
const totpStep = ref(1) // 1: Info/QR, 2: Verification, 3: Disable
const qrBase64 = ref('')
const totpSecret = ref('')
const totpCode = ref('')
const totpError = ref('')
const totpSubmitting = ref(false)

const openTotpModal = async (isDisableFlow = false) => {
  totpError.value = ''
  totpCode.value = ''
  
  if (isDisableFlow) {
    totpStep.value = 3
    showTotpModal.value = true
  } else {
    try {
      const data = await authStore.setupTotp()
      qrBase64.value = data?.qr_base64 || ''
      totpSecret.value = data?.secret || ''
      totpStep.value = 1
      showTotpModal.value = true
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      toastStore.add(err.data?.message || 'Gagal memulai setup TOTP')
    }
  }
}

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
      showTotpModal.value = false
      authStore.logout()
    } else if (totpStep.value === 3) {
      await authStore.disableTotp(totpCode.value)
      toastStore.add('Autentikasi 2-Langkah dinonaktifkan! Silakan login kembali.')
      showTotpModal.value = false
      authStore.logout()
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string } }
    totpError.value = err.data?.message || 'Kode TOTP tidak valid'
  } finally {
    totpSubmitting.value = false
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
}

const openLink = (url: string) => {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50">
    <!-- Ambient top glow -->
    <div class="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

    <div class="relative z-10 max-w-md mx-auto px-5 pt-5 pb-24 space-y-6">
      <!-- Title -->
      <h1 class="text-lg font-black text-slate-900 tracking-tight pl-0.5">Profil Saya</h1>

      <!-- Loading Skeleton -->
      <div v-if="loading" class="space-y-4">
        <div class="bg-white border border-slate-100 rounded-3xl p-6 animate-pulse flex items-center gap-4 shadow-soft">
          <div class="w-16 h-16 bg-slate-100 rounded-full" />
          <div class="flex-1 space-y-2">
            <div class="h-4.5 bg-slate-100 rounded w-1/2" />
            <div class="h-3.5 bg-slate-100 rounded w-3/4" />
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Profile Card -->
        <div class="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-soft space-y-5">
          <div v-if="!isEditing" class="space-y-4">
            <div class="flex items-center gap-4">
              <!-- Avatar Circle -->
              <div class="w-16 h-16 bg-primary/10 text-primary text-2xl font-black rounded-full flex items-center justify-center border-2 border-primary/20 shadow-inner">
                {{ authStore.user?.name?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h2 class="text-base font-extrabold text-slate-900 leading-tight truncate">
                    {{ authStore.user?.name }}
                  </h2>
                  <ShieldCheck v-if="authStore.user?.is_verified" class="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                </div>
                
                <p class="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                  <Mail class="w-3.5 h-3.5 text-slate-400" />
                  {{ authStore.user?.email }}
                </p>

                <p v-if="authStore.user?.whatsapp_number" class="text-xs text-slate-400 truncate mt-1 flex items-center gap-1">
                  <Phone class="w-3.5 h-3.5 text-slate-400" />
                  {{ authStore.user?.whatsapp_number }}
                </p>
              </div>
            </div>

            <!-- Edit Action -->
            <button
              class="w-full h-11 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-sm"
              @click="isEditing = true"
            >
              Edit Profil
            </button>
          </div>

          <!-- Edit Profile Form -->
          <form v-else class="space-y-4" @submit.prevent="saveProfile">
            <h3 class="text-sm font-extrabold text-slate-800">Edit Data Diri</h3>
            
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-600">Nama Lengkap</label>
              <input 
                v-model="editName" 
                type="text" 
                class="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs font-semibold focus:outline-none focus:border-primary/50 bg-slate-50/50 focus:bg-white transition-all"
                placeholder="Nama Lengkap" 
              >
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-bold text-slate-600">Nomor WhatsApp</label>
              <input 
                v-model="editWhatsapp" 
                type="tel" 
                class="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs font-semibold focus:outline-none focus:border-primary/50 bg-slate-50/50 focus:bg-white transition-all"
                placeholder="Contoh: 081234567890" 
              >
            </div>

            <div class="flex gap-2.5 pt-2">
              <button
                type="button"
                class="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl active:scale-[0.98] transition-all"
                @click="isEditing = false"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex-1 h-11 bg-primary text-white font-bold text-xs rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20"
              >
                <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Simpan
              </button>
            </div>
          </form>
        </div>

        <!-- Stats (Aligned with Flutter) -->
        <div class="bg-white border border-slate-100 rounded-3xl p-4 shadow-soft grid grid-cols-3 divide-x divide-slate-100">
          <div class="text-center space-y-1">
            <p class="text-lg font-black text-slate-900 leading-none">{{ totalOrders }}</p>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total Order</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-lg font-black text-slate-900 leading-none">{{ authStore.user?.trust_score || 0 }}%</p>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Kepercayaan</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-[13px] font-black text-slate-900 truncate px-1 leading-[1.3]">{{ formatCurrency(walletStore.balance) }}</p>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">Dompet</p>
          </div>
        </div>

        <!-- Settings Section -->
        <div class="space-y-3">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Keamanan Dompet</p>
          
          <div class="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-soft divide-y divide-slate-100">
            <!-- Setup PIN / Change PIN menu item -->
            <button
              v-if="!authStore.user?.has_pin"
              class="flex items-center justify-between px-5 py-4 w-full text-left hover:bg-slate-50 transition-colors group"
              @click="openPinModal(true)"
            >
              <div class="flex items-center gap-3.5">
                <div class="p-2.5 rounded-xl bg-amber-50 text-amber-500 border border-amber-200/50">
                  <Lock class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs font-bold text-slate-800">Atur PIN Transaksi</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">Amankan penarikan dana &amp; pembayaran escrow</p>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              v-else
              class="flex items-center justify-between px-5 py-4 w-full text-left hover:bg-slate-50 transition-colors group"
              @click="openPinModal(false)"
            >
              <div class="flex items-center gap-3.5">
                <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-200/50">
                  <KeySquare class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs font-bold text-slate-800">Ubah PIN Transaksi</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">Perbarui 6-digit PIN keamanan Anda berkala</p>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <!-- Verification Info / KYB Status link if needed -->
            <div class="flex items-center justify-between px-5 py-4 w-full text-left text-slate-500">
              <div class="flex items-center gap-3.5">
                <div class="p-2.5 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-200/50">
                  <UserCheck class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs font-bold text-slate-800">Verifikasi Identitas</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    {{ authStore.user?.is_verified ? 'Selesai diverifikasi oleh sistem' : 'Hubungi admin untuk verifikasi KYC' }}
                  </p>
                </div>
              </div>
              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md" :class="authStore.user?.is_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
                {{ authStore.user?.is_verified ? 'Verified' : 'Pending' }}
              </span>
            </div>

            <!-- TOTP Menu Item -->
            <button
              v-if="authStore.user?.role === 'admin' && !authStore.user?.totp_enabled"
              class="flex items-center justify-between px-5 py-4 w-full text-left hover:bg-slate-50 transition-colors group"
              @click="openTotpModal(false)"
            >
              <div class="flex items-center gap-3.5">
                <div class="p-2.5 rounded-xl bg-blue-50 text-blue-500 border border-blue-200/50">
                  <ShieldCheck class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs font-bold text-slate-800">Otentikasi 2-Langkah (TOTP)</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">Tingkatkan keamanan akun dengan Authenticator</p>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              v-else-if="authStore.user?.role === 'admin' && authStore.user?.totp_enabled"
              class="flex items-center justify-between px-5 py-4 w-full text-left hover:bg-slate-50 transition-colors group"
              @click="openTotpModal(true)"
            >
              <div class="flex items-center gap-3.5">
                <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-200/50">
                  <ShieldCheck class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs font-bold text-slate-800">TOTP Aktif</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">Ketuk untuk menonaktifkan fitur ini</p>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        <!-- Help Section -->
        <div class="space-y-3">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Dukungan</p>
          <div class="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-soft">
            <button
              class="flex items-center justify-between px-5 py-4 w-full text-left hover:bg-slate-50 transition-colors group"
              @click="openLink('https://wa.me/628123456789')"
            >
              <div class="flex items-center gap-3.5">
                <div class="p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-200/50">
                  <HelpCircle class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-xs font-bold text-slate-800">Hubungi CS WhatsApp</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">Pertanyaan, bantuan kendala &amp; verifikasi KYC</p>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        <!-- Logout Section -->
        <div class="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-soft">
          <button
            class="flex items-center gap-3.5 px-5 py-4 w-full hover:bg-red-50/50 transition-colors text-red-600 group"
            @click="handleLogout"
          >
            <div class="p-2.5 rounded-xl bg-red-50 text-red-500 border border-red-200/20 group-hover:bg-red-100 transition-colors">
              <LogOut class="w-5 h-5" />
            </div>
            <span class="text-xs font-bold">Keluar Akun</span>
          </button>
        </div>
      </template>

    </div><!-- end inner container -->

    <!-- ── SETUP & CHANGE PIN MODAL ── -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showPinModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="showPinModal = false">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-5 duration-300">
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

          <div class="text-center">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" :class="isSetupFlow ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'">
              <Lock v-if="isSetupFlow" class="w-5 h-5" />
              <KeySquare v-else class="w-5 h-5" />
            </div>
            <h3 class="text-base font-extrabold text-slate-900">
              {{ isSetupFlow ? 'Atur PIN Keamanan' : 'Ubah PIN Keamanan' }}
            </h3>
            <p class="text-xs text-slate-400 mt-1">
              {{ isSetupFlow ? 'Gunakan 6-digit angka rahasia untuk otorisasi dana' : 'Masukkan PIN lama dan PIN baru Anda' }}
            </p>
          </div>

          <!-- PIN input fields -->
          <div class="space-y-4">
            <!-- Setup Flow: just one input -->
            <div v-if="isSetupFlow" class="space-y-1.5">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Masukkan PIN Baru (6 digit)</label>
              <input
                v-model="pinValue1"
                type="password"
                maxlength="6"
                placeholder="••••••"
                class="w-full h-11 text-center text-lg font-bold tracking-[0.5em] rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:tracking-normal"
              >
            </div>

            <!-- Change Flow: old and new input -->
            <div v-else class="space-y-3">
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">PIN Lama Anda (6 digit)</label>
                <input
                  v-model="pinValue1"
                  type="password"
                  maxlength="6"
                  placeholder="••••••"
                  class="w-full h-11 text-center text-lg font-bold tracking-[0.5em] rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:tracking-normal"
                >
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">PIN Baru Anda (6 digit)</label>
                <input
                  v-model="pinValue2"
                  type="password"
                  maxlength="6"
                  placeholder="••••••"
                  class="w-full h-11 text-center text-lg font-bold tracking-[0.5em] rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:tracking-normal"
                >
              </div>
            </div>

            <p v-if="pinError" class="text-center text-xs font-semibold text-rose-500">{{ pinError }}</p>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-3 pt-1">
            <button
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
              @click="showPinModal = false"
            >
              Batal
            </button>
            <button
              :disabled="pinSubmitting"
              class="flex-1 bg-primary text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-sm shadow-primary/30"
              @click="handlePinSubmit"
            >
              <span v-if="pinSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Simpan PIN
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── TOTP MODAL ── -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showTotpModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="showTotpModal = false">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-5 duration-300">
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

          <!-- Step 1: Info & QR Code -->
          <div v-if="totpStep === 1" class="text-center space-y-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-blue-50 text-blue-500">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900">Setup Authenticator</h3>
              <p class="text-xs text-slate-500 mt-1">Scan QR Code ini menggunakan aplikasi Google Authenticator atau Authy.</p>
            </div>
            
            <div class="bg-slate-50 p-4 rounded-2xl flex items-center justify-center border border-slate-100">
              <img v-if="qrBase64" :src="qrBase64" alt="TOTP QR Code" class="w-40 h-40 object-contain rounded-xl mix-blend-multiply">
              <div v-else class="w-40 h-40 flex items-center justify-center border border-dashed rounded-xl border-slate-300">
                <span class="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              </div>
            </div>

            <div class="text-left bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <p class="text-[10px] font-bold text-blue-600 mb-1">Tidak bisa scan QR?</p>
              <p class="text-xs text-slate-700 font-mono break-all select-all">{{ totpSecret }}</p>
            </div>

            <button
              class="w-full bg-primary text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-sm shadow-primary/30 active:scale-95 transition-all"
              @click="totpStep = 2"
            >
              Lanjutkan
            </button>
          </div>

          <!-- Step 2/3: Verification Input -->
          <div v-if="totpStep === 2 || totpStep === 3" class="space-y-4">
            <div class="text-center">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" :class="totpStep === 2 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'">
                <ShieldCheck class="w-5 h-5" />
              </div>
              <h3 class="text-base font-extrabold text-slate-900">
                {{ totpStep === 2 ? 'Verifikasi Kode' : 'Nonaktifkan 2FA' }}
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                Masukkan 6-digit kode dari aplikasi Authenticator Anda.
              </p>
            </div>

            <div class="space-y-1.5">
              <input
                v-model="totpCode"
                type="text"
                maxlength="6"
                placeholder="123456"
                class="w-full h-12 text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:tracking-normal placeholder:font-normal"
              >
            </div>

            <p v-if="totpError" class="text-center text-xs font-semibold text-rose-500">{{ totpError }}</p>

            <div class="flex items-center gap-3 pt-1">
              <button
                class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3.5 px-4 rounded-xl transition-all active:scale-95"
                @click="totpStep === 2 ? totpStep = 1 : showTotpModal = false"
              >
                Kembali
              </button>
              <button
                :disabled="totpSubmitting"
                class="flex-1 text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-sm"
                :class="totpStep === 2 ? 'bg-primary shadow-primary/30' : 'bg-red-500 shadow-red-500/30'"
                @click="handleTotpSubmit"
              >
                <span v-if="totpSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {{ totpStep === 2 ? 'Konfirmasi' : 'Matikan 2FA' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>

  </div>
</template>