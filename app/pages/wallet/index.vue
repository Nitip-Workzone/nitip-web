<script setup lang="ts">
import { Wallet, ArrowUpRight, ArrowDownLeft, History, ChevronRight, RefreshCw, CreditCard, Plus, QrCode, HelpCircle } from '@lucide/vue'
import { useUserWalletStore } from '~/stores/user-wallet'
import { useToastStore } from '~/stores/toast'

definePageMeta({
  layout: 'user',
})

const walletStore = useUserWalletStore()
const authStore = useAuthStore()
const { error } = useToast()

const recentTransactions = computed(() => walletStore.transactions.slice(0, 5))

const refreshWallet = async () => {
  try {
    await walletStore.fetchBalance()
    await walletStore.fetchTransactions(1, 10)
  } catch {
    error('Gagal memuat data dompet.')
  }
}

function getTxTypeLabel(type: string) {
  switch (type) {
    case 'TOP_UP': return 'Top Up'
    case 'WITHDRAWAL': return 'Penarikan Dana'
    case 'ESCROW_HOLD': return 'Pembayaran Pesanan'
    case 'ESCROW_RELEASE': return 'Dana Cair (Escrow)'
    case 'LIABILITY_HOLD': return 'Jaminan Ditahan'
    case 'LIABILITY_RELEASE': return 'Jaminan Dikembalikan'
    case 'LIABILITY_CONFISCATED': return 'Jaminan Ditarik'
    case 'PLATFORM_FEE': return 'Biaya Layanan'
    case 'REFUND': return 'Pengembalian Dana'
    default: return type
  }
}

// Top Up Modal
const showTopUpModal = ref(false)
const topUpAmount = ref(50000)
const isSubmittingTopUp = ref(false)

// QRIS Payment Modal
const showQrisModal = ref(false)
const activeQrisString = ref('')
const activeTopUpReference = ref('')
const activeTopUpAmount = ref(0)
const activeTopUpPGFee = ref(0)

const triggerTopUp = async () => {
  if (topUpAmount.value <= 0) return
  isSubmittingTopUp.value = true
  try {
    const data = await walletStore.topUp(topUpAmount.value)
    showTopUpModal.value = false
    
    if (data && data.qris_string) {
      activeQrisString.value = data.qris_string
      activeTopUpReference.value = data.reference || ''
      activeTopUpAmount.value = topUpAmount.value
      activeTopUpPGFee.value = data.pg_fee || 0
      showQrisModal.value = true
    } else {
      const toastStore = useToastStore()
      toastStore?.add('Top Up berhasil dibuat!')
    }
  } catch (err) {
    console.error(err)
  } finally {
    isSubmittingTopUp.value = false
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

onMounted(() => {
  refreshWallet()
})
</script>

<template>
  <div class="px-4 pb-24 space-y-6">
    <!-- Wallet Card Header -->
    <div class="bg-gradient-to-br from-primary to-indigo-700 text-white rounded-3xl p-6 shadow-lg space-y-6 relative overflow-hidden">
      <!-- Background Decorator -->
      <div class="absolute -right-10 -bottom-10 opacity-10">
        <Wallet class="w-48 h-48" />
      </div>

      <div class="flex justify-between items-center relative z-10">
        <div class="flex items-center gap-2">
          <CreditCard class="w-5 h-5 opacity-80" />
          <span class="text-xs font-semibold tracking-wide uppercase opacity-80">Nitip Pay Wallet</span>
        </div>
        <button class="p-1 hover:bg-white/10 rounded-lg transition-all" :disabled="walletStore.loading" @click="refreshWallet">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': walletStore.loading }" />
        </button>
      </div>

      <div class="space-y-1 relative z-10">
        <p class="text-xs opacity-75 font-medium">Saldo Aktif</p>
        <h1 class="text-3xl font-black tracking-tight">
          Rp {{ walletStore.balance.toLocaleString('id-ID') }}
        </h1>
      </div>

      <!-- Quick Action Buttons -->
      <div class="grid grid-cols-2 gap-3 pt-2 relative z-10">
        <!-- Top Up: Only shown for non-merchants -->
        <button 
          v-if="authStore.user?.role !== 'merchant'"
          class="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 active:scale-[0.98] py-3 rounded-2xl text-xs font-bold transition-all text-white"
          @click="showTopUpModal = true"
        >
          <ArrowUpRight class="w-4 h-4" />
          Top Up
        </button>

        <!-- Withdraw: Shown for everyone (including merchants to cash out their earnings) -->
        <NuxtLink 
          to="/wallet/withdraw" 
          class="flex items-center justify-center gap-2 bg-white text-primary hover:bg-white/90 active:scale-[0.98] py-3 rounded-2xl text-xs font-bold transition-all shadow-md"
          :class="{ 'col-span-2': authStore.user?.role === 'merchant' }"
        >
          <ArrowDownLeft class="w-4 h-4" />
          Tarik Dana
        </NuxtLink>
      </div>
    </div>

    <!-- Recent Transactions Section -->
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-bold text-slate-900 text-sm">Riwayat Transaksi</h3>
          <p class="text-[10px] text-muted-foreground">Aktifitas pengeluaran dan pemasukan dompet Anda.</p>
        </div>
        <NuxtLink to="/wallet/history" class="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline">
          Lihat Semua
          <ChevronRight class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <!-- Transactions List -->
      <div v-if="walletStore.loading && walletStore.transactions.length === 0" class="p-8 text-center text-muted-foreground">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        Memuat transaksi...
      </div>
      <div v-else-if="recentTransactions.length === 0" class="p-8 text-center bg-card border border-border/50 rounded-2xl text-muted-foreground">
        <History class="w-8 h-8 mx-auto mb-2 text-slate-300" />
        Belum ada riwayat transaksi dompet.
      </div>
      <div v-else class="space-y-2">
        <div 
          v-for="tx in recentTransactions" 
          :key="tx.id"
          class="bg-card border border-border/30 rounded-xl p-3 flex justify-between items-center"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="tx.amount >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
            >
              <ArrowDownLeft v-if="tx.amount >= 0" class="w-4 h-4" />
              <ArrowUpRight v-else class="w-4 h-4" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800 leading-snug">
                {{ getTxTypeLabel(tx.type) }}
              </p>
              <p class="text-[9px] text-slate-400 mt-0.5 font-semibold">
                {{ new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p 
              class="text-xs font-black"
              :class="tx.amount >= 0 ? 'text-emerald-500' : 'text-slate-800'"
            >
              {{ tx.amount >= 0 ? '+' : '-' }} Rp {{ Math.abs(tx.amount).toLocaleString('id-ID') }}
            </p>
            <span 
              class="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block"
              :class="
                tx.status === 'success' || tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
                tx.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                'bg-rose-500/10 text-rose-500'
              "
            >
              {{ tx.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <!-- ── TOP UP SIMULATOR MODAL ── -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showTopUpModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="showTopUpModal = false">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto animate-in duration-300" style="animation: slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);">
          <!-- Handle -->
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

          <div class="text-center">
            <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Plus class="w-5 h-5 text-primary" stroke-width="2.5" />
            </div>
            <h3 class="text-base font-extrabold text-slate-900">Simulasi Top Up</h3>
            <p class="text-xs text-slate-400 mt-1">Pilih nominal top up Nitip Pay</p>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="val in [20000, 50000, 100000, 150000, 200000, 500000]"
              :key="val"
              :class="topUpAmount === val
                ? 'bg-primary text-white border-transparent shadow-sm shadow-primary/30'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-primary/40'"
              class="py-2.5 border text-[11px] font-bold rounded-xl transition-all active:scale-95"
              @click="topUpAmount = val"
            >
              {{ formatCurrency(val) }}
            </button>
          </div>

          <div class="flex items-center gap-3 pt-1">
            <button
              class="flex-1 bg-slate-100 hover:bg-slate-150 text-slate-700 text-xs font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
              @click="showTopUpModal = false"
            >
              Batal
            </button>
            <button
              id="btn-confirm-topup"
              :disabled="isSubmittingTopUp"
              class="flex-1 bg-primary text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-sm shadow-primary/30"
              @click="triggerTopUp"
            >
              <span v-if="isSubmittingTopUp" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Top Up
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── QRIS PAYMENT DISPLAY MODAL ── -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showQrisModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="showQrisModal = false">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-300">
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

          <div class="text-center space-y-2">
            <div class="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
              <QrCode class="w-6 h-6" />
            </div>
            <h3 class="text-base font-extrabold text-slate-900">Pembayaran QRIS</h3>
            <p class="text-xs text-slate-400">Scan QR Code di bawah menggunakan GoPay, OVO, Dana, LinkAja, atau Mobile Banking</p>
          </div>

          <!-- QRIS Image -->
          <div class="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-slate-100 space-y-4">
            <div class="w-full max-w-[300px] bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center space-y-3">
              <!-- Header: QRIS & GPN Logo -->
              <div class="w-full flex items-center justify-between border-b border-slate-100 pb-1.5">
                <!-- QRIS Logo -->
                <div class="flex items-center gap-0.5">
                  <span class="text-base font-[900] tracking-tighter text-[#0F265C] font-sans">QR</span>
                  <span class="text-base font-[900] tracking-tighter text-[#DF2524] font-sans">IS</span>
                </div>
                
                <!-- GPN Logo -->
                <div class="flex items-center bg-[#DF2524]/5 px-1.5 py-0.5 rounded border border-[#DF2524]/10">
                  <span class="text-[7px] font-black text-[#DF2524] tracking-widest">GPN</span>
                </div>
              </div>

              <!-- Merchant Info -->
              <div class="w-full text-center">
                <h4 class="text-[10px] font-extrabold text-slate-800 uppercase tracking-wide">NITIP INDONESIA</h4>
                <p class="text-[8px] text-slate-400 font-mono">NMID: ID1026556507279</p>
              </div>

              <!-- QR Code -->
              <div class="relative w-56 h-56 bg-white p-1 border border-slate-100 rounded-lg flex items-center justify-center">
                <img 
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(activeQrisString)}`" 
                  alt="QRIS Code" 
                  class="w-full h-full object-contain"
                >
              </div>

              <!-- Supported Channels Grid at Bottom - Official brand badges -->
              <div class="w-full border-t border-slate-100 pt-2 flex flex-wrap items-center justify-center gap-1">
                <span class="px-1.5 py-0.5 rounded-full text-[7px] font-black" style="background:#E6F7FC; color:#00AED6; border:1px solid #00AED6">GoPay</span>
                <span class="px-1.5 py-0.5 rounded-full text-[7px] font-black" style="background:#FEECE8; color:#EE4D2D; border:1px solid #EE4D2D">SPay</span>
                <span class="px-1.5 py-0.5 rounded-full text-[7px] font-black" style="background:#F0EBFA; color:#4C3497; border:1px solid #4C3497">OVO</span>
                <span class="px-1.5 py-0.5 rounded-full text-[7px] font-black" style="background:#E7F4FD; color:#118EEA; border:1px solid #118EEA">DANA</span>
                <span class="px-1.5 py-0.5 rounded-full text-[7px] font-black" style="background:#E6EEF5; color:#003A6E; border:1px solid #003A6E">Mandiri</span>
                <span class="px-1.5 py-0.5 rounded-full text-[7px] font-black" style="background:#E6F0FA; color:#0060AF; border:1px solid #0060AF">BCA</span>
              </div>
            </div>

            <!-- Amount details -->
            <div class="w-full space-y-2 text-xs text-left pt-2 border-t border-slate-100">
              <div class="flex justify-between text-slate-500">
                <span>Nominal Top Up</span>
                <span class="font-medium text-slate-800">{{ formatCurrency(activeTopUpAmount) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span class="flex items-center gap-1">
                  Biaya Layanan QRIS
                  <div class="group relative inline-block cursor-pointer">
                    <span class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-black text-slate-400 border border-slate-300 rounded-full hover:text-slate-600 hover:border-slate-500 transition-all select-none">!</span>
                    <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[9px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-50">
                      Biaya transaksi gerbang pembayaran QRIS (MDR)
                    </span>
                  </div>
                </span>
                <span class="font-medium text-slate-800">{{ formatCurrency(activeTopUpPGFee) }}</span>
              </div>
              <div class="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-100 items-center">
                <span>Total Pembayaran</span>
                <span class="text-primary text-base">{{ formatCurrency(activeTopUpAmount + activeTopUpPGFee) }}</span>
              </div>
              <div class="text-center pt-1">
                <p class="text-[9px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md inline-block">Ref: {{ activeTopUpReference }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <button
            class="w-full bg-primary text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm shadow-primary/30"
            @click="showQrisModal = false; refreshWallet();"
          >
            Selesai &amp; Cek Saldo
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
@keyframes slideUp {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
