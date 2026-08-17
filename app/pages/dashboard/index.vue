<script setup lang="ts">
// Import new icons for coming soon features
import {
  ShoppingBag, HelpCircle, ArrowRight, Eye, EyeOff, Plus, ChevronRight,
  CheckCircle, Clock, XCircle, RotateCcw, Wallet,
  Truck, Package, BadgeCheck, ShoppingCart, Bell, MapPin, QrCode,
  UserCheck, Waves, Pill, Store, CreditCard, FileText, Utensils
} from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useUserOrdersStore, type UserOrder } from '~/stores/user-orders'
import { useUserWalletStore } from '~/stores/user-wallet'
import { useToastStore } from '~/stores/toast'
import { useBannersStore } from '~/stores/banners'

const notificationsStore = useNotificationsStore()

definePageMeta({
  layout: 'user',
})

const authStore = useAuthStore()
const ordersStore = useUserOrdersStore()
const walletStore = useUserWalletStore()
const bannersStore = useBannersStore()
const { request } = useApi()

const isBalanceVisible = ref(true)
const loading = ref(true)
const kycVerificationRequired = ref(false)

const kycStatus = ref<string>('none')
const kycStatusLoading = ref(true)

async function fetchKycStatus() {
  if (authStore.user?.is_verified) {
    kycStatus.value = 'approved'
    kycStatusLoading.value = false
    return
  }
  try {
    const res = await request<{ data: { status: string } }>('/kyc/me')
    if (res.data?.status) {
      kycStatus.value = res.data.status
    } else {
      kycStatus.value = 'none'
    }
  } catch {
    kycStatus.value = 'none'
  } finally {
    kycStatusLoading.value = false
  }
}

const kycBannerConfig = computed(() => {
  const status = kycStatus.value
  if (status === 'pending') {
    return {
      to: '/kyc/status',
      bg: 'bg-amber-50 border-amber-300',
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Verifikasi Sedang Diproses',
      desc: 'Data Anda sedang ditinjau. Estimasi proses verifikasi 1x24 jam.',
      titleClass: 'text-amber-800',
      descClass: 'text-amber-700',
    }
  } else if (status === 'rejected') {
    return {
      to: '/kyc',
      bg: 'bg-red-50 border-red-300',
      iconBg: 'bg-red-100 text-red-600',
      title: 'Verifikasi Ditolak',
      desc: 'Ajukan ulang dengan dokumen/foto selfie yang lebih jelas.',
      titleClass: 'text-red-800',
      descClass: 'text-red-700',
    }
  } else if (status === 'approved' || authStore.user?.is_verified) {
    return {
      to: '/kyc/status',
      bg: 'bg-emerald-50 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-600',
      title: 'Akun Terverifikasi ✓',
      desc: 'Selamat! Akun Anda sudah terverifikasi, semua fitur unlocked.',
      titleClass: 'text-emerald-800',
      descClass: 'text-emerald-700',
    }
  } else {
    return {
      to: '/kyc/intro',
      bg: 'bg-amber-50 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Verifikasi e-KYC Diperlukan',
      desc: 'Lengkapi verifikasi profil untuk transaksi tanpa batas.',
      titleClass: 'text-amber-800',
      descClass: 'text-amber-700',
    }
  }
})

const toggleBalance = () => {
  isBalanceVisible.value = !isBalanceVisible.value
}

// Banners Carousel Logic
const currentBannerIndex = ref(0)
const carouselRef = ref<HTMLElement | null>(null)
let autoplayTimer: ReturnType<typeof setInterval> | null = null

const startAutoplay = () => {
  if (bannersStore.banners.length <= 1) return
  stopAutoplay()
  autoplayTimer = setInterval(() => {
    if (!carouselRef.value) return
    const nextIndex = (currentBannerIndex.value + 1) % bannersStore.banners.length
    scrollToBanner(nextIndex)
  }, 4000)
}

const stopAutoplay = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

const scrollToBanner = (index: number) => {
  currentBannerIndex.value = index
  if (!carouselRef.value) return
  const width = carouselRef.value.offsetWidth
  carouselRef.value.scrollTo({
    left: index * width,
    behavior: 'smooth',
  })
}

const handleScroll = () => {
  if (!carouselRef.value) return
  const width = carouselRef.value.offsetWidth
  const scrollLeft = carouselRef.value.scrollLeft
  const index = Math.round(scrollLeft / width)
  if (index >= 0 && index < bannersStore.banners.length) {
    currentBannerIndex.value = index
  }
}

// Coming Soon Features (Sorted by most common user needs)
const comingSoonFeatures = [
  { label: 'Belanja Pasar', icon: Store, badge: 'Soon' },
  { label: 'Nitip Obat', icon: Pill, badge: 'Soon' },
  { label: 'Ambil Barang', icon: Package, badge: 'Soon' },
  { label: 'Nitip Laundry', icon: Waves, badge: 'Soon' },
  { label: 'Nitip Antri', icon: UserCheck, badge: 'Soon' },
  { label: 'Bayar Tagihan', icon: CreditCard, badge: 'Soon' },
  { label: 'Nitip Dokumen', icon: FileText, badge: 'Soon' },
]

// Computed: today's orders
const todayOrders = computed(() => {
  const now = new Date()
  const all = ordersStore.orders as UserOrder[]
  return all
    .filter((o) => {
      const created = new Date(o.created_at)
      const updated = new Date(o.updated_at || o.created_at)
      const sameDay = (d: Date) =>
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      return sameDay(created) || sameDay(updated)
    })
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
})

const activeOrdersCount = computed(() =>
  todayOrders.value.filter((o) => !['completed', 'cancelled', 'expired'].includes(o.status)).length
)

const completedOrdersCount = computed(() =>
  todayOrders.value.filter((o) => o.status === 'completed').length
)

const visibleTodayOrders = computed(() => todayOrders.value.slice(0, 5))
const extraOrdersCount = computed(() => Math.max(0, todayOrders.value.length - 5))

// For empty state fallback — show up to 3 recent orders when no today's orders
const recentOrders = computed(() => (ordersStore.orders as UserOrder[]).slice(0, 3))

async function fetchPublicConfig() {
  try {
    const res = await request<{ data: { kyc_verification_required?: boolean } }>('/configs/public')
    if (res?.data && typeof res.data.kyc_verification_required === 'boolean') {
      kycVerificationRequired.value = res.data.kyc_verification_required
    }
  } catch (err) {
    console.error('Failed to fetch public config:', err)
  }
}

async function fetchAll() {
  await Promise.all([
    authStore.fetchProfile(),
    walletStore.fetchBalance(),
    ordersStore.fetchMyOrders(),
    bannersStore.fetchActiveBanners(),
    fetchPublicConfig(),
    fetchKycStatus(),
  ])
}

onMounted(async () => {
  loading.value = true
  await fetchAll()
  loading.value = false
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})



function getStatusColor(order: UserOrder) {
  if (order.status === 'pending' && order.payment_status === 'unpaid' && order.payment_method === 'escrow' && order.payment_source === 'qris') {
    return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: 'text-amber-500' }
  }
  switch (order.status) {
    case 'pending': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: 'text-amber-500' }
    case 'accepted': return { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', icon: 'text-sky-500' }
    case 'purchasing': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: 'text-purple-500' }
    case 'delivering': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: 'text-orange-500' }
    case 'completed': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: 'text-emerald-500' }
    case 'cancelled': return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'text-slate-400' }
    default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'text-slate-400' }
  }
}

function getStatusLabel(order: UserOrder) {
  if (order.status === 'pending' && order.payment_status === 'unpaid' && order.payment_method === 'escrow' && order.payment_source === 'qris') {
    return 'Menunggu Pembayaran'
  }
  switch (order.status) {
    case 'pending': return 'Menunggu'
    case 'accepted': return 'Diterima'
    case 'purchasing': return 'Belanja'
    case 'delivering': return 'Antar'
    case 'completed': return 'Selesai'
    case 'cancelled': return 'Batal'
    default: return order.status as string
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed': return CheckCircle
    case 'cancelled': return XCircle
    case 'purchasing': return ShoppingCart
    case 'delivering': return Truck
    default: return Clock
  }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function isActiveOrder(status: string) {
  return !['completed', 'cancelled', 'expired'].includes(status)
}

// Redesigned activity helpers
const todayTotalSpending = computed(() =>
  todayOrders.value
    .filter((o) => !['cancelled', 'expired'].includes(o.status))
    .reduce((sum, o) => sum + (o.estimated_cost || 0) + (o.delivery_fee || 0) + (o.tip_amount || 0), 0)
)

function orderTotal(order: UserOrder): number {
  return (order.estimated_cost || 0) + (order.delivery_fee || 0) + (order.tip_amount || 0)
}

const statusPipeline = ['pending', 'accepted', 'purchasing', 'delivering']

function getPipelineDotColor(currentStatus: string, stepStatus: string): string {
  const pipelineOrder = statusPipeline
  const currentIdx = pipelineOrder.indexOf(currentStatus)
  const stepIdx = pipelineOrder.indexOf(stepStatus)
  if (stepIdx <= currentIdx) return 'bg-primary'
  return 'bg-slate-200'
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

// Quick action helpers
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-white">

    <!-- ── Ambient Glow Background (Flutter _GlowCircle equivalent) ── -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        class="absolute -top-32 -left-20 w-[320px] h-[320px] rounded-full"
        style="background: radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%);" />
      <div
        class="absolute top-[45%] -right-28 w-[260px] h-[260px] rounded-full"
        style="background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);" />
    </div>

    <!-- ── Main Content ── -->
    <div class="relative z-10 max-w-md mx-auto px-5 space-y-6 pb-8 pt-5">

      <!-- ── 1. HEADER — "Halo, Nama! 👋" (Flutter style) ── -->
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <!-- Skeleton -->
          <div v-if="loading" class="space-y-2">
            <div class="h-7 w-40 bg-slate-100 rounded-xl animate-pulse" />
            <div class="h-5 w-24 bg-slate-100 rounded-full animate-pulse" />
          </div>

          <template v-else>
            <h1 class="text-[22px] font-black text-slate-900 leading-tight tracking-tight flex items-center gap-1.5 flex-wrap">
              Halo, {{ authStore.user?.name?.split(' ')[0] || 'Penitip' }}!
              <span class="inline-block origin-bottom-right" style="animation: wave 1.5s ease-in-out 0.5s 2;">👋</span>
            </h1>
            <div class="flex items-center gap-2 mt-1.5">
              <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary tracking-wider uppercase border border-primary/15">
                Mode Penitip
              </span>
              <BadgeCheck v-if="authStore.user?.is_verified" class="w-4 h-4 text-primary" />
            </div>
          </template>
        </div>

        <div class="flex items-center gap-3">
          <!-- Notification Pill -->
          <NuxtLink to="/notifications" class="relative p-2 text-slate-500 hover:text-slate-900 transition-colors">
            <Bell class="w-6 h-6" />
            <span v-if="notificationsStore.unreadCount > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
            </span>
          </NuxtLink>
        </div>
      </div>

      <!-- ── PROMOTIONS/BANNERS CAROUSEL (Auto-scrolling) ── -->
      <div v-if="bannersStore.banners.length > 0" class="relative">
        <!-- Outer: clips border-radius cleanly -->
        <div class="rounded-2xl overflow-hidden shadow-sm border border-slate-100/80 bg-white">
          <!-- Inner scrollable track: no gap so each min-w-full slide snaps exactly -->
          <div 
            ref="carouselRef" 
            class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
            style="height: 150px;"
            @scroll="handleScroll"
            @mouseenter="stopAutoplay"
            @mouseleave="startAutoplay"
          >
            <div 
              v-for="banner in bannersStore.banners" 
              :key="banner.id"
              class="min-w-full w-full snap-start snap-always flex-shrink-0 flex items-center justify-center"
            >
              <NuxtLink
                v-if="banner.redirect_url && banner.redirect_url.startsWith('/')"
                :to="banner.redirect_url"
                class="block w-full h-full"
              >
                <img :src="banner.image_url" :alt="banner.title" class="w-full h-full object-contain">
              </NuxtLink>
              <a 
                v-else-if="banner.redirect_url" 
                :href="banner.redirect_url" 
                target="_blank" 
                rel="noopener noreferrer"
                class="block w-full h-full"
              >
                <img :src="banner.image_url" :alt="banner.title" class="w-full h-full object-contain">
              </a>
              <img v-else :src="banner.image_url" :alt="banner.title" class="w-full h-full object-contain">
            </div>
          </div>
        </div>

        <!-- Indicator dots — only show if more than one banner -->
        <div v-if="bannersStore.banners.length > 1" class="flex justify-center gap-1.5 mt-2">
          <button 
            v-for="(_, index) in bannersStore.banners" 
            :key="index"
            class="h-1.5 rounded-full transition-all duration-300"
            :class="index === currentBannerIndex ? 'w-4 bg-primary' : 'w-1.5 bg-slate-300'"
            @click="scrollToBanner(index)"
          />
        </div>
      </div>

      <!-- ── KYC Warning Banner (Gambar 1) — warna & wording berubah jika sudah submit/pending, klik ke Gambar 3 status ── -->
      <NuxtLink 
        v-if="(kycVerificationRequired && !authStore.user?.is_verified) || (kycStatus === 'pending' && !authStore.user?.is_verified) || kycStatus === 'rejected'"
        :to="kycBannerConfig.to"
        :class="['block rounded-2xl p-4 hover:brightness-[0.98] transition-all active:scale-[0.98] duration-150 shadow-soft border', kycBannerConfig.bg]"
      >
        <div class="flex items-center gap-3">
          <div :class="['p-2.5 rounded-xl shrink-0', kycBannerConfig.iconBg]">
            <UserCheck v-if="kycStatus === 'none' || !kycStatus" class="w-5 h-5" />
            <Clock v-else-if="kycStatus === 'pending'" class="w-5 h-5" />
            <XCircle v-else-if="kycStatus === 'rejected'" class="w-5 h-5" />
            <CheckCircle v-else class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <p :class="['text-xs font-black leading-tight', kycBannerConfig.titleClass]">{{ kycBannerConfig.title }}</p>
            <p :class="['text-[11px] mt-0.5 leading-snug', kycBannerConfig.descClass]">{{ kycBannerConfig.desc }}</p>
          </div>
          <ChevronRight :class="['w-4 h-4 self-center shrink-0', kycStatus === 'pending' ? 'text-amber-500' : kycStatus === 'rejected' ? 'text-red-400' : 'text-amber-400']" />
        </div>
      </NuxtLink>

      <!-- ── 3. LAYANAN & FITUR UTAMA ── -->
      <div class="space-y-2.5">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Layanan &amp; Fitur</p>
        <div class="grid grid-cols-5 gap-1">
          <!-- 1. Nitip Food (Aktif) -->
          <NuxtLink to="/food" class="group flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all duration-150">
            <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Utensils class="w-4.5 h-4.5 text-primary" />
            </div>
            <span class="text-[9px] font-semibold text-slate-600 text-center leading-tight">Nitip Food</span>
          </NuxtLink>

          <!-- 2. Titip Beli (Aktif) -->
          <NuxtLink to="/orders/new?category=beli" class="group flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all duration-150">
            <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <ShoppingBag class="w-4.5 h-4.5 text-primary" />
            </div>
            <span class="text-[9px] font-semibold text-slate-600 text-center leading-tight">Titip Beli</span>
          </NuxtLink>

          <!-- 3. Kirim Paket (Aktif) -->
          <NuxtLink to="/orders/new?category=kirim" class="group flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all duration-150">
            <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Package class="w-4.5 h-4.5 text-primary" />
            </div>
            <span class="text-[9px] font-semibold text-slate-600 text-center leading-tight">Kirim Paket</span>
          </NuxtLink>

          <!-- 4. Cari Runner (Aktif) -->
          <NuxtLink to="/trips" class="group flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all duration-150">
            <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Truck class="w-4.5 h-4.5 text-primary" />
            </div>
            <span class="text-[9px] font-semibold text-slate-600 text-center leading-tight">Cari Runner</span>
          </NuxtLink>

          <!-- 5. Order Saya (Aktif) -->
          <NuxtLink to="/orders" class="group flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all duration-150">
            <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <ShoppingCart class="w-4.5 h-4.5 text-primary" />
            </div>
            <span class="text-[9px] font-semibold text-slate-600 text-center leading-tight">Order Saya</span>
          </NuxtLink>
        </div>
      </div>

      <!-- ── 4. FITUR SEGERA HADIR (Coming Soon Grid) ── -->
      <div class="space-y-2.5">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Segera Hadir</p>
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="item in comingSoonFeatures"
            :key="item.label"
            class="relative group flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-50/40 opacity-70 cursor-not-allowed select-none"
          >
            <!-- Badge "Soon" -->
            <span class="absolute top-1 right-1 px-1 py-0.5 text-[6.5px] font-extrabold bg-slate-200 text-slate-500 rounded uppercase scale-90">Soon</span>
            <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <component :is="item.icon" class="w-4.5 h-4.5 text-slate-400" />
            </div>
            <span class="text-[9px] font-semibold text-slate-400 text-center leading-tight">{{ item.label }}</span>
          </div>
        </div>

        <!-- Bantuan — slim full-width pill -->
        <NuxtLink
          to="/support/new"
          class="group w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-[0.98] transition-all duration-150"
        >
          <HelpCircle class="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          <span class="text-[10px] font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Butuh bantuan? Buat tiket aduan</span>
        </NuxtLink>
      </div>

      <!-- ── 5. AKTIVITAS HARI INI (Redesigned) ── -->
      <div class="space-y-3">

        <!-- Section header -->
        <div class="flex items-center justify-between px-0.5">
          <h2 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aktivitas Hari Ini</h2>
          <NuxtLink to="/orders" class="text-[11px] font-bold text-primary flex items-center gap-0.5 hover:underline group">
            Lihat Semua <ArrowRight class="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </NuxtLink>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="loading" class="space-y-2.5">
          <div v-for="i in 3" :key="i" class="bg-white border border-slate-100 rounded-[1.25rem] p-4 animate-pulse flex items-center gap-3 shadow-soft">
            <div class="w-10 h-10 bg-slate-100 rounded-full shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3 bg-slate-100 rounded w-32" />
              <div class="h-2 bg-slate-100 rounded w-20" />
            </div>
            <div class="h-5 bg-slate-100 rounded-full w-14 shrink-0" />
          </div>
        </div>

        <template v-else>
          <!-- Summary Card: Total Spending Today -->
          <div v-if="todayOrders.length > 0" class="rounded-[1.25rem] p-4 border border-primary/10" style="background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.02) 100%);">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet class="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pengeluaran Hari Ini</p>
                  <p class="text-[15px] font-extrabold text-slate-900">{{ formatCurrency(todayTotalSpending) }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-[10px] text-slate-400 font-semibold">{{ todayOrders.length }} pesanan</p>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                    <Truck class="w-2.5 h-2.5" />{{ activeOrdersCount }} aktif
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">
                    <CheckCircle class="w-2.5 h-2.5" />{{ completedOrdersCount }} selesai
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State — hari ini kosong tapi ada recent orders -->
          <div v-if="todayOrders.length === 0 && recentOrders.length > 0" class="bg-slate-50 rounded-[1.25rem] px-4 py-5 flex items-center gap-3 border border-slate-100">
            <div class="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-slate-100 shrink-0">
              <Clock class="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-700">Belum ada aktivitas hari ini</p>
              <p class="text-[10px] text-slate-400 mt-0.5">Order terakhirmu: {{ recentOrders[0]?.created_at ? formatDate(recentOrders[0].created_at) : '-' }}</p>
            </div>
          </div>

          <!-- Full Empty State -->
          <div v-else-if="todayOrders.length === 0 && recentOrders.length === 0" class="bg-slate-50 rounded-[1.5rem] p-8 text-center border border-slate-100">
            <div class="w-14 h-14 bg-white rounded-[1rem] flex items-center justify-center mx-auto mb-3 shadow-soft border border-slate-100">
              <ShoppingBag class="w-6 h-6 text-slate-300" />
            </div>
            <p class="text-xs font-bold text-slate-700">Belum ada pesanan</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Semua pesanan penitipanmu akan muncul di sini</p>
            <NuxtLink
              to="/orders/new"
              class="inline-flex mt-4 bg-primary text-white text-[11px] font-bold px-5 py-2.5 rounded-xl hover-lift shadow-sm shadow-primary/20"
            >
              Mulai Titip
            </NuxtLink>
          </div>

          <!-- Enhanced Order List -->
          <div v-else class="space-y-2.5">
            <NuxtLink
              v-for="order in visibleTodayOrders"
              :key="order.id"
              :to="`/orders/${order.id}`"
              class="block p-4 rounded-[1.25rem] border transition-all active:scale-[0.98]"
              :class="[
                isActiveOrder(order.status)
                  ? 'bg-primary/[0.035] border-primary/15 hover:border-primary/25'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              ]"
            >
              <!-- Top Row: Icon + Item + Price -->
              <div class="flex items-start gap-3">
                <!-- Status icon circle -->
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  :class="getStatusColor(order).bg"
                >
                  <component :is="getStatusIcon(order.status)" class="w-4 h-4" :class="getStatusColor(order).icon" />
                </div>

                <!-- Details -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-[12.5px] font-bold text-slate-900 truncate">
                      {{ order.item_details || (order.service_category === 'kirim' ? 'Kirim Barang' : 'Titip Belanja') }}
                    </p>
                    <span class="text-[12px] font-extrabold text-slate-900 shrink-0">{{ formatCurrency(orderTotal(order)) }}</span>
                  </div>

                  <!-- Delivery address -->
                  <p v-if="order.delivery_address" class="text-[10px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                    <MapPin class="w-3 h-3 shrink-0 text-slate-300" />
                    {{ order.delivery_address }}
                  </p>

                  <!-- Bottom: Time + Status badge + Progress dots (if active) -->
                  <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-slate-400 font-medium">
                        {{ order.service_category || 'beli' }} &bull; {{ formatTime(order.created_at) }}
                      </span>
                      <span
                        class="text-[9px] font-extrabold px-2 py-0.5 rounded-md border"
                        :class="[getStatusColor(order).bg, getStatusColor(order).text, getStatusColor(order).border]"
                      >
                        {{ getStatusLabel(order) }}
                      </span>
                    </div>

                    <!-- Progress dots for active orders -->
                    <div v-if="isActiveOrder(order.status)" class="flex items-center gap-1">
                      <span
                        v-for="step in statusPipeline"
                        :key="step"
                        class="w-1.5 h-1.5 rounded-full transition-colors"
                        :class="getPipelineDotColor(order.status, step)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </NuxtLink>

            <!-- "More orders" overflow -->
            <NuxtLink
              v-if="extraOrdersCount > 0"
              to="/orders"
              class="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-primary hover:underline"
            >
              + {{ extraOrdersCount }} order lainnya
              <ChevronRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </template>
      </div>

    </div><!-- end main content -->

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
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto" style="animation: slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);">
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

              <!-- Supported Channels Grid at Bottom -->
              <div class="w-full border-t border-slate-100 pt-2 flex flex-wrap items-center justify-center gap-1.5">
                <img src="/images/providers/gopay.png" alt="Gopay" class="h-2 w-auto object-contain opacity-80" />
                <img src="/images/providers/shopeepay.png" alt="ShopeePay" class="h-2 w-auto object-contain opacity-80" />
                <img src="/images/providers/ovo.png" alt="OVO" class="h-2 w-auto object-contain opacity-80" />
                <img src="/images/providers/dana.png" alt="DANA" class="h-2 w-auto object-contain opacity-80" />
                <img src="/images/providers/mandiri.png" alt="Mandiri" class="h-2 w-auto object-contain opacity-80" />
                <img src="/images/providers/bca.png" alt="BCA" class="h-2 w-auto object-contain opacity-80" />
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
            @click="showQrisModal = false; fetchAll();"
          >
            Selesai &amp; Cek Saldo
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
@keyframes wave {
  0%, 60%, 100% { transform: rotate(0deg); }
  20%, 80% { transform: rotate(-15deg); }
  40% { transform: rotate(15deg); }
}

@keyframes slideUp {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>