<script setup lang="ts">
import { ShoppingBag, RefreshCw, Clock, Utensils, Play, PackageCheck, Phone } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'
import { useToast } from '~/composables/useToast'
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

interface MerchantOrder { 
  id: string
  status: string
  created_at: string
  item_details?: string
  estimated_cost?: number
  runner_name?: string
  runner_phone?: string
  [key: string]: unknown 
}

const formatEstimatedCost = (val: unknown): string => {
  const num = Number(val ?? 0)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString('id-ID')
}

const formatShortId = (id: unknown): string => String(id ?? '').slice(0, 8) || '-'

const formatTime = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1)
  }
  return cleaned
}

const getStepIndex = (status: string): number => {
  switch (status) {
    case 'pending':
      return 0
    case 'merchant_accepted':
    case 'accepted':
      return 1
    case 'cooking':
    case 'purchasing':
      return 2
    case 'ready':
      return 3
    case 'delivering':
    case 'on_progress':
      return 4
    case 'completed':
      return 5
    default:
      return 0
  }
}

const fetchOrders = async (showToastOnNew = false) => {
  try {
    const prevPendingCount = pendingOrders.value.length
    await merchantsStore.fetchMerchantOrders()
    lastUpdate.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    
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
    o.status === 'merchant_accepted' || 
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

const displayedOrders = computed<MerchantOrder[]>(() => {
  if (activeTab.value === 'pending') return pendingOrders.value
  if (activeTab.value === 'processing') return processingOrders.value
  return completedOrders.value
})

const handleAccept = async (orderId: string) => {
  actionLoadingId.value = orderId
  try {
    await merchantsStore.acceptMerchantOrder(orderId)
    activeTab.value = 'processing'
    success('Pesanan berhasil diterima! Mencari runner terdekat...')
    await fetchOrders(false)
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
    await fetchOrders(false)
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal memperbarui status pesanan.'
    error(errMsg)
  } finally {
    actionLoadingId.value = ''
  }
}

// Realtime SSE
const { connect: connectStream, disconnect: disconnectStream, isLive } = useMerchantPoolStream({
  onOrderCreated: () => {
    fetchOrders(false)
    success('Ada pesanan baru masuk!')
  },
  onOrderRemoved: () => {
    fetchOrders(false)
  },
  onConnected: () => {
    fetchOrders(false)
  }
})

onMounted(async () => {
  try {
    await merchantsStore.fetchMerchantProfile()
  } catch (err) {
    console.warn('[Merchant Orders] fetchMerchantProfile failed:', err)
  }

  if (!merchantsStore.currentMerchant) {
    await navigateTo('/merchant/menu')
    return
  }

  try {
    await fetchOrders(false)
  } catch (err) {
    console.warn('[Merchant Orders] fetchOrders failed:', err)
  }
  connectStream()
  
  pollingTimer.value = setInterval(() => {
    if (isLive.value) return 
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
  <div class="px-4 pb-24 space-y-5">
    <!-- Header with Quick Refresh -->
    <div class="flex justify-between items-center pt-2">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-black text-slate-900 tracking-tight">Pesanan Toko</h2>
          <span
            class="text-[8px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border"
            :class="isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
          >{{ isLive ? 'Live' : 'Polling' }}</span>
        </div>
        <p class="text-[10px] text-slate-400 font-semibold mt-0.5">
          Proses antrean aktif toko Anda. 
          <span v-if="lastUpdate" class="text-[9px] text-slate-500 font-extrabold ml-1">Terakhir update: {{ lastUpdate }}</span>
        </p>
      </div>
      <button 
        class="p-2.5 border border-slate-100 rounded-xl bg-white hover:bg-slate-50 active:scale-95 transition-all text-slate-600 shadow-soft" 
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
        class="py-2 rounded-xl text-center transition-all flex flex-col items-center justify-center relative active:scale-95"
        :class="activeTab === 'pending' ? 'bg-white shadow-soft text-primary font-bold' : 'text-slate-500'"
        @click="activeTab = 'pending'"
      >
        <span class="text-[9px] font-extrabold uppercase tracking-wide">Masuk</span>
        <span class="text-xs font-black mt-0.5" :class="pendingOrders.length > 0 ? 'text-rose-600 font-black' : ''">
          {{ pendingOrders.length }}
        </span>
        <span v-if="pendingOrders.length > 0" class="absolute top-1 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
      </button>

      <!-- Processing Tab (Cooking + Ready) -->
      <button 
        class="py-2 rounded-xl text-center transition-all flex flex-col items-center justify-center active:scale-95"
        :class="activeTab === 'processing' ? 'bg-white shadow-soft text-primary font-bold' : 'text-slate-500'"
        @click="activeTab = 'processing'"
      >
        <span class="text-[9px] font-extrabold uppercase tracking-wide">Diproses</span>
        <span class="text-xs font-black mt-0.5">{{ processingOrders.length }}</span>
      </button>

      <!-- Completed Tab -->
      <button 
        class="py-2 rounded-xl text-center transition-all flex flex-col items-center justify-center active:scale-95"
        :class="activeTab === 'completed' ? 'bg-white shadow-soft text-primary font-bold' : 'text-slate-500'"
        @click="activeTab = 'completed'"
      >
        <span class="text-[9px] font-extrabold uppercase tracking-wide">Selesai</span>
        <span class="text-xs font-black mt-0.5">{{ completedOrders.length }}</span>
      </button>
    </div>

    <!-- Active Orders Lists -->
    <div class="space-y-4">
      <!-- Empty State -->
      <div 
        v-if="displayedOrders.length === 0"
        class="p-12 text-center bg-white border border-slate-100 rounded-3xl text-slate-400 shadow-soft"
      >
        <ShoppingBag class="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
        <p class="text-xs font-semibold">Tidak ada pesanan di kategori ini.</p>
      </div>

      <!-- Orders loop -->
      <template v-else>
        <div
          v-for="order in displayedOrders"
          :key="order.id"
          class="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-soft transition-all duration-300 hover:border-slate-200/60"
        >
          <!-- Header: Order ID & Time & Status Tag -->
          <div class="flex justify-between items-start">
            <div class="min-w-0">
              <p class="text-[10px] font-black text-slate-900 tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded-lg inline-block">
                #{{ formatShortId(order.id).toUpperCase() }}
              </p>
              <div class="flex items-center gap-1 mt-1 text-[9px] text-slate-400 font-semibold">
                <Clock class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ formatTime(order.created_at) }} WIB</span>
              </div>
            </div>
            
            <!-- Status Tag -->
            <span 
              class="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border shadow-sm"
              :class="
                order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                order.status === 'merchant_accepted' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                order.status === 'cooking' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' : 
                order.status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                order.status === 'accepted' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                order.status === 'purchasing' ? 'bg-purple-50 text-purple-600 border-purple-200 animate-pulse' : 
                order.status === 'delivering' || order.status === 'on_progress' ? 'bg-sky-50 text-sky-600 border-sky-200' : 
                'bg-slate-50 text-slate-500 border-slate-200'
              "
            >
              {{ 
                order.status === 'pending' ? 'Masuk' : 
                order.status === 'merchant_accepted' ? 'Mencari Runner' : 
                order.status === 'cooking' ? 'Sedang Dimasak' : 
                order.status === 'ready' ? 'Siap Diambil' : 
                order.status === 'accepted' ? 'Mencari Kurir' : 
                order.status === 'purchasing' ? 'Proses Belanja' : 
                order.status === 'delivering' || order.status === 'on_progress' ? 'Sedang Diantar' : 'Selesai'
              }}
            </span>
          </div>

          <hr class="border-slate-100">

          <!-- Item Details -->
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
              <Utensils class="w-4 h-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-black text-slate-800 leading-relaxed">{{ order.item_details || '' }}</p>
              <p class="text-[10px] text-slate-400 mt-1 font-semibold">
                Estimasi Biaya: <span class="text-slate-800 font-black">Rp {{ formatEstimatedCost(order.estimated_cost) }}</span>
              </p>
            </div>
          </div>

          <!-- Stepper Progress Bar -->
          <div class="p-3 bg-slate-50 rounded-2xl space-y-2">
            <div class="flex items-center justify-between w-full">
              <!-- Step 1 -->
              <div class="flex flex-col items-center flex-1">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black" 
                     :class="getStepIndex(order.status) >= 1 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'">
                  1
                </div>
                <span class="text-[8px] font-extrabold mt-1" :class="getStepIndex(order.status) >= 1 ? 'text-indigo-600' : 'text-slate-400'">Masuk</span>
              </div>
              <div class="h-0.5 flex-1 -mt-3.5 transition-colors duration-300" :class="getStepIndex(order.status) >= 2 ? 'bg-indigo-600' : 'bg-slate-200'" />
              
              <!-- Step 2 -->
              <div class="flex flex-col items-center flex-1">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black" 
                     :class="getStepIndex(order.status) >= 2 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'">
                  2
                </div>
                <span class="text-[8px] font-extrabold mt-1" :class="getStepIndex(order.status) >= 2 ? 'text-indigo-600' : 'text-slate-400'">Proses</span>
              </div>
              <div class="h-0.5 flex-1 -mt-3.5 transition-colors duration-300" :class="getStepIndex(order.status) >= 3 ? 'bg-indigo-600' : 'bg-slate-200'" />
              
              <!-- Step 3 -->
              <div class="flex flex-col items-center flex-1">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black" 
                     :class="getStepIndex(order.status) >= 3 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'">
                  3
                </div>
                <span class="text-[8px] font-extrabold mt-1" :class="getStepIndex(order.status) >= 3 ? 'text-indigo-600' : 'text-slate-400'">Siap</span>
              </div>
              <div class="h-0.5 flex-1 -mt-3.5 transition-colors duration-300" :class="getStepIndex(order.status) >= 4 ? 'bg-indigo-600' : 'bg-slate-200'" />
              
              <!-- Step 4 -->
              <div class="flex flex-col items-center flex-1">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black" 
                     :class="getStepIndex(order.status) >= 4 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'">
                  4
                </div>
                <span class="text-[8px] font-extrabold mt-1" :class="getStepIndex(order.status) >= 4 ? 'text-indigo-600' : 'text-slate-400'">Kirim</span>
              </div>
              <div class="h-0.5 flex-1 -mt-3.5 transition-colors duration-300" :class="getStepIndex(order.status) >= 5 ? 'bg-indigo-600' : 'bg-slate-200'" />
              
              <!-- Step 5 -->
              <div class="flex flex-col items-center flex-1">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black" 
                     :class="getStepIndex(order.status) >= 5 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'">
                  5
                </div>
                <span class="text-[8px] font-extrabold mt-1" :class="getStepIndex(order.status) >= 5 ? 'text-indigo-600' : 'text-slate-400'">Selesai</span>
              </div>
            </div>
          </div>

          <!-- Runner Info Section (Direct WhatsApp link) -->
          <div v-if="order.runner_name" class="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shrink-0 text-[10px]">
                {{ order.runner_name.substring(0, 2).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Runner Mitra</p>
                <p class="font-extrabold text-slate-800 truncate mt-0.5 leading-none">{{ order.runner_name }}</p>
              </div>
            </div>
            
            <a 
              v-if="order.runner_phone"
              :href="`https://wa.me/${formatPhoneNumber(order.runner_phone)}`" 
              target="_blank"
              class="h-8 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1.5 active:scale-95 transition-all text-[10px]"
            >
              <Phone class="w-3.5 h-3.5 fill-current" />
              Hubungi
            </a>
          </div>

          <!-- Dynamic Action Buttons for Quick Access -->
          <div v-if="order.status === 'pending' || order.status === 'merchant_accepted' || order.status === 'accepted' || order.status === 'cooking'" class="pt-1 flex gap-2">
            <!-- Accept Button -->
            <button 
              v-if="order.status === 'pending'"
              class="flex-1 h-11 rounded-2xl text-xs flex items-center justify-center gap-1.5 font-bold bg-primary text-white hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/10"
              :disabled="actionLoadingId === order.id"
              @click="handleAccept(order.id)"
            >
              <Play v-slot="icon" v-if="actionLoadingId !== order.id" class="w-3.5 h-3.5 fill-current" />
              <RefreshCw v-else class="w-3.5 h-3.5 animate-spin" />
              Terima Pesanan
            </button>

            <!-- Waiting for Runner -->
            <button 
              v-if="order.status === 'merchant_accepted' || order.status === 'accepted'"
              class="flex-1 h-11 rounded-2xl text-xs flex items-center justify-center gap-1.5 font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              disabled
            >
              <RefreshCw class="w-3.5 h-3.5 animate-spin" />
              Mencari Runner Terdekat...
            </button>

            <!-- Mark Ready Button -->
            <button 
              v-if="order.status === 'cooking'"
              class="flex-1 h-11 rounded-2xl text-xs flex items-center justify-center gap-1.5 font-bold bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all shadow-md shadow-emerald-500/10"
              :disabled="actionLoadingId === order.id"
              @click="handleReady(order.id)"
            >
              <PackageCheck v-if="actionLoadingId !== order.id" class="w-3.5 h-3.5" />
              <RefreshCw v-else class="w-3.5 h-3.5 animate-spin" />
              Tandai Siap Diambil
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
