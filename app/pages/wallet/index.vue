<script setup lang="ts">
import { Wallet, ArrowUpRight, ArrowDownLeft, History, ChevronRight, RefreshCw, CreditCard } from '@lucide/vue'
import { useUserWalletStore } from '~/stores/user-wallet'

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
        <button @click="refreshWallet" class="p-1 hover:bg-white/10 rounded-lg transition-all" :disabled="walletStore.loading">
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
        <NuxtLink 
          v-if="authStore.user?.role !== 'merchant'"
          to="/wallet" 
          class="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 active:scale-[0.98] py-3 rounded-2xl text-xs font-bold transition-all"
        >
          <ArrowUpRight class="w-4 h-4" />
          Top Up
        </NuxtLink>

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
              :class="tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
            >
              <ArrowDownLeft v-if="tx.type === 'credit'" class="w-4 h-4" />
              <ArrowUpRight v-else class="w-4 h-4" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800 leading-snug">
                {{ 
                  tx.type === 'credit' ? 'Pemasukan' : 
                  tx.type === 'debit' ? 'Pembayaran' : 'Penarikan Dana' 
                }}
              </p>
              <p class="text-[9px] text-slate-400 mt-0.5 font-semibold">
                {{ new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p 
              class="text-xs font-black"
              :class="tx.type === 'credit' ? 'text-emerald-500' : 'text-slate-800'"
            >
              {{ tx.type === 'credit' ? '+' : '-' }} Rp {{ tx.amount.toLocaleString('id-ID') }}
            </p>
            <span 
              class="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block"
              :class="
                tx.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
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
  </div>
</template>
