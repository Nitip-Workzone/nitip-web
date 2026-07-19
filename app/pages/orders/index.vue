<script setup lang="ts">
import { ArrowLeft, RefreshCw, ShoppingBag } from '@lucide/vue'
import { useUserOrdersStore } from '~/stores/user-orders'

definePageMeta({
  layout: 'user',
})

const route = useRoute()
const ordersStore = useUserOrdersStore()
const activeTab = ref<'active' | 'history'>('active')
const page = ref(1)
const hasMore = ref(true)
const loadingMore = ref(false)

// Handle direct navigation with a query parameter (?tab=active)
onMounted(async () => {
  if (route.query.tab === 'history') {
    activeTab.value = 'history'
  } else {
    activeTab.value = 'active'
  }
  await refreshOrders()
})

async function refreshOrders() {
  page.value = 1
  const res = await ordersStore.fetchMyOrders(1, 15)
  hasMore.value = res.length === 15
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value += 1
  const res = await ordersStore.fetchMyOrders(page.value, 15)
  hasMore.value = res.length === 15
  loadingMore.value = false
}

function getStatusColor(order: any) {
  if (order.status !== 'cancelled' && order.payment_status === 'unpaid' && order.payment_method === 'escrow' && order.payment_source === 'qris') {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  switch (order.status) {
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'accepted': return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'purchasing': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'delivering': return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'disputed': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

function getStatusLabel(order: any) {
  if (order.status === 'pending' && order.payment_status === 'unpaid' && order.payment_method === 'escrow' && order.payment_source === 'qris') {
    return 'Menunggu Pembayaran'
  }
  switch (order.status) {
    case 'pending': return 'Menunggu Runner'
    case 'accepted': return 'Diterima Runner'
    case 'purchasing': return 'Sedang Belanja'
    case 'delivering': return 'Sedang Diantar'
    case 'completed': return 'Selesai'
    case 'cancelled': return 'Dibatalkan'
    case 'disputed': return 'Sengketa'
    default: return order.status
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <NuxtLink to="/dashboard" class="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft class="w-5 h-5" />
        </NuxtLink>
        <h1 class="text-lg font-bold text-foreground">Order Saya</h1>
      </div>
      <button 
        :disabled="ordersStore.loading" 
        class="p-2 text-muted-foreground hover:text-primary active:scale-95 transition-all"
        @click="refreshOrders"
      >
        <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': ordersStore.loading }" />
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex bg-slate-100 p-1.5 rounded-2xl">
      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'active' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
        ]"
        @click="activeTab = 'active'"
      >
        Aktif
      </button>
      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
        ]"
        @click="activeTab = 'history'"
      >
        Riwayat
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="ordersStore.loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-white border border-border/40 rounded-2xl p-4 animate-pulse flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="h-4 bg-slate-200 rounded w-1/3" />
          <div class="h-5 bg-slate-200 rounded w-16" />
        </div>
        <div class="h-3 bg-slate-150 rounded w-2/3" />
        <div class="flex justify-between pt-2 border-t border-slate-50">
          <div class="h-3 bg-slate-100 rounded w-16" />
          <div class="h-3 bg-slate-100 rounded w-20" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="activeTab === 'active' ? ordersStore.activeOrders.length === 0 : ordersStore.pastOrders.length === 0"
      class="bg-white border border-border/40 rounded-3xl p-8 text-center shadow-sm"
    >
      <div class="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-3">
        <ShoppingBag class="w-6 h-6 text-primary" />
      </div>
      <p class="text-xs font-bold text-foreground">Tidak ada pesanan</p>
      <p class="text-[11px] text-muted-foreground mt-0.5">
        {{ activeTab === 'active' ? 'Belum ada pesanan aktif saat ini.' : 'Riwayat pesanan selesai atau batal akan muncul di sini.' }}
      </p>
      <NuxtLink
        v-if="activeTab === 'active'"
        to="/orders/new"
        class="inline-flex mt-4 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm"
      >
        Titip Sekarang
      </NuxtLink>
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-3">
      <NuxtLink
        v-for="order in (activeTab === 'active' ? ordersStore.activeOrders : ordersStore.pastOrders)"
        :key="order.id"
        :to="`/orders/${order.id}`"
        class="bg-white border border-border/30 rounded-2xl p-4 flex flex-col gap-3 shadow-sm active:scale-[0.99] hover:border-primary/20 transition-all"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">ID: #{{ order.id.slice(0, 8).toUpperCase() }}</span>
          <span 
            :class="getStatusColor(order)" 
            class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          >
            {{ getStatusLabel(order) }}
          </span>
        </div>

        <div class="space-y-1">
          <h4 class="text-xs font-extrabold text-foreground truncate">{{ order.item_details }}</h4>
          <p class="text-[10px] text-muted-foreground">Tujuan: {{ order.delivery_address }}</p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <div class="text-[10px] text-muted-foreground">
            {{ formatDate(order.created_at) }}
          </div>
          <div class="text-xs font-extrabold text-primary">
            {{ formatCurrency((order.estimated_cost || 0) + (order.delivery_fee || 0) + (order.tip_amount || 0)) }}
          </div>
        </div>
      </NuxtLink>

      <!-- Show More Button -->
      <div v-if="hasMore && !ordersStore.loading" class="pt-2 text-center">
        <button 
          :disabled="loadingMore"
          class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-60"
          @click="loadMore"
        >
          <span v-if="loadingMore" class="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin inline-block mr-1.5" />
          Lihat Lebih Banyak
        </button>
      </div>
    </div>
  </div>
</template>
