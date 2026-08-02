<script setup lang="ts">
import { 
  Zap, 
  ShoppingBag, 
  Wallet, 
  Play, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw,
  Clock,
  Ban
} from '@lucide/vue'
import { useOrdersStore, type AdminOrder } from '~/stores/orders'

definePageMeta({
  layout: 'admin',
})

const ordersStore = useOrdersStore()
const { request } = useApi()
const { success: toastSuccess, error: toastError } = useToast()

const activeTab = ref<'order' | 'topup'>('order')
const loading = ref(false)
const consoleOutput = ref('')

// List filter and search
const listFilter = ref<'all' | 'pending' | 'success' | 'failed'>('all')
const listSearchQuery = ref('')

// Form States
const orderForm = ref({
  orderId: '',
  notificationId: '',
})

const topupForm = ref({
  reference: '',
  notificationId: '',
})

const appendToConsole = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  const time = new Date().toLocaleTimeString('id-ID')
  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
  consoleOutput.value += `[${time}] ${prefix} ${msg}\n`
}

onMounted(() => {
  ordersStore.fetchOrders()
})

// Filtered Orders for the list
const filteredOrders = computed(() => {
  let list = ordersStore.orders

  // 1. Status Filter
  if (listFilter.value === 'pending') {
    list = list.filter(o => o.status === 'pending' || o.payment_status === 'unpaid')
  } else if (listFilter.value === 'success') {
    list = list.filter(o => o.payment_status === 'paid')
  } else if (listFilter.value === 'failed') {
    list = list.filter(o => o.status === 'cancelled')
  }

  // 2. Search Query
  if (listSearchQuery.value.trim()) {
    const q = listSearchQuery.value.toLowerCase()
    list = list.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.item_details.toLowerCase().includes(q)
    )
  }

  return list
})

// Trigger Handlers from Form
const handleOrderTrigger = async () => {
  const id = orderForm.value.orderId.trim()
  const notifId = orderForm.value.notificationId.trim()

  if (!id) {
    toastError('Order ID wajib diisi!')
    return
  }

  loading.value = true
  appendToConsole(`Mencoba trigger pembayaran manual untuk Order ID: ${id}...`, 'info')

  try {
    const res = await request<{ success: boolean; message: string }>(`/admin/orders/${id}/pay`, {
      method: 'POST',
      body: {
        notification_id: notifId || undefined,
      },
    })

    if (res.success !== false) {
      toastSuccess('Order berhasil dibayarkan!')
      appendToConsole(`SUKSES: Order ${id} telah ditandai sebagai LUNAS.`, 'success')
      if (res.message) appendToConsole(`Backend: ${res.message}`, 'info')
      orderForm.value.orderId = ''
      orderForm.value.notificationId = ''
      await ordersStore.fetchOrders()
    } else {
      toastError(res.message || 'Gagal memproses transaksi')
      appendToConsole(`GAGAL: ${res.message || 'Error tidak dikenal'}`, 'error')
    }
  } catch (err: any) {
    const errorMsg = err?.data?.message || err?.message || 'Koneksi gagal atau data tidak valid'
    toastError(errorMsg)
    appendToConsole(`ERROR: ${errorMsg}`, 'error')
  } finally {
    loading.value = false
  }
}

const handleTopupTrigger = async () => {
  const refId = topupForm.value.reference.trim()
  const notifId = topupForm.value.notificationId.trim()

  if (!refId) {
    toastError('Reference ID wajib diisi!')
    return
  }

  loading.value = true
  appendToConsole(`Mencoba trigger finalisasi manual untuk Top-Up Ref: ${refId}...`, 'info')

  try {
    const res = await request<{ success: boolean; message: string }>(`/admin/wallets/topup/${refId}/finalize`, {
      method: 'POST',
      body: {
        notification_id: notifId || undefined,
      },
    })

    if (res.success !== false) {
      toastSuccess('Top-up berhasil difinalisasi!')
      appendToConsole(`SUKSES: Top-Up Ref ${refId} berhasil dikreditkan ke wallet user.`, 'success')
      if (res.message) appendToConsole(`Backend: ${res.message}`, 'info')
      topupForm.value.reference = ''
      topupForm.value.notificationId = ''
    } else {
      toastError(res.message || 'Gagal memproses top-up')
      appendToConsole(`GAGAL: ${res.message || 'Error tidak dikenal'}`, 'error')
    }
  } catch (err: any) {
    const errorMsg = err?.data?.message || err?.message || 'Koneksi gagal atau data tidak valid'
    toastError(errorMsg)
    appendToConsole(`ERROR: ${errorMsg}`, 'error')
  } finally {
    loading.value = false
  }
}

// Trigger Handlers from List Actions
const triggerListSuccess = async (order: AdminOrder) => {
  const notifId = prompt(`Masukkan Notification ID untuk Order ${order.id.substring(0, 8)} (opsional):`, `MANUAL_PAY_${Date.now()}`)
  if (notifId === null) return // user cancelled prompt

  loading.value = true
  appendToConsole(`Mencoba trigger pembayaran manual untuk Order ID: ${order.id}...`, 'info')

  try {
    const res = await request<{ success: boolean; message: string }>(`/admin/orders/${order.id}/pay`, {
      method: 'POST',
      body: {
        notification_id: notifId.trim() || undefined,
      },
    })

    if (res.success !== false) {
      toastSuccess('Status Pembayaran Order diperbarui ke PAID!')
      appendToConsole(`SUKSES: Order ${order.id} berhasil ditandai sebagai PAID.`, 'success')
      await ordersStore.fetchOrders()
    } else {
      toastError(res.message || 'Gagal memperbarui status order')
      appendToConsole(`GAGAL: ${res.message}`, 'error')
    }
  } catch (err: any) {
    const errorMsg = err?.data?.message || err?.message || 'Koneksi gagal'
    toastError(errorMsg)
    appendToConsole(`ERROR: ${errorMsg}`, 'error')
  } finally {
    loading.value = false
  }
}

const triggerListFailed = async (order: AdminOrder) => {
  if (!confirm(`Apakah Anda yakin ingin membatalkan (FAIL/CANCEL) Order ${order.id.substring(0, 8)} ini?`)) return

  loading.value = true
  appendToConsole(`Mencoba membatalkan (FORCE CANCEL) Order ID: ${order.id}...`, 'info')

  try {
    const res = await request<{ success: boolean; message: string }>(`/admin/orders/${order.id}/cancel`, {
      method: 'POST',
    })

    if (res.success !== false) {
      toastSuccess('Order berhasil dibatalkan (FAILED)!')
      appendToConsole(`SUKSES: Order ${order.id} ditandai sebagai CANCELLED.`, 'success')
      await ordersStore.fetchOrders()
    } else {
      toastError(res.message || 'Gagal membatalkan order')
      appendToConsole(`GAGAL: ${res.message}`, 'error')
    }
  } catch (err: any) {
    const errorMsg = err?.data?.message || err?.message || 'Koneksi gagal'
    toastError(errorMsg)
    appendToConsole(`ERROR: ${errorMsg}`, 'error')
  } finally {
    loading.value = false
  }
}

const getPaymentStatusBadge = (status: string) => {
  return status === 'paid' ? 'success' : 'warning'
}

const getOrderStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'cancelled': return 'secondary'
    case 'disputed': return 'destructive'
    case 'pending': return 'warning'
    default: return 'info'
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">Manual Transaction Trigger</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Picu penyelesaian manual (SUCCESS/FAILED) untuk transaksi tertunda akibat gangguan listener atau gateway.
        </p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="ordersStore.loading"
        @click="ordersStore.fetchOrders()"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh Data
      </UiButton>
    </div>

    <!-- Info Warning Alert -->
    <div class="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-600 flex gap-3 text-xs leading-relaxed">
      <Info class="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
      <div>
        <p class="font-extrabold uppercase tracking-wider mb-0.5">Proteksi Keamanan Idempotency</p>
        Pemicuan ini dilindungi secara ketat. Memasukkan <span class="font-bold">Notification ID</span> akan mendaftarkan token tersebut ke dalam Redis cache selama 24 jam untuk mencegah penyelesaian ganda otomatis jika di kemudian hari notifikasi bank asli diterima oleh aplikasi listener Android.
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Input Panel (Left, Span 2) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Tabs Selector -->
        <div class="flex border border-border/50 rounded-2xl p-1 bg-muted/30">
          <button
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
            :class="[activeTab === 'order' ? 'bg-background text-primary shadow-sm border border-border/30' : 'text-muted-foreground hover:text-foreground']"
            @click="activeTab = 'order'"
          >
            <ShoppingBag class="w-4 h-4" />
            Order Payment
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
            :class="[activeTab === 'topup' ? 'bg-background text-primary shadow-sm border border-border/30' : 'text-muted-foreground hover:text-foreground']"
            @click="activeTab = 'topup'"
          >
            <Wallet class="w-4 h-4" />
            Wallet Top-Up
          </button>
        </div>

        <!-- Form Cards -->
        <UiCard class="p-6">
          <!-- Order Form -->
          <div v-if="activeTab === 'order'" class="space-y-4">
            <h3 class="text-sm font-bold text-foreground">Trigger Pembayaran Pesanan</h3>
            <div class="space-y-1">
              <label class="text-[10px] font-extrabold text-muted-foreground uppercase">Order ID (UUID)</label>
              <input
                v-model="orderForm.orderId"
                type="text"
                placeholder="Masukkan ID Pesanan (misal: a8b3cd4e-1234...)"
                class="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all font-mono"
              >
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-extrabold text-muted-foreground uppercase flex items-center gap-1">
                Notification ID (Opsional)
                <span class="text-[8px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">Rekomendasi</span>
              </label>
              <input
                v-model="orderForm.notificationId"
                type="text"
                placeholder="Contoh: MANUAL_PAY_17100000"
                class="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
              >
            </div>

            <UiButton
              class="w-full mt-2"
              variant="primary"
              :loading="loading"
              @click="handleOrderTrigger"
            >
              <Play class="w-4 h-4 mr-2" />
              Proses Pemicuan Pembayaran
            </UiButton>
          </div>

          <!-- Top-Up Form -->
          <div v-else class="space-y-4">
            <h3 class="text-sm font-bold text-foreground">Finalisasi Top-Up Wallet</h3>
            <div class="space-y-1">
              <label class="text-[10px] font-extrabold text-muted-foreground uppercase">Reference ID (Wallet Transaction)</label>
              <input
                v-model="topupForm.reference"
                type="text"
                placeholder="Masukkan Kode Referensi Transaksi (misal: TX171000000)"
                class="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all font-mono"
              >
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-extrabold text-muted-foreground uppercase flex items-center gap-1">
                Notification ID (Opsional)
                <span class="text-[8px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">Rekomendasi</span>
              </label>
              <input
                v-model="topupForm.notificationId"
                type="text"
                placeholder="Contoh: MANUAL_TOPUP_17100000"
                class="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
              >
            </div>

            <UiButton
              class="w-full mt-2"
              variant="primary"
              :loading="loading"
              @click="handleTopupTrigger"
            >
              <Play class="w-4 h-4 mr-2" />
              Proses Finalisasi Top-Up
            </UiButton>
          </div>
        </UiCard>
      </div>

      <!-- Output Panel (Right, Span 1) -->
      <div class="space-y-3 flex flex-col h-full min-h-[300px]">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Pencatatan Respon API</h3>
          <button 
            v-if="consoleOutput" 
            class="text-[10px] font-bold text-destructive hover:underline"
            @click="consoleOutput = ''"
          >
            Clear Output
          </button>
        </div>
        
        <div class="flex-1 rounded-2xl border border-border bg-[#0B0F19] p-4 font-mono text-[10px] leading-relaxed text-sky-400 overflow-y-auto whitespace-pre-wrap min-h-[280px] max-h-[320px]">
          <span v-if="!consoleOutput" class="text-slate-600">// Menunggu pemicuan aksi...</span>
          <span v-else>{{ consoleOutput }}</span>
        </div>
      </div>
    </div>

    <!-- Transaction List Section -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h2 class="text-phi-lg font-bold tracking-tight">Daftar Transaksi Pesanan (Sniffed Orders)</h2>
        
        <!-- List Toolbar -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative max-w-xs">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              v-model="listSearchQuery"
              type="text"
              placeholder="Cari Order ID / item…"
              class="h-9 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>

          <!-- Filter Tabs -->
          <div class="flex border border-border/50 rounded-lg p-0.5 bg-muted/30 text-[11px] font-bold">
            <button
              class="px-3 py-1 rounded-md transition-all"
              :class="[listFilter === 'all' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground']"
              @click="listFilter = 'all'"
            >
              Semua
            </button>
            <button
              class="px-3 py-1 rounded-md transition-all"
              :class="[listFilter === 'pending' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground']"
              @click="listFilter = 'pending'"
            >
              Pending
            </button>
            <button
              class="px-3 py-1 rounded-md transition-all"
              :class="[listFilter === 'success' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground']"
              @click="listFilter = 'success'"
            >
              Success
            </button>
            <button
              class="px-3 py-1 rounded-md transition-all"
              :class="[listFilter === 'failed' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground']"
              @click="listFilter = 'failed'"
            >
              Failed
            </button>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div v-if="ordersStore.loading" class="p-12 flex justify-center">
          <RefreshCw class="w-8 h-8 text-primary animate-spin" />
        </div>

        <div v-else-if="filteredOrders.length === 0" class="py-16 text-center">
          <Ban class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p class="font-semibold text-sm">Tidak ada transaksi pesanan ditemukan</p>
          <p class="text-xs text-muted-foreground mt-0.5">Coba sesuaikan kata kunci pencarian atau filter status.</p>
        </div>

        <template v-else>
          <UiTable>
            <UiTableHeader>
              <UiTableRow :header="true">
                <UiTableHead>Order ID / Tanggal</UiTableHead>
                <UiTableHead>Rincian Barang</UiTableHead>
                <UiTableHead>Nominal Uang</UiTableHead>
                <UiTableHead>Status Pembayaran</UiTableHead>
                <UiTableHead>Status Order</UiTableHead>
                <UiTableHead class="text-right">Aksi Trigger Manual</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              <UiTableRow v-for="order in filteredOrders" :key="order.id">
                <UiTableCell>
                  <div class="flex flex-col">
                    <span class="font-mono text-[10px] font-bold text-primary">{{ order.id.substring(0, 8) }}...</span>
                    <span class="text-[9px] text-muted-foreground">{{ formatDate(order.created_at) }}</span>
                  </div>
                </UiTableCell>
                <UiTableCell>
                  <p class="text-[12px] font-medium max-w-[200px] truncate" :title="order.item_details">
                    {{ order.item_details }}
                  </p>
                </UiTableCell>
                <UiTableCell>
                  <span class="text-[12px] font-bold">{{ formatCurrency(order.estimated_cost + order.delivery_fee) }}</span>
                </UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="getPaymentStatusBadge(order.payment_status)" class="text-[10px]">
                    {{ order.payment_status.toUpperCase() }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="getOrderStatusBadge(order.status)" class="text-[10px]">
                    {{ order.status.toUpperCase() }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell>
                  <div class="flex items-center justify-end gap-2">
                    <!-- Trigger SUCCESS (Pay) -->
                    <button
                      v-if="order.payment_status !== 'paid' && order.status !== 'cancelled'"
                      class="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-[10px] font-bold transition-colors flex items-center gap-1"
                      title="Trigger Success (Mark as Paid)"
                      @click="triggerListSuccess(order)"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" />
                      Success
                    </button>

                    <!-- Trigger FAILED (Cancel) -->
                    <button
                      v-if="order.status !== 'cancelled' && order.status !== 'completed'"
                      class="px-2.5 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive text-[10px] font-bold transition-colors flex items-center gap-1"
                      title="Trigger Failed (Force Cancel)"
                      @click="triggerListFailed(order)"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                      Failed
                    </button>
                    
                    <span v-if="order.payment_status === 'paid' && order.status === 'completed'" class="text-[10px] text-muted-foreground italic mr-2">
                      Selesai
                    </span>
                    <span v-else-if="order.status === 'cancelled'" class="text-[10px] text-muted-foreground italic mr-2">
                      Batal
                    </span>
                  </div>
                </UiTableCell>
              </UiTableRow>
            </UiTableBody>
          </UiTable>
        </template>
      </div>
    </div>
  </div>
</template>
