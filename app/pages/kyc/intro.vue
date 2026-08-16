<script setup lang="ts">
import { Shield, CheckCircle, Zap, ShieldCheck, ChevronLeft, CreditCard, Smile, FileCheck } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'user',
})

const authStore = useAuthStore()
const router = useRouter()
const { request } = useApi()

const kycStatus = ref<string>('none')
const loading = ref(true)

onMounted(async () => {
  if (authStore.user?.is_verified) {
    kycStatus.value = 'approved'
    loading.value = false
    return
  }
  
  try {
    const res = await request<{ data: { status: string } }>('/kyc/me')
    if (res.data?.status) {
      kycStatus.value = res.data.status
    }
  } catch {
    // 404 or no submission means 'none'
    kycStatus.value = 'none'
  } finally {
    loading.value = false
  }
})

const proceedToForm = () => {
  if (kycStatus.value === 'pending') {
    router.push('/kyc/status')
  } else {
    router.push('/kyc')
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-white">
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div class="flex items-center justify-between px-4 h-14">
        <button 
          class="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
          @click="router.back()"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <h1 class="text-sm font-extrabold text-slate-900">Verifikasi Identitas</h1>
        <div class="w-9" />
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p class="text-xs font-semibold text-slate-500 animate-pulse">Memuat data...</p>
    </div>

    <div v-else class="px-5 pt-8 pb-32 max-w-md mx-auto space-y-8">
      <div class="text-center space-y-3">
        <div class="w-24 h-24 mx-auto bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6">
          <ShieldCheck class="w-12 h-12 text-primary" />
        </div>
        <h2 class="text-xl font-black text-slate-900 leading-tight">Mulai Verifikasi</h2>
        <p class="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
          Selesaikan verifikasi e-KYC untuk menikmati semua fitur Nitip secara penuh dan aman.
        </p>
      </div>

      <!-- Step Indicators -->
      <div class="flex items-center justify-center max-w-xs mx-auto pt-2">
        <div class="flex flex-col items-center gap-1.5">
          <div class="w-10 h-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary">
            <CreditCard class="w-4.5 h-4.5" />
          </div>
          <span class="text-[10px] font-bold text-slate-600">Info Profil</span>
        </div>
        <div class="flex-1 h-0.5 bg-primary/20 -mt-5 mx-2" />
        <div class="flex flex-col items-center gap-1.5">
          <div class="w-10 h-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary">
            <Smile class="w-4.5 h-4.5" />
          </div>
          <span class="text-[10px] font-bold text-slate-600">Selfie</span>
        </div>
        <div class="flex-1 h-0.5 bg-primary/20 -mt-5 mx-2" />
        <div class="flex flex-col items-center gap-1.5">
          <div class="w-10 h-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary">
            <FileCheck class="w-4.5 h-4.5" />
          </div>
          <span class="text-[10px] font-bold text-slate-600">Selesai</span>
        </div>
      </div>

      <!-- Benefits -->
      <div class="space-y-3 mt-8">
        <div class="bg-primary/5 rounded-2xl p-4 flex gap-4 border border-primary/10">
          <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Shield class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-900">Data Anda Aman</h4>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">Seluruh data identitas dienkripsi dan hanya digunakan untuk keperluan verifikasi.</p>
          </div>
        </div>
        <div class="bg-primary/5 rounded-2xl p-4 flex gap-4 border border-primary/10">
          <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Zap class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-900">Batas Transaksi Lebih Besar</h4>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">Simpan saldo Nitip Pay lebih banyak dan buka batas maksimum transaksi harian.</p>
          </div>
        </div>
        <div class="bg-primary/5 rounded-2xl p-4 flex gap-4 border border-primary/10">
          <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <CheckCircle class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-900">Lencana Terverifikasi</h4>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">Dapatkan badge centang hijau untuk meningkatkan kepercayaan di komunitas.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Action -->
    <div v-if="!loading" class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-5 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40 max-w-md mx-auto">
      <button
        v-if="kycStatus === 'approved'"
        disabled
        class="w-full h-12 rounded-xl font-bold text-sm bg-emerald-100 text-emerald-700 opacity-100"
      >
        Sudah Terverifikasi
      </button>
      <button
        v-else
        class="w-full h-12 rounded-xl font-bold text-sm bg-primary text-white shadow-sm shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
        @click="proceedToForm"
      >
        {{ kycStatus === 'pending' ? 'Verifikasi Sedang Diproses' : 'Mulai Verifikasi' }}
      </button>
    </div>
  </div>
</template>
