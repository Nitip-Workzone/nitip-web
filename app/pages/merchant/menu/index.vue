<script setup lang="ts">
import { 
  Store, 
  RefreshCw, 
  Utensils, 
  MapPin, 
  ShoppingBag, 
  Star, 
  Bell, 
  Play, 
  Wallet, 
  Check, 
  AlertTriangle,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Activity
} from '@lucide/vue'
import { useMerchantsStore, type Menu } from '~/stores/merchants'
import { useToast } from '~/composables/useToast'
import { useMerchantPoolStream } from '~/composables/useMerchantPoolStream'

definePageMeta({
  layout: 'user',
  ssr: false,
})

const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const hasMerchant = ref(false)
const checkLoading = ref(true)
const actionLoading = ref(false)
const actionLoadingId = ref('')
const togglingMenuId = ref('')

const storeForm = ref({
  is_open: true,
  auto_confirm: false,
  max_active_orders: 5,
})

const registrationForm = ref({
  name: '',
  description: '',
  address: '',
  latitude: -6.2088,
  longitude: 106.8456,
  category: 'food',
})

const showMapPicker = ref(false)

const onLocationSelected = (payload: { lat: number; lng: number; address: string }) => {
  registrationForm.value.latitude = payload.lat
  registrationForm.value.longitude = payload.lng
  registrationForm.value.address = payload.address
  showMapPicker.value = false
}

// Fetch merchant profile, menu, and orders
const fetchProfile = async () => {
  try {
    const profile = await merchantsStore.fetchMerchantProfile()
    if (profile) {
      hasMerchant.value = true
      storeForm.value.is_open = profile.is_open
      storeForm.value.auto_confirm = profile.auto_confirm
      storeForm.value.max_active_orders = profile.max_active_orders
      
      try {
        await merchantsStore.fetchMerchantMenu()
      } catch (e) {
        console.warn('[MerchantMenu] fetchMerchantMenu failed (non-fatal):', e)
      }
      try {
        await fetchOrders()
      } catch (e) {
        console.warn('[MerchantMenu] fetchOrders failed (non-fatal):', e)
      }
    } else {
      hasMerchant.value = false
    }
  } catch (e) {
    console.warn('[MerchantMenu] fetchMerchantProfile failed — show registration form instead of 500:', e)
    hasMerchant.value = false
  } finally {
    checkLoading.value = false
  }
}

const ownerPromos = ref<Array<{ id: string; code?: string | null; title: string; discount_type: string; discount_value: number; budget_total: number; budget_used: number; max_uses: number; used_count: number; per_user_limit: number; first_purchase_only: boolean; discount_scope: string; min_order_amount: number; auto_apply: boolean; is_active: boolean; valid_from?: string | null; valid_until?: string | null }>>([])
const ownerSettlement = ref<{ total_liability: number; total_orders: number; items: Array<{ merchant_id: string; merchant_name: string; total_liability: number; order_count: number }> } | null>(null)
const promoLoading = ref(false)

const fetchOwnerPromos = async () => {
  promoLoading.value = true
  try {
    const promos = await merchantsStore.fetchOwnerPromotions()
    ownerPromos.value = promos as any
    const settlement = await merchantsStore.fetchOwnerSettlement()
    ownerSettlement.value = settlement as typeof ownerSettlement.value
  } catch (e) {
    console.warn('[MerchantPromo] fetch failed:', e)
  } finally {
    promoLoading.value = false
  }
}

let lastFetchedOrdersAt = 0
const fetchOrders = async (force = false) => {
  const now = Date.now()
  if (!force && now - lastFetchedOrdersAt < 5000) {
    return
  }
  lastFetchedOrdersAt = now
  try {
    await merchantsStore.fetchMerchantOrders()
  } catch (e) {
    console.warn('[MerchantMenu] fetchMerchantOrders failed:', e)
  }
  // also fetch promo sisa quota
  fetchOwnerPromos()
}

const handleRegisterProfile = async () => {
  if (!registrationForm.value.name.trim()) {
    error('Nama merchant wajib diisi.')
    return
  }
  if (!registrationForm.value.address.trim()) {
    error('Alamat merchant wajib diisi.')
    return
  }

  actionLoading.value = true
  try {
    const res = await merchantsStore.createMerchantProfile({
      name: registrationForm.value.name.trim(),
      description: registrationForm.value.description.trim(),
      address: registrationForm.value.address.trim(),
      latitude: Number(registrationForm.value.latitude),
      longitude: Number(registrationForm.value.longitude),
      category: registrationForm.value.category,
    })
    if (res) {
      success('Profil merchant berhasil dibuat! Toko Anda sekarang aktif.')
      await fetchProfile()
    }
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal membuat profil merchant.'
    error(errMsg)
  } finally {
    actionLoading.value = false
  }
}

// SSE Connection
const { connect: connectStream, disconnect: disconnectStream, isLive } = useMerchantPoolStream({
  enabled: hasMerchant,
  onOrderCreated: () => {
    fetchOrders()
    success('Ada pesanan baru masuk!')
  },
  onOrderRemoved: () => {
    fetchOrders()
  },
  onConnected: () => {
    fetchOrders()
  }
})

// Control Hub actions
const toggleStoreOpen = async () => {
  try {
    await merchantsStore.updateMerchantStatus({
      is_open: storeForm.value.is_open,
      auto_confirm: storeForm.value.auto_confirm,
      max_active_orders: Number(storeForm.value.max_active_orders),
    })
    success(storeForm.value.is_open ? 'Toko sekarang BUKA dan siap menerima pesanan.' : 'Toko sekarang TUTUP.')
  } catch {
    storeForm.value.is_open = !storeForm.value.is_open
    error('Gagal memperbarui status toko.')
  }
}

const toggleAutoConfirm = async () => {
  try {
    await merchantsStore.updateMerchantStatus({
      is_open: storeForm.value.is_open,
      auto_confirm: storeForm.value.auto_confirm,
      max_active_orders: Number(storeForm.value.max_active_orders),
    })
    success(storeForm.value.auto_confirm ? 'Auto Confirm diaktifkan.' : 'Auto Confirm dinonaktifkan.')
  } catch {
    storeForm.value.auto_confirm = !storeForm.value.auto_confirm
    error('Gagal memperbarui opsi Auto Confirm.')
  }
}

const updateQueueLimit = async () => {
  if (storeForm.value.max_active_orders < 1) {
    storeForm.value.max_active_orders = 1
  }
  try {
    await merchantsStore.updateMerchantStatus({
      is_open: storeForm.value.is_open,
      auto_confirm: storeForm.value.auto_confirm,
      max_active_orders: Number(storeForm.value.max_active_orders),
    })
    success(`Kapasitas antrean maksimal diset ke ${storeForm.value.max_active_orders}.`)
  } catch {
    error('Gagal memperbarui batas antrean.')
  }
}

// Accept pending order directly from dashboard
const handleAccept = async (orderId: string) => {
  actionLoadingId.value = orderId
  try {
    await merchantsStore.acceptMerchantOrder(orderId)
    success('Pesanan berhasil diterima! Sistem sedang mencari runner terdekat...')
    await fetchOrders()
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal menerima pesanan.'
    error(errMsg)
  } finally {
    actionLoadingId.value = ''
  }
}

// Toggle menu item availability directly from dashboard
const toggleMenuAvailable = async (menu: Menu) => {
  togglingMenuId.value = menu.id
  try {
    await merchantsStore.toggleMenuAvailability(menu.id, !menu.is_available)
    success(menu.is_available ? `Menu '${menu.name}' sekarang DINONAKTIFKAN.` : `Menu '${menu.name}' sekarang AKTIF.`)
  } catch {
    error('Gagal mengubah ketersediaan menu.')
  } finally {
    togglingMenuId.value = ''
  }
}

// Computed helper states
const pendingOrders = computed(() => 
  (merchantsStore.merchantOrders || []).filter(o => o.status === 'pending')
)

const latestPendingOrder = computed(() => {
  const o = pendingOrders.value[0]
  if (!o) return null
  return {
    id: (o.id as string) || '',
    item_details: (o.item_details as string) || '',
    estimated_cost: Number(o.estimated_cost ?? 0)
  }
})

const activeOrdersCount = computed(() => 
  (merchantsStore.merchantOrders || []).filter(o => 
    o.status === 'pending' || 
    o.status === 'merchant_accepted' || 
    o.status === 'cooking' || 
    o.status === 'ready' || 
    o.status === 'accepted' || 
    o.status === 'purchasing' || 
    o.status === 'delivering' || 
    o.status === 'on_progress'
  ).length
)

const activeQueuePercentage = computed(() => {
  const limit = storeForm.value.max_active_orders || 1
  return Math.min((activeOrdersCount.value / limit) * 100, 100)
})

const isWebView = ref(false)

onMounted(() => {
  if (import.meta.client && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || ''
    isWebView.value = /wv|NitipMerchant|NitipApp|WebView/i.test(ua) || (ua.includes('Android') && ua.includes('Version/'))
  }
  fetchProfile()
})

onUnmounted(() => {
  disconnectStream()
})
</script>

<template>
  <div class="px-4 pb-24 space-y-5">
    <!-- Loading State -->
    <div v-if="checkLoading" class="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
      <RefreshCw class="w-9 h-9 animate-spin text-primary mb-3" />
      <p class="text-sm font-semibold">Memeriksa akun merchant Anda...</p>
    </div>

    <!-- Registration State: Profile not found -->
    <div v-else-if="!hasMerchant" class="max-w-xl mx-auto py-6">
      <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-soft space-y-6">
        <div class="text-center space-y-2">
          <div class="inline-flex p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <Store class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">Lengkapi Profil Merchant</h2>
          <p class="text-xs text-muted-foreground max-w-sm mx-auto">
            Lengkapi data restoran, laundry, atau toko Anda untuk mulai mengelola katalog menu dan pesanan.
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="handleRegisterProfile">
          <!-- Store Name -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nama Merchant/Toko</label>
            <input
              v-model="registrationForm.name"
              type="text"
              placeholder="Contoh: Nasi Goreng Berkah, Laundry Express..."
              class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
              required
            >
          </div>

          <!-- Category -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Kategori Layanan</label>
            <select
              v-model="registrationForm.category"
              class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
            >
              <option value="food">Makanan / Food</option>
              <option value="laundry">Laundry</option>
              <option value="mart">Belanja / Mart</option>
            </select>
          </div>

          <!-- Description -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deskripsi singkat</label>
            <textarea
              v-model="registrationForm.description"
              placeholder="Ceritakan singkat tentang spesialisasi menu atau layanan toko Anda..."
              class="w-full rounded-2xl border border-slate-200 bg-background px-4 py-3 text-xs font-semibold focus:outline-none focus:border-primary transition-all min-h-[80px]"
            />
          </div>

          <!-- Address -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center">
              <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alamat Lengkap Toko</label>
              <button
                type="button"
                class="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline focus:outline-none"
                @click="showMapPicker = true"
              >
                <MapPin class="w-3.5 h-3.5" />
                Pilih dari Peta
              </button>
            </div>
            <textarea
              v-model="registrationForm.address"
              placeholder="Nama jalan, nomor, blok, atau patokan lokasi..."
              class="w-full rounded-2xl border border-slate-200 bg-background px-4 py-3 text-xs font-semibold focus:outline-none focus:border-primary transition-all min-h-[80px]"
              required
            />
          </div>

          <!-- Coordinates -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latitude</label>
              <input
                v-model="registrationForm.latitude"
                type="number"
                step="any"
                placeholder="-6.2088"
                class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
                required
              >
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Longitude</label>
              <input
                v-model="registrationForm.longitude"
                type="number"
                step="any"
                placeholder="106.8456"
                class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
                required
              >
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3 pt-4">
            <NuxtLink to="/dashboard" class="flex-1">
              <UiButton variant="secondary" type="button" class="w-full h-11 rounded-2xl text-xs font-bold">
                Batal
              </UiButton>
            </NuxtLink>
            <UiButton
              class="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-xs"
              type="submit"
              :disabled="actionLoading"
            >
              <RefreshCw v-if="actionLoading" class="w-4 h-4 animate-spin mr-2" />
              Simpan & Buka Toko
            </UiButton>
          </div>
        </form>
      </div>
    </div>

    <!-- Merchant Dashboard View -->
    <div v-else class="space-y-5 pt-2">
      <!-- Browser Notification Warning -->
      <div v-if="!isWebView" class="bg-amber-50 border border-amber-200/50 rounded-3xl p-4 flex items-start gap-3 text-xs text-amber-800 shadow-soft">
        <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div class="space-y-0.5">
          <p class="font-extrabold text-amber-900">Notifikasi Pesanan Dinonaktifkan di Browser</p>
          <p class="leading-relaxed opacity-95">Sesi web aktif ini telah menghapus token Firebase perangkat mobile Anda. Anda tidak akan menerima notifikasi pesanan masuk pada HP Anda sampai masuk kembali di aplikasi mobile.</p>
        </div>
      </div>

      <!-- Store Header Title (Gradient Card) -->
      <div class="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 rounded-3xl p-5 text-white shadow-soft-lg overflow-hidden">
        <!-- Accent circles -->
        <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div class="absolute -left-10 -top-10 w-28 h-28 bg-white/5 rounded-full blur-xl" />
        
        <div class="relative flex justify-between items-start z-10">
          <div class="space-y-1">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/10 text-white rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md border border-white/10">
              <Store class="w-3 h-3" />
              Mitra Resmi
            </span>
            <h2 class="text-xl font-black tracking-tight mt-1">{{ merchantsStore.currentMerchant?.name }}</h2>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="inline-flex items-center gap-0.5 text-amber-200 text-xs font-bold">
                <Star class="w-3.5 h-3.5 fill-amber-300 stroke-amber-300" />
                {{ merchantsStore.currentMerchant?.rating?.toFixed(1) || '5.0' }}
              </span>
              <span class="text-white/40">•</span>
              <p class="text-[11px] text-white/80 font-medium truncate max-w-[200px]">{{ merchantsStore.currentMerchant?.address }}</p>
            </div>
          </div>
          
          <div class="flex flex-col items-end gap-2">
            <span 
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold shadow-sm border"
              :class="storeForm.is_open ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {{ storeForm.is_open ? 'Buka' : 'Tutup' }}
            </span>
            <NuxtLink to="/merchant/profile" class="text-[10px] font-bold text-sky-100 hover:text-white transition-colors flex items-center gap-0.5 hover:underline">
              Edit Profil
              <ChevronRight class="w-3 h-3" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Realtime Incoming Order Banner (Pulsating Warning Alert) -->
      <div 
        v-if="pendingOrders.length > 0" 
        class="bg-gradient-to-r from-rose-500 to-orange-500 rounded-3xl p-4 text-white shadow-md animate-pulse border border-rose-400/30 space-y-3"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <Bell class="w-5 h-5 animate-bounce" />
            <div>
              <p class="text-xs font-black uppercase tracking-wider">PESANAN BARU MASUK!</p>
              <p class="text-[10px] text-white/90 font-medium">{{ pendingOrders.length }} pesanan perlu konfirmasi</p>
            </div>
          </div>
          <NuxtLink to="/merchant/orders" class="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10">
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>
        
        <!-- Quick action for the latest pending order -->
        <div v-if="latestPendingOrder" class="bg-white/10 border border-white/15 rounded-2xl p-3 flex justify-between items-center text-xs backdrop-blur-sm">
          <div class="min-w-0 flex-1 mr-3">
            <p class="font-extrabold tracking-wide text-rose-100">ID: {{ latestPendingOrder.id.slice(0, 8).toUpperCase() }}</p>
            <p class="font-bold truncate mt-0.5">{{ latestPendingOrder.item_details }}</p>
            <p class="text-[10px] text-white/80 font-semibold mt-0.5">Rp {{ latestPendingOrder.estimated_cost.toLocaleString('id-ID') }}</p>
          </div>
          <button 
            class="h-9 px-4 rounded-xl text-[11px] font-black bg-white text-rose-600 hover:bg-rose-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1"
            :disabled="actionLoadingId === latestPendingOrder.id"
            @click="handleAccept(latestPendingOrder.id)"
          >
            <Play v-if="actionLoadingId !== latestPendingOrder.id" class="w-3.5 h-3.5 fill-current" />
            <RefreshCw v-else class="w-3.5 h-3.5 animate-spin" />
            Terima
          </button>
        </div>
      </div>

      <!-- Quick Control Hub (Store status + Auto Confirm + Queue Load) -->
      <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-soft space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
            <Activity class="w-4 h-4 text-indigo-500" />
            Pusat Kendali Cepat
          </h3>
          <span 
            class="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border"
            :class="isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
          >{{ isLive ? 'Live Stream' : 'Polling' }}</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- Toggle Open Status Switcher -->
          <button 
            class="flex items-center justify-between p-3.5 border rounded-2xl transition-all text-left active:scale-[0.98] group" 
            :class="storeForm.is_open ? 'bg-emerald-50/10 border-emerald-100 hover:bg-emerald-50/20' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'"
            @click="storeForm.is_open = !storeForm.is_open; toggleStoreOpen()"
          >
            <div class="space-y-0.5">
              <span class="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Status Toko</span>
              <p class="text-[11px] font-black text-slate-800">{{ storeForm.is_open ? 'Buka' : 'Tutup' }}</p>
            </div>
            <!-- Switch slider -->
            <div 
              class="w-8 h-5 rounded-full p-0.5 transition-colors duration-200 flex-shrink-0 flex items-center"
              :class="storeForm.is_open ? 'bg-emerald-500' : 'bg-slate-300'"
            >
              <div 
                class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                :style="{ transform: storeForm.is_open ? 'translateX(12px)' : 'translateX(0)' }"
              />
            </div>
          </button>

          <!-- Toggle Auto Confirm Switcher -->
          <button 
            class="flex items-center justify-between p-3.5 border rounded-2xl transition-all text-left active:scale-[0.98] group" 
            :class="storeForm.auto_confirm ? 'bg-indigo-50/15 border-indigo-100 hover:bg-indigo-50/30' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'"
            @click="storeForm.auto_confirm = !storeForm.auto_confirm; toggleAutoConfirm()"
          >
            <div class="space-y-0.5">
              <span class="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Auto Confirm</span>
              <p class="text-[11px] font-black text-slate-800">{{ storeForm.auto_confirm ? 'Aktif' : 'Mati' }}</p>
            </div>
            <!-- Switch slider -->
            <div 
              class="w-8 h-5 rounded-full p-0.5 transition-colors duration-200 flex-shrink-0 flex items-center"
              :class="storeForm.auto_confirm ? 'bg-indigo-600' : 'bg-slate-300'"
            >
              <div 
                class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                :style="{ transform: storeForm.auto_confirm ? 'translateX(12px)' : 'translateX(0)' }"
              />
            </div>
          </button>
        </div>

        <!-- Active Orders Queue Load Indicator -->
        <div class="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
          <div class="flex justify-between items-center">
            <div class="space-y-0.5">
              <p class="text-xs font-bold text-slate-800">Antrean Aktif Toko</p>
              <p class="text-[9px] text-slate-400 font-semibold leading-none">Beban proses pesanan berjalan</p>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-black text-slate-800">{{ activeOrdersCount }} / </span>
              <input
                v-model="storeForm.max_active_orders"
                type="number"
                min="1"
                class="w-10 h-7 text-center text-xs font-black border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-primary transition-all"
                @change="updateQueueLimit"
              >
            </div>
          </div>
          
          <!-- Sleek progress bar -->
          <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full transition-all duration-500"
              :class="
                activeQueuePercentage < 50 ? 'bg-emerald-500' :
                activeQueuePercentage < 80 ? 'bg-amber-500' : 'bg-rose-500'
              "
              :style="{ width: `${activeQueuePercentage}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Promo Active - Sisa Quota Discount (Phase 8) -->
      <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-soft space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Promo Aktif - Sisa Quota Diskon
          </h3>
          <button class="text-[10px] font-bold text-primary hover:underline flex items-center gap-1" @click="fetchOwnerPromos">
            <RefreshCw class="w-3 h-3" :class="promoLoading ? 'animate-spin' : ''" />
            Refresh
          </button>
        </div>

        <div v-if="promoLoading" class="py-6 text-center">
          <RefreshCw class="w-5 h-5 animate-spin mx-auto text-primary" />
          <p class="text-[11px] text-muted-foreground mt-2">Memuat promo...</p>
        </div>

        <div v-else-if="ownerPromos.length === 0" class="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
          <p class="text-xs font-bold text-slate-500">Tidak ada promo aktif untuk toko Anda</p>
          <p class="text-[10px] text-slate-400 mt-1">Hubungi admin untuk mengaktifkan diskon custom ex Merdeka81, flat/persen, auto first-N, first purchase only.</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="promo in ownerPromos" :key="promo.id" class="border rounded-2xl p-4 space-y-3" :class="promo.is_active ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-slate-50'">
            <div class="flex justify-between items-start gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="inline-flex px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black font-mono border border-amber-200">{{ promo.code || 'AUTO' }}</span>
                  <span class="text-[11px] font-black text-slate-800">{{ promo.title }}</span>
                  <span v-if="promo.first_purchase_only" class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">First Buy Only</span>
                  <span v-if="promo.auto_apply" class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">Auto</span>
                  <span v-if="!promo.is_active" class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">Nonaktif</span>
                </div>
                <p class="text-[10px] text-slate-500 mt-1">Scope: {{ promo.discount_scope }} | Type: {{ promo.discount_type === 'flat' ? 'Flat Rp'+Number(promo.discount_value).toLocaleString('id-ID') : promo.discount_value+'% OFF' }} | Min Order: {{ promo.min_order_amount ? 'Rp'+Number(promo.min_order_amount).toLocaleString('id-ID') : '-' }}</p>
              </div>
              <span class="text-[11px] font-black" :class="promo.discount_type==='flat' ? 'text-primary' : 'text-amber-600'">{{ promo.discount_type==='flat' ? 'Rp'+Number(promo.discount_value).toLocaleString('id-ID') : promo.discount_value+'% OFF' }}</span>
            </div>

            <!-- Quota progress -->
            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-bold">
                <span class="text-slate-600">Sisa Quota Order</span>
                <span :class="(promo.max_uses - promo.used_count) <= 2 ? 'text-rose-600' : (promo.max_uses - promo.used_count) <= (promo.max_uses*0.5) ? 'text-amber-600' : 'text-emerald-600'">
                  Sisa {{ promo.max_uses - promo.used_count }} / {{ promo.max_uses }} order lagi
                </span>
              </div>
              <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" :class="(promo.max_uses - promo.used_count) <=2 ? 'bg-rose-500' : (promo.max_uses - promo.used_count) <= (promo.max_uses*0.5) ? 'bg-amber-500' : 'bg-emerald-500'" :style="{ width: Math.min(100, (promo.used_count / promo.max_uses)*100)+'%' }" />
              </div>
              <div class="flex justify-between text-[9px] text-slate-400">
                <span>Terpakai {{ promo.used_count }}</span>
                <span>{{ ((promo.used_count / promo.max_uses)*100).toFixed(0) }}% terpakai</span>
              </div>
            </div>

            <!-- Budget progress -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-[10px] font-bold">
                <span class="text-slate-600">Budget Terpakai (Audit)</span>
                <span class="text-slate-700">Rp {{ Number(promo.budget_used).toLocaleString('id-ID') }} / Rp {{ Number(promo.budget_total).toLocaleString('id-ID') }}</span>
              </div>
              <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full" :style="{ width: Math.min(100, (promo.budget_used / promo.budget_total)*100)+'%' }" />
              </div>
              <p class="text-[9px] text-slate-400">Sisa budget Rp {{ Number(promo.budget_total - promo.budget_used).toLocaleString('id-ID') }} | Liability platform ke Anda Rp {{ Number(promo.budget_used).toLocaleString('id-ID') }} ({{ ownerSettlement?.total_orders || promo.used_count }} order berdiskon)</p>
            </div>

            <div class="flex gap-2 text-[9px] text-slate-500">
              <span>Valid: {{ promo.valid_from ? new Date(promo.valid_from).toLocaleDateString('id-ID') : '-' }} - {{ promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('id-ID') : '∞' }}</span>
              <span class="ml-auto">Per user limit {{ promo.per_user_limit }}</span>
            </div>
          </div>
        </div>

        <div v-if="ownerSettlement && ownerSettlement.items && ownerSettlement.items.length>0" class="pt-3 border-t border-slate-100">
          <p class="text-[10px] font-black text-slate-700 uppercase">Settlement Ringkas</p>
          <div class="mt-2 bg-slate-50 rounded-xl p-3 text-[11px]">
            <div class="flex justify-between font-bold"><span>Total Liability Platform ke Anda</span><span class="text-primary">Rp {{ Number(ownerSettlement.total_liability).toLocaleString('id-ID') }}</span></div>
            <div class="text-[10px] text-slate-500 mt-1">{{ ownerSettlement.total_orders }} order berdiskon (completed)</div>
          </div>
        </div>
      </div>

      <!-- Quick Statistics Grid -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Metric 1: Total Menu -->
        <NuxtLink 
          to="/merchant/menu/catalog" 
          class="bg-white border border-slate-100 rounded-3xl p-4 shadow-soft flex flex-col justify-between h-24 hover-lift"
        >
          <div class="flex justify-between items-center text-slate-400">
            <span class="text-[9px] font-extrabold uppercase tracking-wider">Katalog Menu</span>
            <Utensils class="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h4 class="text-xl font-black text-slate-900 leading-none">{{ merchantsStore.merchantMenus.length }}</h4>
            <p class="text-[9px] font-semibold text-slate-400 mt-1">Item menu terdaftar →</p>
          </div>
        </NuxtLink>

        <!-- Metric 2: Active Orders -->
        <NuxtLink 
          to="/merchant/orders" 
          class="bg-white border border-slate-100 rounded-3xl p-4 shadow-soft flex flex-col justify-between h-24 hover-lift"
        >
          <div class="flex justify-between items-center text-slate-400">
            <span class="text-[9px] font-extrabold uppercase tracking-wider">Order Aktif</span>
            <ShoppingBag class="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h4 class="text-xl font-black text-slate-900 leading-none">{{ activeOrdersCount }}</h4>
            <p class="text-[9px] font-semibold text-slate-400 mt-1">Lihat order berjalan →</p>
          </div>
        </NuxtLink>
      </div>

      <!-- Insta-Toggle Menu Availability Section -->
      <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-soft space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-indigo-500" />
              Kontrol Menu Cepat
            </h3>
            <p class="text-[9px] text-slate-400 font-semibold mt-0.5">Toggle status produk habis/tersedia instan</p>
          </div>
          <NuxtLink to="/merchant/menu/catalog" class="text-[10px] font-extrabold text-primary hover:underline">Semua</NuxtLink>
        </div>

        <div v-if="merchantsStore.merchantMenus.length === 0" class="p-6 text-center text-slate-400 text-xs">
          Belum ada menu terdaftar.
        </div>
        <div v-else class="space-y-2.5">
          <div 
            v-for="menu in merchantsStore.merchantMenus.slice(0, 5)" 
            :key="menu.id" 
            class="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs"
            :class="{ 'opacity-60': !menu.is_available }"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                <img v-if="menu.image_url" :src="menu.image_url" class="w-full h-full object-cover">
                <Utensils v-else class="w-4 h-4 text-slate-400" />
              </div>
              <div class="min-w-0">
                <p class="font-extrabold text-slate-800 truncate max-w-[130px]">{{ menu.name }}</p>
                <p class="text-[10px] font-semibold text-primary mt-0.5">Rp {{ menu.price.toLocaleString('id-ID') }}</p>
              </div>
            </div>
            
            <!-- Quick Availability Switch Button -->
            <button 
              class="h-8 px-3.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 flex items-center gap-1.5"
              :class="
                menu.is_available 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50' 
                  : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100/50'
              "
              :disabled="togglingMenuId === menu.id"
              @click="toggleMenuAvailable(menu)"
            >
              <RefreshCw v-if="togglingMenuId === menu.id" class="w-3 h-3 animate-spin" />
              <template v-else>
                <span class="w-1.5 h-1.5 rounded-full" :class="menu.is_available ? 'bg-emerald-500' : 'bg-rose-500'" />
                {{ menu.is_available ? 'Tersedia' : 'Habis' }}
              </template>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Quick Navigation Action Bar -->
      <div class="grid grid-cols-3 gap-2">
        <NuxtLink to="/wallet" class="bg-slate-100 hover:bg-slate-200 text-slate-700 h-12 rounded-2xl text-[10px] font-black flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm">
          <Wallet class="w-4.5 h-4.5 text-slate-500 mb-1" />
          Dompet Saya
        </NuxtLink>
        <NuxtLink to="/merchant/profile" class="bg-slate-100 hover:bg-slate-200 text-slate-700 h-12 rounded-2xl text-[10px] font-black flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm">
          <Store class="w-4.5 h-4.5 text-slate-500 mb-1" />
          Profil Toko
        </NuxtLink>
        <NuxtLink to="/profile" class="bg-slate-100 hover:bg-slate-200 text-slate-700 h-12 rounded-2xl text-[10px] font-black flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm">
          <ShieldCheck class="w-4.5 h-4.5 text-slate-500 mb-1" />
          Akun Saya
        </NuxtLink>
      </div>
    </div>

    <!-- Location Picker Modal for Merchant Onboarding -->
    <CommonLocationPickerModal
      v-if="showMapPicker"
      title="Pilih Lokasi Merchant"
      :initial-lat="registrationForm.latitude ?? -6.2088"
      :initial-lng="registrationForm.longitude ?? 106.8456"
      @close="showMapPicker = false"
      @select="onLocationSelected"
    />
  </div>
</template>
