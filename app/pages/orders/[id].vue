<script setup lang="ts">
import { ArrowLeft, AlertCircle, AlertTriangle, ShieldAlert, Check, ShoppingBag, Truck, CheckCircle2, Package } from '@lucide/vue'
import { useUserOrdersStore, type UserOrder, type Review } from '~/stores/user-orders'
import { useToastStore } from '~/stores/toast'

definePageMeta({
  layout: 'user',
})

const route = useRoute()
const router = useRouter()
const ordersStore = useUserOrdersStore()
const toastStore = useToastStore()

const orderId = route.params.id as string
const order = ref<UserOrder | null>(null)
const loading = ref(true)

// QRIS Countdown and Polling State
const timeLeft = ref('15:00')
const isExpired = ref(false)
let countdownInterval: any = null
let pollInterval: any = null

function startCountdown(createdAtStr: string) {
  if (countdownInterval) clearInterval(countdownInterval)
  
  const createdTime = new Date(createdAtStr).getTime()
  // QRIS expires in 15 minutes
  const expireTime = createdTime + 15 * 60 * 1000

  const updateTimer = () => {
    const now = Date.now()
    const diff = expireTime - now

    if (diff <= 0) {
      timeLeft.value = '00:00'
      isExpired.value = true
      if (countdownInterval) clearInterval(countdownInterval)
    } else {
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      timeLeft.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      isExpired.value = false
    }
  }

  updateTimer()
  countdownInterval = setInterval(updateTimer, 1000)
}

function startPollingStatus() {
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(async () => {
    const res = await ordersStore.fetchOrderDetail(orderId)
    if (res) {
      // Don't overwrite the whole object if status hasn't changed to avoid re-renders of list components
      if (res.payment_status === 'escrow') {
        order.value = res
        if (pollInterval) clearInterval(pollInterval)
        if (countdownInterval) clearInterval(countdownInterval)
        toastStore.add('Pembayaran Berhasil! Pesanan Anda kini aktif.')
      }
    }
  }, 5000)
}

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (pollInterval) clearInterval(pollInterval)
})

// Dispute modal state
const showDisputeModal = ref(false)
const disputeReason = ref('')
const submittingDispute = ref(false)

// Review modal state
const showReviewModal = ref(false)
const rating = ref(5)
const comment = ref('')
const submittingReview = ref(false)
const existingReview = ref<Review | null>(null)
const loadingReview = ref(false)

// Address truncation state
const isPickupExpanded = ref(false)
const isDeliveryExpanded = ref(false)

// Stepper configuration
function getSteps(ord: UserOrder) {
  const isBeli = ord.service_category === 'beli'
  return isBeli
    ? [
        { label: 'Diterima', icon: Check },
        { label: 'Belanja', icon: ShoppingBag },
        { label: 'Kirim', icon: Truck },
        { label: 'Selesai', icon: CheckCircle2 },
      ]
    : [
        { label: 'Diterima', icon: Check },
        { label: 'Kirim', icon: Truck },
        { label: 'Selesai', icon: CheckCircle2 },
      ]
}

function getActiveStepIndex(ord: UserOrder) {
  const isBeli = ord.service_category === 'beli'
  if (ord.status === 'completed') return isBeli ? 3 : 2
  if (ord.status === 'delivering') return isBeli ? 2 : 1
  if (ord.status === 'purchasing') return 1
  return 0 // accepted
}

function getProgressWidth(ord: UserOrder) {
  const isBeli = ord.service_category === 'beli'
  const index = getActiveStepIndex(ord)
  const total = isBeli ? 3 : 2
  return `${(index / total) * 100}%`
}

function getWhatsAppLink(phone: string, id: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${cleanPhone}?text=Halo,%20saya%20pemesan%20jastip%20dengan%20Order%20%23${id.slice(0, 8).toUpperCase()}`
}

onMounted(async () => {
  await loadOrder()
})

async function loadOrder() {
  loading.value = true
  const res = await ordersStore.fetchOrderDetail(orderId)
  if (res) {
    order.value = res
    // Fetch review if order is completed
    if (res.status === 'completed') {
      loadingReview.value = true
      existingReview.value = await ordersStore.fetchReview(orderId)
      loadingReview.value = false
    }
    // Start countdown timer and polling for unpaid QRIS escrow orders
    if (res.payment_status === 'unpaid' && res.payment_method === 'escrow' && res.payment_source === 'qris') {
      startCountdown(res.created_at)
      startPollingStatus()
    }
  } else {
    toastStore.add('Pesanan tidak ditemukan.')
    router.push('/orders')
  }
  loading.value = false
}

async function handleCancel() {
  if (confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
    const success = await ordersStore.cancelOrder(orderId)
    if (success) {
      toastStore.add('Pesanan berhasil dibatalkan.')
      await loadOrder()
    } else {
      toastStore.add('Gagal membatalkan pesanan.')
    }
  }
}

async function handleApproveAdjustment() {
  const success = await ordersStore.approveAdjustment(orderId)
  if (success) {
    toastStore.add('Penyesuaian harga disetujui.')
    await loadOrder()
  } else {
    toastStore.add('Gagal menyetujui penyesuaian harga.')
  }
}

async function handleRejectAdjustment() {
  const success = await ordersStore.rejectAdjustment(orderId)
  if (success) {
    toastStore.add('Penyesuaian harga ditolak.')
    await loadOrder()
  } else {
    toastStore.add('Gagal menolak penyesuaian harga.')
  }
}

async function handleDispute() {
  if (!disputeReason.value) return
  submittingDispute.value = true
  const success = await ordersStore.disputeOrder(orderId, disputeReason.value)
  if (success) {
    toastStore.add('Sengketa berhasil diajukan.')
    showDisputeModal.value = false
    await loadOrder()
  } else {
    toastStore.add('Gagal mengajukan sengketa.')
  }
  submittingDispute.value = false
}

async function handleReview() {
  if (submittingReview.value) return // guard: cegah double-submit
  submittingReview.value = true
  const success = await ordersStore.submitReview(orderId, rating.value, comment.value)
  if (success) {
    toastStore.add('Ulasan berhasil dikirim.')
    showReviewModal.value = false
    // Refresh order and review
    await loadOrder()
  } else {
    // Might already be reviewed — check and refresh
    existingReview.value = await ordersStore.fetchReview(orderId)
    if (existingReview.value) {
      toastStore.add('Ulasan sudah pernah diberikan sebelumnya.')
      showReviewModal.value = false
    } else {
      toastStore.add('Gagal mengirim ulasan.')
    }
  }
  submittingReview.value = false
}

function getStatusColor(status: string) {
  switch (status) {
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

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Mencari Runner'
    case 'accepted': return 'Diterima Runner'
    case 'purchasing': return 'Sedang Belanja'
    case 'delivering': return 'Sedang Diantar'
    case 'completed': return 'Selesai'
    case 'cancelled': return 'Dibatalkan'
    case 'disputed': return 'Sengketa'
    default: return status
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}
function formatVolume(v: number) {
  if (!v || v <= 0) return null
  if (v <= 1) return 'Kecil'
  if (v <= 5) return 'Sedang'
  return 'Besar'
}

function formatWeight(w: number) {
  if (!w || w <= 0) return null
  return `${w} kg`
}

function getImageUrl(url: string | undefined) {
  if (!url) return ''
  // Case 1: URL langsung dari backend dengan host localhost/docker (hardcoded di storage.go)
  // Contoh: http://localhost:8000/uploads/receipts/uuid.jpg
  if (url.startsWith('http://localhost:8000') || url.startsWith('http://nitip-core:8000')) {
    // Ambil hanya path-nya (/uploads/...) dan akses via Nuxt proxy
    const relativePath = url.replace(/^http:\/\/[^/]+/, '')
    return relativePath // Nuxt proxy /uploads/** akan meneruskan ke backend
  }
  // Case 2: Path relatif yang dimulai dengan /storage atau /uploads
  if (url.startsWith('/storage') || url.startsWith('storage') || url.startsWith('/uploads') || url.startsWith('uploads')) {
    const cleanPath = url.startsWith('/') ? url : `/${url}`
    return cleanPath
  }
  // Case 3: URL eksternal (Firebase signed URL, Minio, dll) — langsung gunakan
  return url
}

function openImage(url: string) {
  window.open(getImageUrl(url), '_blank')
}
</script>

<template>
  <div class="p-4 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <NuxtLink to="/orders" class="p-2 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft class="w-5 h-5" />
      </NuxtLink>
      <h1 class="text-lg font-bold text-foreground">Detail Pesanan</h1>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div class="bg-white border border-border/40 rounded-3xl p-6 animate-pulse space-y-4">
        <div class="h-4 bg-slate-200 rounded w-1/3" />
        <div class="h-10 bg-slate-100 rounded w-full" />
        <div class="h-20 bg-slate-50 rounded w-full" />
      </div>
    <div v-if="!loading && order">
        <!-- QRIS Payment Box -->
        <div class="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm text-center space-y-5">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-500">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-800">Selesaikan Pembayaran QRIS</h3>
            <p class="text-[11px] text-muted-foreground mt-1 max-w-[280px] mx-auto">
              Scan QRIS di bawah ini menggunakan GoPay, OVO, Dana, LinkAja, ShopeePay, atau Mobile Banking Anda.
            </p>
          </div>

          <!-- Countdown Timer -->
          <div class="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 max-w-[200px] mx-auto">
            <p class="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Batas Waktu Pembayaran</p>
            <p class="text-2xl font-extrabold text-amber-700 tracking-wider mt-0.5">{{ timeLeft }}</p>
          </div>

          <!-- QRIS Image -->
          <div class="relative w-56 h-56 mx-auto bg-slate-50 border border-slate-100 rounded-2xl p-3 shadow-inner flex items-center justify-center">
            <img v-if="order.qris_data" :src="order.qris_data" alt="QRIS Code" class="w-full h-full object-contain" />
            <div v-else class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            
            <!-- Expired overlay -->
            <div v-if="isExpired" class="absolute inset-0 bg-white/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 rounded-2xl">
              <span class="text-rose-500 font-extrabold text-sm">QRIS Kedaluwarsa</span>
              <p class="text-[9px] text-muted-foreground mt-1">Silakan batalkan dan buat pesanan baru.</p>
            </div>
          </div>

          <div class="flex flex-col items-center gap-1.5 pt-1">
            <div class="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 mx-auto">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Menunggu Pembayaran
            </div>
            <p class="text-[10px] text-muted-foreground italic">Halaman ini akan otomatis diperbarui setelah Anda membayar.</p>
          </div>
        </div>

        <!-- Rincian Biaya -->
        <div class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Rincian Pembayaran</h3>
          <div v-if="order.service_category === 'beli'" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Harga Barang</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.estimated_cost) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-muted-foreground">Biaya Titip / Ongkos Kirim</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.delivery_fee) }}</span>
          </div>
          <div v-if="order.service_fee" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Biaya Layanan</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.service_fee) }}</span>
          </div>
          <div v-if="order.checking_fee" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Biaya Pengecekan</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.checking_fee) }}</span>
          </div>
          <div v-if="order.tip_amount" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Tip untuk Runner</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.tip_amount) }}</span>
          </div>
          <div class="flex justify-between text-sm font-extrabold text-foreground pt-3 border-t border-slate-100">
            <span>Total Pembayaran</span>
            <span class="text-primary">{{ formatCurrency(order.total_payment || (order.estimated_cost || 0) + (order.delivery_fee || 0) + (order.tip_amount || 0)) }}</span>
          </div>
        </div>

        <button 
          :disabled="ordersStore.actionLoading"
          class="w-full bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          @click="handleCancel"
        >
          <span v-if="ordersStore.actionLoading" class="w-4 h-4 border-2 border-rose-300 border-t-rose-700 rounded-full animate-spin" />
          Batalkan Pesanan
        </button>
      </div>

      <!-- Full Detail View (If paid, or COD, or other status) -->
      <div v-if="order && (order.payment_status !== 'unpaid' || order.payment_method !== 'escrow' || order.payment_source !== 'qris')" class="space-y-6">
        <!-- Status Card -->
        <div class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">ID: #{{ order.id.substring(0, 8).toUpperCase() }}</span>
            <span :class="getStatusColor(order.status)" class="text-[10px] font-bold px-2.5 py-1 rounded-full border">
              {{ getStatusLabel(order.status) }}
            </span>
          </div>

          <!-- Item Details Block -->
          <div class="mt-4 border-t border-dashed border-slate-200 pt-4 space-y-3">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <component :is="order.service_category === 'kirim' ? Package : ShoppingBag" class="w-5 h-5 text-slate-600" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                  {{ order.service_category === 'kirim' ? 'Isi Paket' : 'Nama / Deskripsi Barang' }}
                </p>
                <p class="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                  {{ order.item_details || '-' }}
                </p>
              </div>
            </div>

            <!-- Tags: Berat, Volume, Tipe Layanan -->
            <div class="flex flex-wrap gap-2">
              <span v-if="formatWeight(order.weight_kg ?? 0)" class="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                ⚖️ {{ formatWeight(order.weight_kg ?? 0) }}
              </span>
              <span v-if="formatVolume(order.volume_liters ?? 0)" class="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                📦 {{ formatVolume(order.volume_liters ?? 0) }}
              </span>
              <span class="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/5 text-primary px-2.5 py-1 rounded-full border border-primary/10 uppercase">
                {{ order.service_category || 'beli' }}
              </span>
              <span v-if="order.order_type && order.order_type !== 'regular'" class="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full uppercase">
                {{ order.order_type }}
              </span>
            </div>

            <!-- Receiver Info (untuk Nitip Kirim) -->
            <div v-if="order.service_category === 'kirim' && order.receiver_name" class="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-1">
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Informasi Penerima</p>
              <p class="text-xs font-semibold text-slate-800">{{ order.receiver_name }}</p>
              <p v-if="order.receiver_phone" class="text-xs text-muted-foreground">{{ order.receiver_phone }}</p>
            </div>
          </div>
        </div>

        <!-- Progress Stepper -->
        <div v-if="['accepted', 'purchasing', 'delivering', 'completed'].includes(order.status)" class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status Perjalanan</h3>
          
          <div class="flex items-center justify-between relative px-2 pt-2 pb-1">
            <!-- Stepper line container -->
            <div class="absolute left-10 right-10 top-[26px] h-[2.5px] bg-slate-100 z-0 overflow-hidden rounded-full">
              <div 
                class="h-full bg-emerald-500 transition-all duration-500" 
                :style="{ width: getProgressWidth(order) }"
              />
            </div>

            <!-- Step Nodes -->
            <div v-for="(step, idx) in getSteps(order)" :key="idx" class="flex flex-col items-center gap-1.5 relative z-10 w-16">
              <div class="h-9 flex items-center justify-center">
                <div 
                  :class="[
                    'flex items-center justify-center transition-all duration-300 rounded-full',
                    idx < getActiveStepIndex(order) 
                      ? 'bg-emerald-500 text-white w-7 h-7'
                      : idx === getActiveStepIndex(order)
                        ? 'bg-primary text-white w-8 h-8 shadow-md shadow-primary/30'
                        : 'bg-slate-100 text-slate-400 w-7 h-7'
                  ]"
                >
                  <component :is="idx < getActiveStepIndex(order) ? Check : step.icon" :class="idx === getActiveStepIndex(order) ? 'w-4 h-4' : 'w-3.5 h-3.5'" />
                </div>
              </div>
              <span 
                :class="[
                  'text-[9px] text-center transition-all',
                  idx === getActiveStepIndex(order) ? 'text-primary font-extrabold tracking-wide' : 'text-slate-400 font-medium'
                ]"
              >
                {{ step.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Address Details -->
        <div class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lokasi Pengantaran</h3>
          
          <div class="space-y-4 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            <div class="relative">
              <span class="absolute -left-5 top-0.5 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-50" />
              <p class="text-[10px] font-bold text-muted-foreground">Toko / Penjemputan</p>
              <p 
                class="text-xs text-foreground font-medium mt-0.5 transition-all duration-300"
                :class="{ 'line-clamp-1': !isPickupExpanded }"
              >
                {{ order.pickup_address }}
              </p>
              <button 
                v-if="order.pickup_address && order.pickup_address.length > 50"
                type="button"
                class="text-[10px] font-bold text-primary mt-1 hover:underline active:scale-95 transition-all block"
                @click="isPickupExpanded = !isPickupExpanded"
              >
                {{ isPickupExpanded ? 'Sembunyikan' : 'Lihat Selengkapnya' }}
              </button>
            </div>
            <div class="relative mt-2">
              <span class="absolute -left-5 top-0.5 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10" />
              <p class="text-[10px] font-bold text-muted-foreground">Alamat Pengiriman</p>
              <p 
                class="text-xs text-foreground font-medium mt-0.5 transition-all duration-300"
                :class="{ 'line-clamp-1': !isDeliveryExpanded }"
              >
                {{ order.delivery_address }}
              </p>
              <button 
                v-if="order.delivery_address && order.delivery_address.length > 50"
                type="button"
                class="text-[10px] font-bold text-primary mt-1 hover:underline active:scale-95 transition-all block"
                @click="isDeliveryExpanded = !isDeliveryExpanded"
              >
                {{ isDeliveryExpanded ? 'Sembunyikan' : 'Lihat Selengkapnya' }}
              </button>
            </div>
          </div>

          <!-- Map Routing Iframe -->
          <div v-if="order.pickup_lat && order.pickup_lng && order.delivery_lat && order.delivery_lng" class="w-full h-44 rounded-2xl overflow-hidden border border-slate-100 mt-2 relative z-0">
            <iframe 
              :src="`/map/route?origin_lat=${order.pickup_lat}&origin_lng=${order.pickup_lng}&dest_lat=${order.delivery_lat}&dest_lng=${order.delivery_lng}`" 
              class="w-full h-full border-none"
              title="Peta Rute Pengiriman"
            />
          </div>
        </div>

        <!-- Runner Info Card -->
        <div v-if="order.runner_id" class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Runner yang Membantu</h3>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/5 text-primary flex items-center justify-center font-bold text-sm border border-primary/10">
                {{ order.runner_name ? order.runner_name.charAt(0).toUpperCase() : 'R' }}
              </div>
              <div>
                <p class="text-xs font-extrabold text-slate-800">{{ order.runner_name || 'Runner Partner' }}</p>
                <p class="text-[10px] text-muted-foreground">Aktif memproses pesanan Anda</p>
              </div>
            </div>
            
            <!-- WhatsApp CTA Button -->
            <a 
              v-if="order.runner_phone"
              :href="getWhatsAppLink(order.runner_phone, order.id)" 
              target="_blank"
              class="inline-flex items-center gap-1.5 bg-[#25D366] text-white text-[11px] font-bold px-4 py-2.5 rounded-2xl hover:bg-[#20ba56] transition-all active:scale-[0.98] shadow-sm shadow-[#25d366]/10"
            >
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.373a9.921 9.921 0 0 0 4.773 1.22c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.037-5.176-2.922-7.062A9.923 9.923 0 0 0 12.012 2zm5.78 14.15c-.25.706-1.464 1.298-2.02 1.352-.516.052-1.129.085-3.393-.854-2.893-1.199-4.726-4.148-4.87-4.339-.145-.19-1.155-1.534-1.155-2.927 0-1.393.725-2.08 1.015-2.383.25-.262.662-.329.983-.329.225 0 .424.009.602.018.52.027.676.064.974.776.326.782.723 1.77.786 1.897.063.127.094.275.009.444-.084.17-.184.275-.326.444-.145.17-.282.28-.424.456-.145.17-.291.355-.122.646.17.291.751 1.238 1.613 2.006.862.768 1.587 1.002 1.888 1.13.3.127.474.106.653-.095.18-.201.775-.899.983-1.206.207-.307.414-.254.694-.148.282.106 1.789.843 2.097.997.309.153.515.228.589.355.074.127.074.737-.176 1.443z"/>
              </svg>
              Chat WA
            </a>
          </div>
        </div>

        <!-- Proof Photos Card -->
        <div v-if="order.receipt_image_url || order.delivery_image_url" class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Foto Bukti Pesanan</h3>
          <div class="grid grid-cols-2 gap-4">
            <div v-if="order.receipt_image_url" class="space-y-1.5">
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Struk Belanja</p>
              <div class="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 group cursor-pointer" @click="openImage(order.receipt_image_url)">
                <img :src="getImageUrl(order.receipt_image_url)" alt="Struk Belanja" class="w-full h-full object-cover hover:scale-105 transition-transform duration-200">
              </div>
            </div>
            <div v-if="order.delivery_image_url" class="space-y-1.5">
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Foto Pengantaran</p>
              <div class="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 group cursor-pointer" @click="openImage(order.delivery_image_url)">
                <img :src="getImageUrl(order.delivery_image_url)" alt="Foto Pengantaran" class="w-full h-full object-cover hover:scale-105 transition-transform duration-200">
              </div>
            </div>
          </div>
        </div>

        <!-- Payment details -->
        <div class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rincian Pembayaran</h3>
            <div class="flex gap-1.5">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/10">
                {{ order.payment_method }}
              </span>
              <span v-if="order.payment_status !== order.payment_method" class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {{ order.payment_status }}
              </span>
            </div>
          </div>
          <div v-if="order.service_category === 'beli'" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Harga Barang</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.estimated_cost) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-muted-foreground">Biaya Titip / Ongkos Kirim</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.delivery_fee) }}</span>
          </div>
          <div v-if="order.service_fee" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Biaya Layanan</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.service_fee) }}</span>
          </div>
          <div v-if="order.checking_fee && order.status !== 'completed'" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Biaya Pengecekan</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.checking_fee) }}</span>
          </div>
          <div v-if="order.cod_handling_fee" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Biaya Penanganan COD</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.cod_handling_fee) }}</span>
          </div>
          <div v-if="order.tip_amount" class="flex justify-between text-xs">
            <span class="text-muted-foreground">Tip untuk Runner</span>
            <span class="font-medium text-foreground">{{ formatCurrency(order.tip_amount) }}</span>
          </div>
          <div class="flex justify-between text-sm font-extrabold text-foreground pt-3 border-t border-slate-100">
            <span>Total Pembayaran</span>
            <span class="text-primary">{{ formatCurrency(order.total_payment || (order.estimated_cost || 0) + (order.delivery_fee || 0) + (order.tip_amount || 0)) }}</span>
          </div>
        </div>

        <!-- Price Adjustment Banner (if applicable) -->
        <div v-if="order.adjustment_status === 'pending'" class="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3">
          <div class="flex items-start gap-2.5">
            <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 class="text-xs font-bold text-amber-800">Penyesuaian Harga Barang</h4>
              <p class="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                Runner mendapati perubahan harga di toko menjadi <span class="font-extrabold">{{ formatCurrency(order.adjusted_cost || 0) }}</span>.
              </p>
              <p v-if="order.adjustment_reason" class="text-[11px] text-amber-700 mt-1">
                Alasan: <span class="font-semibold">{{ order.adjustment_reason }}</span>
              </p>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button class="flex-1 bg-white hover:bg-slate-50 border border-amber-200 text-amber-700 text-xs font-bold py-2.5 rounded-xl transition-all" @click="handleRejectAdjustment">
              Tolak
            </button>
            <button class="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all" @click="handleApproveAdjustment">
              Setujui
            </button>
          </div>
        </div>

        <!-- Completion Code QR/Display (if delivering) -->
        <div v-if="order.status === 'delivering' && order.completion_code" class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm text-center space-y-3">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kode Konfirmasi Pengiriman</h3>
          <p class="text-[11px] text-muted-foreground">Berikan kode unik ini kepada Runner hanya saat barang sudah Anda terima dengan baik.</p>
          <div class="inline-block bg-primary/5 text-primary text-2xl font-extrabold tracking-widest px-6 py-3 rounded-2xl border border-primary/20">
            {{ order.completion_code }}
          </div>
        </div>

        <!-- Review Display Card (if already reviewed) -->
        <div v-if="order.status === 'completed' && existingReview" class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ulasan Anda</h3>
          <div class="flex items-center gap-2">
            <div class="flex gap-1">
              <span v-for="star in 5" :key="star" :class="star <= existingReview.rating ? 'text-amber-400' : 'text-slate-200'" class="text-lg">★</span>
            </div>
            <span class="text-[10px] text-muted-foreground font-semibold">{{ existingReview.rating }}/5</span>
          </div>
          <p v-if="existingReview.comment" class="text-xs text-slate-700 leading-relaxed">
            "{{ existingReview.comment }}"
          </p>
          <p class="text-[10px] text-muted-foreground">
            Diberikan pada {{ new Date(existingReview.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
          </p>
        </div>

        <!-- Loading Review -->
        <div v-else-if="order.status === 'completed' && loadingReview" class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm">
          <div class="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>

        <!-- Conditional Action Buttons -->
        <div class="space-y-3">
          <!-- Batalkan Order -->
          <button 
            v-if="order.status === 'pending'"
            :disabled="ordersStore.actionLoading" 
            class="w-full bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
            @click="handleCancel"
          >
            <span v-if="ordersStore.actionLoading" class="w-4 h-4 border-2 border-rose-300 border-t-rose-700 rounded-full animate-spin" />
            Batalkan Pesanan
          </button>

          <!-- Ajukan Sengketa (Dispute) -->
          <button 
            v-if="order.status === 'delivering'"
            class="w-full bg-slate-100 hover:bg-slate-200 text-foreground text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all" 
            @click="showDisputeModal = true"
          >
            <AlertCircle class="w-4.5 h-4.5 text-muted-foreground" />
            Ajukan Sengketa
          </button>

          <!-- Beri Ulasan (only if not yet reviewed) -->
          <button 
            v-if="order.status === 'completed' && !existingReview && !loadingReview"
            class="w-full bg-primary text-white text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] shadow-md shadow-primary/10" 
            @click="showReviewModal = true"
          >
            Beri Ulasan & Feedback
          </button>
        </div>
      </div>

      <!-- Dispute Modal -->
      <div v-if="showDisputeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div class="text-center">
            <h3 class="text-base font-extrabold text-foreground flex items-center justify-center gap-1.5">
              <ShieldAlert class="w-5 h-5 text-red-500" />
              Ajukan Sengketa (Dispute)
            </h3>
            <p class="text-xs text-muted-foreground mt-1">Jelaskan masalah/kendala yang Anda alami dengan pengiriman ini.</p>
          </div>

          <textarea 
            v-model="disputeReason" 
            rows="4" 
            placeholder="Tuliskan alasan pengajuan sengketa secara rinci..."
            class="w-full text-xs p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 resize-none"
          />

          <div class="flex items-center gap-3 pt-2">
            <button class="flex-1 bg-slate-100 text-foreground text-xs font-bold py-2.5 rounded-xl" @click="showDisputeModal = false">Batal</button>
            <button :disabled="submittingDispute" class="flex-1 bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1" @click="handleDispute">
              <span v-if="submittingDispute" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Kirim Sengketa
            </button>
          </div>
        </div>
      </div>

      <!-- Review Modal -->
      <div v-if="showReviewModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div class="text-center">
            <h3 class="text-base font-extrabold text-foreground">Beri Ulasan Pesanan</h3>
            <p class="text-xs text-muted-foreground mt-1">Bagikan pengalaman bertransaksi Anda dengan Runner ini.</p>
          </div>

          <!-- Rating Stars -->
          <div class="flex justify-center gap-2">
            <button 
              v-for="star in 5" 
              :key="star" 
              class="text-2xl transition-transform active:scale-90"
              @click="rating = star"
            >
              <span :class="star <= rating ? 'text-amber-400' : 'text-slate-200'">★</span>
            </button>
          </div>

          <textarea 
            v-model="comment" 
            rows="3" 
            placeholder="Tulis komentar ulasan Anda..."
            class="w-full text-xs p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 resize-none"
          />

          <div class="flex items-center gap-3 pt-2">
            <button class="flex-1 bg-slate-100 text-foreground text-xs font-bold py-2.5 rounded-xl" @click="showReviewModal = false">Batal</button>
            <button :disabled="submittingReview" class="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1" @click="handleReview">
              <span v-if="submittingReview" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Kirim Ulasan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
html, body {
  overflow-y: auto !important;
  height: auto !important;
}
</style>
