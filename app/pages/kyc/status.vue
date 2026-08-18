<script setup lang="ts">
import { Clock, ShieldAlert, ArrowLeft, RefreshCcw, ShieldCheck } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'default',
})

const router = useRouter()
const { request } = useApi()
const authStore = useAuthStore()

const loading = ref(true)
const kycStatus = ref<string>('none')
const adminNote = ref<string>('')

onMounted(async () => {
  if (authStore.user?.is_verified) {
    kycStatus.value = 'approved'
    loading.value = false
    return
  }
  
  try {
    const res = await request<{ data: { status: string, admin_note?: string } }>('/kyc/me')
    if (res.data?.status) {
      kycStatus.value = res.data.status
      if (res.data.admin_note) {
        adminNote.value = res.data.admin_note
      }
    } else {
      kycStatus.value = 'none'
    }
  } catch {
    kycStatus.value = 'none'
  } finally {
    loading.value = false
  }
})

// Back harus step back, bukan ke home — agar dari keranjang belanja → KYC → back balik ke keranjang (sesuai request)
const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}
const goHome = () => goBack()
const retryKyc = () => router.push('/kyc')
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col max-w-md mx-auto">
    <!-- AppBar — back step back bukan home -->
    <div class="flex items-center px-4 h-14 mt-6">
      <button
        class="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-800"
        @click="goBack"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h2 class="text-sm font-bold text-slate-900 ml-2">Status Verifikasi</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center space-y-4">
      <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p class="text-xs font-semibold text-slate-500 animate-pulse">Memeriksa status...</p>
    </div>

    <!-- Pending -->
    <div v-else-if="kycStatus === 'pending'" class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="w-28 h-28 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center mb-8">
        <Clock class="w-14 h-14 text-amber-500 animate-pulse" />
      </div>
      <h2 class="text-[22px] font-extrabold text-slate-900 leading-tight mb-3">Verifikasi Sedang Diproses</h2>
      <p class="text-sm text-slate-500 leading-relaxed max-w-xs">
        Terima kasih telah melengkapi data identitas. Admin kami sedang meninjau dokumen Anda. Proses ini biasanya memakan waktu 1×24 jam.
      </p>
      <div class="mt-8 w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
        <h3 class="text-sm font-bold text-slate-800">Apa selanjutnya?</h3>
        <div class="flex items-start gap-3">
          <div class="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
          <p class="text-xs text-slate-600 leading-relaxed">Anda akan menerima notifikasi jika verifikasi disetujui.</p>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
          <p class="text-xs text-slate-600 leading-relaxed">Lencana terverifikasi akan otomatis muncul di profil Anda.</p>
        </div>
      </div>
    </div>

    <!-- Rejected -->
    <div v-else-if="kycStatus === 'rejected'" class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="w-28 h-28 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mb-8">
        <ShieldAlert class="w-14 h-14 text-red-500" />
      </div>
      <h2 class="text-[22px] font-extrabold text-slate-900 leading-tight mb-3">Verifikasi Ditolak</h2>
      <p class="text-sm text-slate-500 leading-relaxed max-w-xs mb-6">
        Mohon maaf, dokumen verifikasi Anda tidak memenuhi syarat kami. Silakan perbaiki dan ajukan ulang.
      </p>
      
      <div v-if="adminNote" class="w-full p-4 bg-red-50 border border-red-200 rounded-2xl text-left mb-6">
        <p class="text-[10px] font-bold text-red-800 uppercase tracking-wide mb-2">Alasan Penolakan</p>
        <p class="text-sm font-medium text-red-700 leading-relaxed">{{ adminNote }}</p>
      </div>
    </div>

    <!-- Approved -->
    <div v-else-if="kycStatus === 'approved'" class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="w-28 h-28 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-8">
        <ShieldCheck class="w-14 h-14 text-emerald-500" />
      </div>
      <h2 class="text-[22px] font-extrabold text-slate-900 leading-tight mb-3">Akun Terverifikasi!</h2>
      <p class="text-sm text-slate-500 leading-relaxed max-w-xs">
        Selamat! Identitas Anda telah terverifikasi. Anda kini dapat menikmati seluruh fitur Nitip.
      </p>
    </div>

    <!-- Unknown / None -->
    <div v-else class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="w-28 h-28 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center mb-8">
        <ShieldAlert class="w-14 h-14 text-slate-400" />
      </div>
      <h2 class="text-[22px] font-extrabold text-slate-900 leading-tight mb-3">Belum Ada Pengajuan</h2>
      <p class="text-sm text-slate-500 leading-relaxed max-w-xs">
        Anda belum mengajukan verifikasi identitas. Mulai sekarang untuk membuka akses penuh Nitip.
      </p>
    </div>

    <!-- Bottom CTA -->
    <div v-if="!loading" class="px-6 pt-4 pb-10 bg-white shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)] border-t border-slate-100">
      <button
        v-if="kycStatus === 'approved'"
        disabled
        class="w-full h-14 rounded-2xl font-bold text-base bg-emerald-100 text-emerald-700"
      >
        Sudah Terverifikasi ✓
      </button>
      <button
        v-else-if="kycStatus === 'pending'"
        class="w-full h-14 rounded-2xl font-bold text-base bg-slate-100 text-slate-600 active:scale-[0.98] transition-all"
        @click="goBack"
      >
        Kembali
      </button>
      <button
        v-else
        class="w-full h-14 rounded-2xl font-bold text-base bg-primary text-white shadow-sm shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        @click="retryKyc"
      >
        <RefreshCcw v-if="kycStatus === 'rejected'" class="w-5 h-5" />
        {{ kycStatus === 'rejected' ? 'Ajukan Ulang Verifikasi' : 'Mulai Verifikasi' }}
      </button>
    </div>
  </div>
</template>
