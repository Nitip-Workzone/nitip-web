<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, ArrowDownLeft } from '@lucide/vue'
import { useUserWalletStore } from '~/stores/user-wallet'

definePageMeta({
  layout: 'user',
})

const walletStore = useUserWalletStore()
const loading = ref(true)
const page = ref(1)
const hasMore = ref(true)
const loadingMore = ref(false)

onMounted(async () => {
  loading.value = true
  const res = await walletStore.fetchTransactions(1, 15)
  hasMore.value = res.length === 15
  loading.value = false
})

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value += 1
  const res = await walletStore.fetchTransactions(page.value, 15)
  hasMore.value = res.length === 15
  loadingMore.value = false
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getTxTypeLabel(type: string) {
  switch (type) {
    case 'TOP_UP': return 'Top Up'
    case 'WITHDRAWAL': return 'Penarikan Dana'
    case 'ESCROW_HOLD': return 'Pembayaran Pesanan'
    case 'ESCROW_RELEASE': return 'Dana Diterima'
    case 'PLATFORM_FEE': return 'Biaya Layanan'
    case 'REFUND': return 'Pengembalian Dana'
    default: return type
  }
}

function isIncoming(type: string, amount: number): boolean {
  // Positive amount = money coming in (green)
  // Negative amount = money going out (red)
  return amount > 0
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <NuxtLink to="/dashboard" class="p-2 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft class="w-5 h-5" />
      </NuxtLink>
      <h1 class="text-lg font-bold text-foreground">Riwayat Transaksi</h1>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-card border border-border/40 rounded-2xl p-4 animate-pulse flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-slate-100 rounded-full" />
          <div class="space-y-2">
            <div class="h-3 bg-slate-100 rounded w-20" />
            <div class="h-2 bg-slate-100 rounded w-16" />
          </div>
        </div>
        <div class="h-4 bg-slate-100 rounded w-14" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="walletStore.transactions.length === 0" class="bg-white border border-border/40 rounded-3xl p-8 text-center shadow-sm">
      <div class="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <p class="text-xs font-bold text-foreground">Belum ada transaksi</p>
      <p class="text-[11px] text-muted-foreground mt-0.5">Riwayat pengisian dan pembayaran saldo Anda akan terdaftar di sini.</p>
    </div>

    <!-- Transactions List -->
    <div v-else class="space-y-2.5">
      <div
        v-for="tx in walletStore.transactions"
        :key="tx.id"
        class="bg-white border border-border/30 rounded-2xl p-4 flex items-center justify-between shadow-sm"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div 
            :class="[
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              isIncoming(tx.type, tx.amount) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            ]"
          >
            <ArrowDownLeft v-if="isIncoming(tx.type, tx.amount)" class="w-5 h-5" />
            <ArrowUpRight v-else class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h4 class="text-xs font-extrabold text-foreground">{{ getTxTypeLabel(tx.type) }}</h4>
            <p class="text-[10px] text-muted-foreground mt-0.5">{{ formatDate(tx.created_at) }}</p>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span 
            :class="[
              'text-xs font-extrabold',
              isIncoming(tx.type, tx.amount) ? 'text-emerald-600' : 'text-rose-600'
            ]"
          >
            {{ isIncoming(tx.type, tx.amount) ? '+' : '-' }}{{ formatCurrency(Math.abs(tx.amount)) }}
          </span>
          <p class="text-[9px] text-muted-foreground capitalize mt-0.5">{{ tx.status }}</p>
        </div>
      </div>

      <!-- Show More Button -->
      <div v-if="hasMore && !loading" class="pt-2 text-center">
        <button 
          :disabled="loadingMore"
          class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
          @click="loadMore"
        >
          <span v-if="loadingMore" class="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin inline-block mr-1.5" />
          Lihat Lebih Banyak
        </button>
      </div>
    </div>
  </div>
</template>
