<script setup lang="ts">
import { ShoppingBag, RefreshCw, Clock, Utensils, Play, PackageCheck } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'
import { useMerchantPoolStream } from '~/composables/useMerchantPoolStream'

definePageMeta({
  layout: 'user',
  ssr: false,
})

const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const activeTab = ref<'pending' | 'processing' | 'completed'>('pending')
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const actionLoadingId = ref('')
const lastUpdate = ref<string>('')

interface MerchantOrder { id: string; status: string; created_at: string; item_details?: string; estimated_cost?: number; [key: string]: unknown }

const fetchOrders = async (showToastOnNew = false) => {
  try {
    const prevPendingCount = pendingOrders.value.length
    await merchantsStore.fetchMerchantOrders()
    lastUpdate.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    
    // Alert only if explicitly requested (SSE already beeps)
    if (showToastOnNew && pendingOrders.value.length > prevPendingCount) {
      success('Ada pesanan baru masuk!')
    }
  } catch {
    error('Gagal mengambil daftar pesanan.')
  }
}

// Group orders by status
const pendingOrders = computed<MerchantOrder[]>(() => 
  (merchantsStore.merchantOrders as MerchantOrder[]).filter(o => o.status === 'pending')
)
const processingOrders = computed<MerchantOrder[]>(() => 
  (merchantsStore.merchantOrders as MerchantOrder[]).filter(o => 
    o.status === 'cooking' || 
    o.status === 'ready' || 
    o.status === 'accepted' || 
    o.status === 'purchasing' || 
    o.status === 'delivering' || 
    o.status === 'on_progress'
  )
)
const completedOrders = computed<MerchantOrder[]>(() => 
  (merchantsStore.merchantOrders as MerchantOrder[]).filter(o => o.status === 'completed')
)

const handleAccept = async (orderId: string) => {
  actionLoadingId.value = orderId
  try {
    await merchantsStore.acceptMerchantOrder(orderId)
    success('Pesanan berhasil diterima dan siap dimasak!')
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal menerima pesanan.'
    error(errMsg)
  } finally {
    actionLoadingId.value = ''
  }
}

const handleReady = async (orderId: string) => {
  actionLoadingId.value = orderId
  try {
    await merchantsStore.readyMerchantOrder(orderId)
    success('Pesanan ditandai SIAP! Menunggu Runner mengambil.')
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal memperbarui status pesanan.'
    error(errMsg)
  } finally {
    actionLoadingId.value = ''
  }
}

// Realtime SSE (best practice: pause when hidden, backoff, fallback 30s)
const { connect: connectStream, disconnect: disconnectStream, isLive } = useMerchantPoolStream({
  onOrderCreated: () => {
    fetchOrders(false)
    success('Ada pesanan baru masuk!')
  },
  onOrderRemoved: () => {
    fetchOrders(false)
  },
  onConnected: () => {
    // On (re)connect, do a light refresh to stay in sync
    fetchOrders(false)
  },
  onError: () => {
    // Will auto-reconnect with backoff inside composable
  }
})

onMounted(async () => {
  try {
    await merchantsStore.fetchMerchantProfile()
  } catch (err) {
    console.warn('[Merchant Orders] fetchMerchantProfile failed (maybe token not ready yet in WebView):', err)
    // Jangan throw, biarkan page tetap render, retry nanti via polling/SSE
  }
  try {
    await fetchOrders(false)
  } catch (err) {
    console.warn('[Merchant Orders] fetchOrders failed:', err)
  }
  connectStream()
  // Fallback polling only when SSE not live + tab visible + 30s (was 15s) — save battery & DB
  pollingTimer.value = setInterval(() => {
    if (isLive.value) return // SSE live, skip polling
    if (document.hidden) return
    fetchOrders(false)
  }, 30000)
})

onUnmounted(() => {
  if (pollingTimer.value) clearInterval(pollingTimer.value)
  disconnectStream()
})
</script>

<template>
  <div class="px-4 pb-24 space-y-6">
    <!-- Header with Quick Refresh -->
    <div class="flex justify-between items-center pt-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-black text-slate-900 tracking-tight">Order Masuk & Proses</h2>
          <span
            class="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border"
            :class="isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
          >{{ isLive ? 'Live' : 'Polling' }}</span>
        </div>
        <p class="text-[10px] text-muted-foreground">Proses antrean pesanan aktif toko Anda. <span v-if="lastUpdate" class="text-[9px]">Update: {{ lastUpdate }}</span></p>
      </div>
      <button 
        class="p-2 border border-slate-100 rounded-xl bg-white hover:bg-slate-50 transition-all text-slate-600 shadow-sm" 
        :disabled="merchantsStore.loading"
        @click="() => fetchOrders(true)"
      >
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': merchantsStore.loading }" />
      </button>
    </div>

    <!-- Active Count Badges / 3-Tabs Layout -->
    <div class="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl">
      <!-- Pending Tab -->
      <button 
        class="py-2.5 rounded-xl text-center transition-all flex flex-col items-center justify-center relative"
        :class="activeTab === 'pending' ? 'bg-white shadow-sm text-primary font-bold' : 'text-slate-500'"
        @click="activeTab = 'pending'"
      >
        <span class="text-[10px] font-bold">Masuk</span>
        <span class="text-xs font-black" :class="pendingOrders.length > 0 ? 'text-amber-600 font-extrabold' : ''">
          {{ pendingOrders.length }}
        </span>
        <span v-if="pendingOrders.length > 0" class="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
      </button>

      <!-- Processing Tab (Cooking + Ready) -->
      <button 
        class="py-2.5 rounded-xl text-center transition-all flex flex-col items-center justify-center"
        :class="activeTab === 'processing' ? 'bg-white shadow-sm text-primary font-bold' : 'text-slate-500'"
        @click="activeTab = 'processing'"
      >
        <span class="text-[10px] font-bold">Diproses</span>
        <span class="text-xs font-black">{{ processingOrders.length }}</span>
      </button>

      <!-- Completed Tab -->
      <button 
        class="py-2.5 rounded-xl text-center transition-all flex flex-col items-center justify-center"
        :class="activeTab === 'completed' ? 'bg-white shadow-sm text-primary font-bold' : 'text-slate-500'"
        @click="activeTab = 'completed'"
      >
        <span class="text-[10px] font-bold">Selesai</span>
        <span class="text-xs font-black">{{ completedOrders.length }}</span>
      </button>
    </div>

    <!-- Active Orders Lists -->
    <div class="space-y-3">
      <!-- Empty State -->
      <div 
        v-if="
          (activeTab === 'pending' && pendingOrders.length === 0) ||
          (activeTab === 'processing' && processingOrders.length === 0) ||
          (activeTab === 'completed' && completedOrders.length === 0)
        " 
        class="p-12 text-center bg-white border border-slate-100 rounded-3xl text-slate-400"
      >
        <ShoppingBag class="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p class="text-xs">Tidak ada pesanan di tab ini.</p>
      </div>

      <!-- Orders loop -->
      <div 
        v-for="order in (
          activeTab === 'pending' ? pendingOrders : 
          activeTab === 'processing' ? processingOrders : completedOrders
        )"
        v-else 
        :key="order.id"
        class="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-[0_4px_25px_rgb(0,0,0,0.015)]"
      >
        <!-- Header: Order ID & Time -->
        <div class="flex justify-between items-start">
          <div class="min-w-0">
            <p class="text-[10px] font-black text-slate-800 tracking-wide uppercase">ID: {{ order.id.slice(0,8) }}...</p>
            <div class="flex items-center gap-1 mt-0.5 text-[9px] text-slate-400 font-semibold">
              <Clock class="w-3 h-3" />
              <span>{{ new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }} WIB</span>
            </div>
          </div>
          <!-- Status Tag -->
          <span 
            class="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-lg border"
            :class="
              order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
              order.status === 'cooking' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
              order.status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              order.status === 'accepted' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
              order.status === 'purchasing' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
              order.status === 'delivering' || order.status === 'on_progress' ? 'bg-sky-50 text-sky-600 border-sky-100' : 
              'bg-slate-50 text-slate-500 border-slate-200'
            "
          >
            {{ 
              order.status === 'pending' ? 'Masuk' : 
              order.status === 'cooking' ? 'Sedang Dimasak' : 
              order.status === 'ready' ? 'Siap Diambil' : 
              order.status === 'accepted' ? 'Mencari Kurir' : 
              order.status === 'purchasing' ? 'Runner Belanja' : 
              order.status === 'delivering' || order.status === 'on_progress' ? 'Kurir Mengantar' : 'Selesai'
            }}
          </span>
        </div>

        <hr class="border-slate-100">

        <!-- Item Details -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0">
            <Utensils class="w-4 h-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-slate-800 leading-relaxed">{{ order.item_details || '' }}</p>
            <p class="text-[10px] text-slate-400 mt-1 font-semibold">
              Estimasi: <span class="text-slate-800 font-extrabold">Rp {{ (order.estimated_cost as number)?.toLocaleString('id-ID') || 0 }}</span>
            </p>
          </div>
        </div>

        <!-- Dynamic Action Buttons for Quick Access -->
        <div v-if="order.status === 'pending' || order.status === 'accepted' || order.status === 'cooking'" class="pt-1.5 flex gap-2">
          <!-- Accept Button -->
          <button 
            v-if="order.status === 'pending'"
            class="flex-1 h-10 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold bg-primary text-white hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/10"
            :disabled="actionLoadingId === order.id"
            @click="handleAccept(order.id)"
          >
            <Play v-if="actionLoadingId !== order.id" class="w-3.5 h-3.5" />
            <RefreshCw v-else class="w-3.5 h-3.5 animate-spin" />
            Terima Pesanan
          </button>

          <!-- Waiting for Runner (Accepted state) -->
          <button 
            v-if="order.status === 'accepted'"
            class="flex-1 h-10 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            disabled
          >
            <Clock class="w-3.5 h-3.5" />
            Menunggu Kurir Menerima...
          </button>

          <!-- Mark Ready Button -->
          <button 
            v-if="order.status === 'cooking'"
            class="flex-1 h-10 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all shadow-md shadow-emerald-500/10"
            :disabled="actionLoadingId === order.id"
            @click="handleReady(order.id)"
          >
            <PackageCheck v-if="actionLoadingId !== order.id" class="w-3.5 h-3.5" />
            <RefreshCw v-else class="w-3.5 h-3.5 animate-spin" />
            Tandai Siap Diambil
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
