<script setup lang="ts">
import { Shield, Zap, ShieldCheck, ArrowLeft, ShoppingBag, Banknote, CreditCard, Smile, FileCheck } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'default',
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
  <div class="relative min-h-screen bg-white flex flex-col max-w-md mx-auto">
    <!-- AppBar -->
    <div class="flex items-center px-4 h-14 mt-6">
      <button
        class="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-800"
        @click="router.back()"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center space-y-4">
      <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p class="text-xs font-semibold text-slate-500 animate-pulse">Memuat data...</p>
    </div>

    <!-- Content -->
    <div v-else class="flex-1 flex flex-col overflow-y-auto">
      <div class="px-6 pb-8 space-y-0">
        <!-- Hero Illustration -->
        <div class="flex justify-center pt-4 pb-2">
          <div class="w-[180px] h-[180px] bg-white flex items-center justify-center">
            <div class="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck class="w-16 h-16 text-primary" />
            </div>
          </div>
        </div>

        <!-- Title -->
        <div class="text-center space-y-3 pb-8">
          <h1 class="text-2xl font-extrabold text-slate-900">Verifikasi Identitas</h1>
          <p class="text-sm text-slate-500 leading-relaxed px-4">
            Selesaikan verifikasi untuk menikmati semua fitur Nitip secara penuh dan aman.
          </p>
        </div>

        <!-- Step Indicators -->
        <div class="flex items-center justify-center pb-8">
          <div class="flex items-center">
            <div class="flex flex-col items-center gap-1.5">
              <div class="w-11 h-11 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary">
                <CreditCard class="w-5 h-5" />
              </div>
              <span class="text-[11px] text-slate-500">Foto KTP</span>
            </div>
            <div class="w-8 h-[2px] bg-primary/30 -mt-5 mx-1" />
            <div class="flex flex-col items-center gap-1.5">
              <div class="w-11 h-11 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary">
                <Smile class="w-5 h-5" />
              </div>
              <span class="text-[11px] text-slate-500">Selfie</span>
            </div>
            <div class="w-8 h-[2px] bg-primary/30 -mt-5 mx-1" />
            <div class="flex flex-col items-center gap-1.5">
              <div class="w-11 h-11 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary">
                <FileCheck class="w-5 h-5" />
              </div>
              <span class="text-[11px] text-slate-500">Selesai</span>
            </div>
          </div>
        </div>

        <!-- Benefits -->
        <div class="space-y-3 pb-8">
          <div class="bg-primary/5 rounded-2xl p-4 flex gap-4 border border-primary/10">
            <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Shield class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">Data Anda Aman</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Seluruh data identitas dienkripsi dan hanya digunakan untuk keperluan verifikasi.</p>
            </div>
          </div>
          <div class="bg-primary/5 rounded-2xl p-4 flex gap-4 border border-primary/10">
            <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Zap class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">Batas Saldo Lebih Besar</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Simpan saldo Nitip Pay lebih banyak untuk transaksi jastip.</p>
            </div>
          </div>
          <div class="bg-primary/5 rounded-2xl p-4 flex gap-4 border border-primary/10">
            <div class="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <ShieldCheck class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">Lencana Terverifikasi</h4>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Dapatkan badge centang untuk meningkatkan kepercayaan komunitas.</p>
            </div>
          </div>
        </div>

        <!-- Limitations Section -->
        <div class="pb-4">
          <h3 class="text-base font-bold text-slate-900 mb-4">Batasan Akun Non-Verifikasi</h3>
          <div class="space-y-3">
            <div class="bg-orange-50 rounded-2xl p-4 flex gap-4 border border-orange-100">
              <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <ShoppingBag class="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900">Batas Transaksi Harian</h4>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">Maksimal 5 pesanan per hari untuk pembuatan maupun penerimaan jasa.</p>
              </div>
            </div>
            <div class="bg-orange-50 rounded-2xl p-4 flex gap-4 border border-orange-100">
              <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <Banknote class="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900">Batas Penarikan Dana</h4>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">Maksimal penarikan saldo adalah Rp 100.000 per hari.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom CTA — always visible, tidak pakai fixed agar tidak tumpang tindih -->
    <div v-if="!loading" class="px-6 pt-4 pb-10 bg-white shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)] border-t border-slate-100">
      <button
        v-if="kycStatus === 'approved'"
        disabled
        class="w-full h-14 rounded-2xl font-bold text-base bg-emerald-100 text-emerald-700"
      >
        Sudah Terverifikasi ✓
      </button>
      <button
        v-else
        :disabled="kycStatus === 'pending'"
        class="w-full h-14 rounded-2xl font-bold text-base bg-primary text-white shadow-sm shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        @click="proceedToForm"
      >
        {{ kycStatus === 'pending' ? 'Verifikasi Sedang Diproses' : 'Mulai Verifikasi' }}
      </button>
    </div>
  </div>
</template>
