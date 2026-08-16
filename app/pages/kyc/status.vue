<script setup lang="ts">
import { Clock, ShieldAlert, ArrowLeft, RefreshCcw } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'user',
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

const goHome = () => {
  router.push('/dashboard')
}

const retryKyc = () => {
  router.push('/kyc')
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50 flex flex-col">
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div class="flex items-center px-4 h-14">
        <button 
          class="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
          @click="goHome"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-sm font-extrabold text-slate-900 ml-2">Status Verifikasi</h1>
      </div>
    </div>

    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center space-y-4">
      <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p class="text-xs font-semibold text-slate-500 animate-pulse">Memeriksa status...</p>
    </div>

    <div v-else-if="kycStatus === 'pending'" class="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-sm mx-auto">
      <div class="w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center mb-6">
        <Clock class="w-10 h-10 text-amber-500 animate-pulse" />
      </div>
      <h2 class="text-xl font-black text-slate-900 leading-tight mb-3">Verifikasi Sedang Diproses</h2>
      <p class="text-sm text-slate-500 leading-relaxed">
        Terima kasih telah melengkapi data identitas. Admin kami sedang meninjau dokumen Anda. Proses ini biasanya memakan waktu 1x24 jam.
      </p>
      <div class="mt-8 w-full p-4 bg-white border border-slate-200 rounded-2xl shadow-soft text-left space-y-2">
        <h3 class="text-xs font-bold text-slate-800">Apa selanjutnya?</h3>
        <ul class="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4">
          <li>Anda akan menerima notifikasi jika verifikasi disetujui.</li>
          <li>Lencana terverifikasi akan otomatis muncul di profil Anda.</li>
        </ul>
      </div>
    </div>

    <div v-else-if="kycStatus === 'rejected'" class="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-sm mx-auto">
      <div class="w-24 h-24 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mb-6">
        <ShieldAlert class="w-10 h-10 text-red-500" />
      </div>
      <h2 class="text-xl font-black text-slate-900 leading-tight mb-3">Verifikasi Ditolak</h2>
      <p class="text-sm text-slate-500 leading-relaxed mb-6">
        Mohon maaf, dokumen verifikasi Anda tidak memenuhi syarat kami. Silakan perbaiki dan ajukan ulang.
      </p>
      
      <div v-if="adminNote" class="w-full p-4 bg-red-50 border border-red-200 rounded-2xl text-left mb-6">
        <p class="text-[10px] font-bold text-red-800 uppercase tracking-wide mb-1">Alasan Penolakan</p>
        <p class="text-xs font-medium text-red-700 leading-relaxed">{{ adminNote }}</p>
      </div>

      <button
        class="w-full h-12 rounded-xl font-bold text-sm bg-primary text-white shadow-sm shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        @click="retryKyc"
      >
        <RefreshCcw class="w-4 h-4" />
        Ajukan Ulang Verifikasi
      </button>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-sm mx-auto">
      <div class="w-24 h-24 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center mb-6">
        <ShieldAlert class="w-10 h-10 text-slate-400" />
      </div>
      <h2 class="text-xl font-black text-slate-900 leading-tight mb-3">Status Tidak Diketahui</h2>
      <p class="text-sm text-slate-500 leading-relaxed mb-6">
        Anda belum mengajukan verifikasi atau sudah terverifikasi secara penuh.
      </p>
      <button
        class="w-full h-12 rounded-xl font-bold text-sm bg-primary text-white shadow-sm shadow-primary/30 active:scale-[0.98] transition-all"
        @click="goHome"
      >
        Kembali ke Beranda
      </button>
    </div>
  </div>
</template>
