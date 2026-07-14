<script setup lang="ts">
import {
  ShoppingBag, HelpCircle, ArrowRight, Eye, EyeOff, Plus, ChevronRight,
  CheckCircle, Clock, XCircle, RotateCcw, History, Wallet,
  Truck, Package, BadgeCheck, ShoppingCart, Bell, MapPin, QrCode
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useUserOrdersStore, type UserOrder } from '~/stores/user-orders'
import { useUserWalletStore } from '~/stores/user-wallet'
import { useToastStore } from '~/stores/toast'

const notificationsStore = useNotificationsStore()

definePageMeta({
  layout: 'user',
})

const authStore = useAuthStore()
const ordersStore = useUserOrdersStore()
const walletStore = useUserWalletStore()

const isBalanceVisible = ref(true)
const loading = ref(true)

const toggleBalance = () => {
  isBalanceVisible.value = !isBalanceVisible.value
}

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

async function fetchAll() {
  await Promise.all([
    authStore.fetchProfile(),
    walletStore.fetchBalance(),
    ordersStore.fetchMyOrders(),
  ])
}

onMounted(async () => {
  loading.value = true
  await fetchAll()
  loading.value = false
})



function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: 'text-amber-500' }
    case 'accepted': return { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', icon: 'text-sky-500' }
    case 'purchasing': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: 'text-purple-500' }
    case 'delivering': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: 'text-orange-500' }
    case 'completed': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: 'text-emerald-500' }
    case 'cancelled': return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'text-slate-400' }
    default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'text-slate-400' }
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Menunggu'
    case 'accepted': return 'Diterima'
    case 'purchasing': return 'Belanja'
    case 'delivering': return 'Antar'
    case 'completed': return 'Selesai'
    case 'cancelled': return 'Batal'
    default: return status
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
  todayOrders.value.reduce((sum, o) => sum + (o.estimated_cost || 0) + (o.delivery_fee || 0) + (o.tip_amount || 0), 0)
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

// Quick action groups — mirroring Flutter _QuickActionsGrid structure
const orderActions = [
  { label: 'Titip Beli', icon: ShoppingBag, to: '/orders/new', color: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { label: 'Order Saya', icon: Package, to: '/orders', color: 'bg-sky-50', iconColor: 'text-sky-600' },
  { label: 'Lacak Order', icon: Truck, to: '/orders?tab=active', color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { label: 'Riwayat', icon: History, to: '/orders?tab=history', color: 'bg-violet-50', iconColor: 'text-violet-600' },
]

const accountActions = [
  { label: 'Top Up', icon: Plus, to: null, color: 'bg-indigo-50', iconColor: 'text-indigo-600', action: () => { showTopUpModal.value = true } },
  { label: 'Tarik Saldo', icon: Wallet, to: '/wallet/withdraw', color: 'bg-amber-50', iconColor: 'text-amber-600', action: null },
  { label: 'Riwayat Saldo', icon: RotateCcw, to: '/wallet/history', color: 'bg-teal-50', iconColor: 'text-teal-600', action: null },
  { label: 'Bantuan', icon: HelpCircle, to: null, color: 'bg-rose-50', iconColor: 'text-rose-500', action: () => { window.open('https://wa.me/628123456789', '_blank') } },
]
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

      <!-- ── 2. NITIP PAY WALLET CARD — 3 Actions (Flutter _PayCard) ── -->
      <div class="relative overflow-hidden rounded-[1.75rem] text-white shadow-2xl shadow-primary/25 transition-all duration-500 hover:scale-[1.015]" style="background: linear-gradient(135deg, #3730A3 0%, #4F46E5 50%, #6366F1 100%);">
        <!-- Card mesh overlay -->
        <div
          class="absolute inset-0 opacity-30 pointer-events-none"
          style="background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAuMyIgb3BhY2l0eT0iMC4xNSI+PHBhdGggZD0iTTAgMGw2MCA2ME02MCAw TDAgNjAiLz48L2c+PC9zdmc+');" />
        <div
class="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
          style="background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);" />
        <div
class="absolute -bottom-12 -left-12 w-36 h-36 rounded-full pointer-events-none"
          style="background: radial-gradient(circle, rgba(79,70,229,0.5) 0%, transparent 70%);" />

        <div class="relative z-10 p-6">
          <!-- Card header row -->
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-xl bg-white/15 border border-white/10">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <span class="text-[11px] font-bold tracking-widest text-white/70 uppercase">Nitip Pay</span>
            </div>

            <!-- Toggle visibility (Flutter style: pill button) -->
            <button
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/10 transition-all active:scale-95"
              aria-label="Toggle saldo visibility"
              @click="toggleBalance"
            >
              <EyeOff v-if="isBalanceVisible" class="w-3.5 h-3.5 text-white/70" />
              <Eye v-else class="w-3.5 h-3.5 text-white/70" />
              <span class="text-[10px] text-white/70 font-semibold">{{ isBalanceVisible ? 'Sembunyikan' : 'Tampilkan' }}</span>
            </button>
          </div>

          <!-- Saldo -->
          <div class="mb-5">
            <p class="text-[10px] text-white/60 uppercase tracking-widest font-bold mb-1.5">Saldo Tersedia</p>
            <div v-if="loading || walletStore.loading" class="h-9 w-36 bg-white/15 rounded-xl animate-pulse" />
            <p v-else class="text-[28px] font-black tracking-tight leading-none">
              {{ isBalanceVisible ? formatCurrency(walletStore.balance) : '••••••••' }}
            </p>
          </div>

          <!-- 3 Card Actions (Flutter _CardAction style: icon box + label) -->
          <div class="border-t border-white/10 pt-4 flex items-center gap-4">
            <!-- Top Up -->
            <button
              id="btn-topup-wallet"
              class="flex flex-col items-center gap-1.5 transition-all active:scale-90"
              @click="showTopUpModal = true"
            >
              <div class="w-10 h-10 rounded-[12px] bg-white/20 border border-white/10 flex items-center justify-center hover:bg-white/30 transition-all">
                <Plus class="w-5 h-5 text-white" stroke-width="2.5" />
              </div>
              <span class="text-[10px] text-white/70 font-semibold">Top Up</span>
            </button>

            <!-- Tarik Saldo -->
            <NuxtLink
              to="/wallet/withdraw"
              class="flex flex-col items-center gap-1.5 transition-all active:scale-90"
            >
              <div class="w-10 h-10 rounded-[12px] bg-white/20 border border-white/10 flex items-center justify-center hover:bg-white/30 transition-all">
                <Wallet class="w-5 h-5 text-white" />
              </div>
              <span class="text-[10px] text-white/70 font-semibold">Tarik</span>
            </NuxtLink>

            <!-- Riwayat -->
            <NuxtLink
              to="/wallet/history"
              class="flex flex-col items-center gap-1.5 transition-all active:scale-90"
            >
              <div class="w-10 h-10 rounded-[12px] bg-white/20 border border-white/10 flex items-center justify-center hover:bg-white/30 transition-all">
                <RotateCcw class="w-5 h-5 text-white" />
              </div>
              <span class="text-[10px] text-white/70 font-semibold">Riwayat</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ── 3. QUICK ACTIONS — Grouped Grid 4-Column (Flutter _QuickActionsGrid) ── -->
      <div class="space-y-5">

        <!-- Group 1: Order & Pesanan -->
        <div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-0.5">Order &amp; Pesanan</p>
          <div class="grid grid-cols-4 gap-3">
            <template v-for="item in orderActions" :key="item.label">
              <NuxtLink
                :to="item.to"
                class="flex flex-col items-center gap-2 group active:scale-90 transition-all"
              >
                <div
                  class="w-12 h-12 rounded-[14px] flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
                  :class="item.color"
                >
                  <component :is="item.icon" class="w-5 h-5" :class="item.iconColor" />
                </div>
                <span class="text-[9.5px] font-semibold text-slate-700 text-center leading-tight">{{ item.label }}</span>
              </NuxtLink>
            </template>
          </div>
        </div>

        <!-- Group 2: Akun & Dompet -->
        <div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-0.5">Akun &amp; Dompet</p>
          <div class="grid grid-cols-4 gap-3">
            <template v-for="item in accountActions" :key="item.label">
              <!-- Action with handler (no route) -->
              <button
                v-if="item.action"
                class="flex flex-col items-center gap-2 group active:scale-90 transition-all"
                @click="item.action()"
              >
                <div
                  class="w-12 h-12 rounded-[14px] flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
                  :class="item.color"
                >
                  <component :is="item.icon" class="w-5 h-5" :class="item.iconColor" />
                </div>
                <span class="text-[9.5px] font-semibold text-slate-700 text-center leading-tight whitespace-pre-line">{{ item.label }}</span>
              </button>

              <!-- Action with route -->
              <NuxtLink
                v-else
                :to="item.to"
                class="flex flex-col items-center gap-2 group active:scale-90 transition-all"
              >
                <div
                  class="w-12 h-12 rounded-[14px] flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
                  :class="item.color"
                >
                  <component :is="item.icon" class="w-5 h-5" :class="item.iconColor" />
                </div>
                <span class="text-[9.5px] font-semibold text-slate-700 text-center leading-tight whitespace-pre-line">{{ item.label }}</span>
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>

      <!-- ── 4. AKTIVITAS HARI INI (Redesigned) ── -->
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
                  :class="getStatusColor(order.status).bg"
                >
                  <component :is="getStatusIcon(order.status)" class="w-4 h-4" :class="getStatusColor(order.status).icon" />
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
                        :class="[getStatusColor(order.status).bg, getStatusColor(order.status).text, getStatusColor(order.status).border]"
                      >
                        {{ getStatusLabel(order.status) }}
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
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5" style="animation: slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);">
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
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-5 duration-300">
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

          <div class="text-center space-y-2">
            <div class="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
              <QrCode class="w-6 h-6" />
            </div>
            <h3 class="text-base font-extrabold text-slate-900">Pembayaran QRIS</h3>
            <p class="text-xs text-slate-400">Scan QR Code di bawah menggunakan GoPay, OVO, Dana, LinkAja, atau Mobile Banking</p>
          </div>

          <!-- QRIS Image -->
          <div class="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-slate-100 space-y-3">
            <img 
              :src="`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(activeQrisString)}`" 
              alt="QRIS Code" 
              class="w-48 h-48 object-contain rounded-xl shadow-md bg-white border border-slate-100"
            >
            <div class="text-center space-y-1">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pembayaran</span>
              <p class="text-lg font-black text-slate-900">{{ formatCurrency(activeTopUpAmount) }}</p>
              <p class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md inline-block">Ref: {{ activeTopUpReference }}</p>
            </div>
          </div>

          <!-- Sandbox Instruction -->
          <div class="bg-amber-50 border border-amber-200/50 p-3.5 rounded-xl space-y-1">
            <div class="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
              <HelpCircle class="w-4 h-4 shrink-0" />
              <span>Mode Sandbox (Simulasi)</span>
            </div>
            <p class="text-[10px] text-amber-700 leading-normal text-left">
              Silakan lakukan simulasi bayar melalui <strong>Midtrans MAP Dashboard</strong> pada detail transaksi dengan ID order <code>{{ activeTopUpReference }}</code> agar status menjadi sukses.
            </p>
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