<script setup lang="ts">
import { ShoppingBag, RefreshCw, Check, Clock, Utensils, Play, PackageCheck, AlertCircle } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'

definePageMeta({
  layout: 'user',
})

const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const activeTab = ref<'pending' | 'cooking' | 'ready' | 'completed'>('pending')
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const actionLoadingId = ref('')

const fetchOrders = async () => {
  try {
    const prevPendingCount = pendingOrders.value.length
    await merchantsStore.fetchMerchantOrders()
    
    // Alert if new order arrives
    if (pendingOrders.value.length > prevPendingCount) {
      success('Ada pesanan baru masuk!')
      // Play a quick alert sound if supported
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5 note
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.15)
      } catch (e) {
        console.warn('AudioContext not supported or allowed yet', e)
      }
    }
  } catch {
    error('Gagal mengambil daftar pesanan.')
  }
}

// Group orders by status
const pendingOrders = computed(() => 
  merchantsStore.merchantOrders.filter(o => o.status === 'pending')
)
const cookingOrders = computed(() => 
  merchantsStore.merchantOrders.filter(o => o.status === 'cooking')
)
const readyOrders = computed(() => 
  merchantsStore.merchantOrders.filter(o => o.status === 'ready')
)
const completedOrders = computed(() => 
  merchantsStore.merchantOrders.filter(o => o.status === 'completed')
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

onMounted(async () => {
  await merchantsStore.fetchMerchantProfile()
  await fetchOrders()
  // Setup polling every 10 seconds for high-speed updates
  pollingTimer.value = setInterval(fetchOrders, 10000)
})

onUnmounted(() => {
  if (pollingTimer.value) clearInterval(pollingTimer.value)
})
</script>

<template>
  <div class="px-4 pb-24 space-y-6">
    <!-- Header with Quick Stats -->
    <div class="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-black text-slate-900 tracking-tight">Order Aktif Toko</h2>
          <p class="text-[10px] text-muted-foreground">Kelola pesanan masuk dengan cepat untuk kepuasan pelanggan.</p>
        </div>
        <button 
          @click="fetchOrders" 
          class="p-2 border border-input rounded-xl hover:bg-slate-50 transition-all text-slate-600"
          :disabled="merchantsStore.loading"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': merchantsStore.loading }" />
        </button>
      </div>

      <hr class="border-border/40">

      <!-- Store Quick Details -->
      <div class="flex justify-between items-center text-xs">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full" :class="merchantsStore.currentMerchant?.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'" />
          <span class="font-bold text-slate-700">Toko: {{ merchantsStore.currentMerchant?.is_open ? 'BUKA' : 'TUTUP' }}</span>
        </div>
        <div class="text-muted-foreground text-[11px]">
          Batas Antrean: <span class="font-extrabold text-slate-800">{{ merchantsStore.currentMerchant?.max_active_orders }}</span>
        </div>
      </div>
    </div>

    <!-- Active Count Badges / Tabs -->
    <div class="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl">
      <!-- Pending Tab -->
      <button 
        @click="activeTab = 'pending'"
        class="py-2.5 rounded-xl text-center transition-all flex flex-col items-center justify-center relative"
        :class="activeTab === 'pending' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'"
      >
        <span class="text-[10px] font-bold">Baru</span>
        <span class="text-xs font-black" :class="pendingOrders.length > 0 ? 'text-amber-600 font-extrabold' : ''">
          {{ pendingOrders.length }}
        </span>
        <span v-if="pendingOrders.length > 0" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
      </button>

      <!-- Cooking Tab -->
      <button 
        @click="activeTab = 'cooking'"
        class="py-2.5 rounded-xl text-center transition-all flex flex-col items-center justify-center"
        :class="activeTab === 'cooking' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'"
      >
        <span class="text-[10px] font-bold">Dimasak</span>
        <span class="text-xs font-black">{{ cookingOrders.length }}</span>
      </button>

      <!-- Ready Tab -->
      <button 
        @click="activeTab = 'ready'"
        class="py-2.5 rounded-xl text-center transition-all flex flex-col items-center justify-center"
        :class="activeTab === 'ready' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'"
      >
        <span class="text-[10px] font-bold">Siap</span>
        <span class="text-xs font-black">{{ readyOrders.length }}</span>
      </button>

      <!-- Completed Tab -->
      <button 
        @click="activeTab = 'completed'"
        class="py-2.5 rounded-xl text-center transition-all flex flex-col items-center justify-center"
        :class="activeTab === 'completed' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'"
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
          (activeTab === 'cooking' && cookingOrders.length === 0) ||
          (activeTab === 'ready' && readyOrders.length === 0) ||
          (activeTab === 'completed' && completedOrders.length === 0)
        " 
        class="p-12 text-center bg-card border border-border/50 rounded-2xl text-muted-foreground"
      >
        <ShoppingBag class="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p class="text-xs">Tidak ada pesanan di tab ini.</p>
      </div>

      <!-- Orders loop -->
      <div 
        v-else
        v-for="order in (
          activeTab === 'pending' ? pendingOrders : 
          activeTab === 'cooking' ? cookingOrders : 
          activeTab === 'ready' ? readyOrders : completedOrders
        )" 
        :key="order.id"
        class="bg-card border border-border/50 rounded-2xl p-4.5 space-y-3.5 shadow-sm"
      >
        <!-- Header: Order ID & Time -->
        <div class="flex justify-between items-start">
          <div class="min-w-0">
            <p class="text-[10px] font-black text-slate-800 tracking-wide uppercase">ID: {{ order.id.slice(0, 8) }}...</p>
            <div class="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground font-semibold">
              <Clock class="w-3 h-3" />
              <span>{{ new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }} WIB</span>
            </div>
          </div>
          <!-- Status Tag -->
          <span 
            class="px-2 py-0.5 text-[8px] font-extrabold uppercase rounded-full border"
            :class="
              order.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
              order.status === 'cooking' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
              order.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
              'bg-slate-200 text-slate-600 border-slate-300'
            "
          >
            {{ 
              order.status === 'pending' ? 'Menunggu' : 
              order.status === 'cooking' ? 'Dimasak' : 
              order.status === 'ready' ? 'Siap Diambil' : 'Selesai'
            }}
          </span>
        </div>

        <hr class="border-border/30">

        <!-- Item Details -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Utensils class="w-4 h-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-slate-800 leading-relaxed">{{ order.item_details }}</p>
            <p class="text-[10px] text-slate-500 mt-1 font-semibold">
              Estimasi: <span class="text-slate-800 font-extrabold">Rp {{ order.estimated_cost?.toLocaleString('id-ID') || 0 }}</span>
            </p>
          </div>
        </div>

        <!-- Dynamic Action Buttons for Quick Access -->
        <div v-if="order.status === 'pending' || order.status === 'cooking'" class="pt-1.5 flex gap-2">
          <!-- Accept Button -->
          <UiButton 
            v-if="order.status === 'pending'"
            @click="handleAccept(order.id)"
            class="flex-1 h-9 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold"
            :disabled="actionLoadingId === order.id"
          >
            <Play class="w-3.5 h-3.5" v-if="actionLoadingId !== order.id" />
            <RefreshCw class="w-3.5 h-3.5 animate-spin" v-else />
            Terima Pesanan
          </UiButton>

          <!-- Mark Ready Button -->
          <UiButton 
            v-if="order.status === 'cooking'"
            @click="handleReady(order.id)"
            class="flex-1 h-9 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
            :disabled="actionLoadingId === order.id"
          >
            <PackageCheck class="w-3.5 h-3.5" v-if="actionLoadingId !== order.id" />
            <RefreshCw class="w-3.5 h-3.5 animate-spin" v-else />
            Tandai Siap Diambil
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
