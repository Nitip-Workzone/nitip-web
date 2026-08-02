<script setup lang="ts">
import { Zap, ShoppingBag, Wallet, Play, Info, CheckCircle2, AlertCircle } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
})

const { request } = useApi()
const { success: toastSuccess, error: toastError } = useToast()

const activeTab = ref<'order' | 'topup'>('order')
const loading = ref(false)
const consoleOutput = ref('')

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
      if (res.message) appendToConsole(`Backend msg: ${res.message}`, 'info')
      orderForm.value.orderId = ''
      orderForm.value.notificationId = ''
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
      if (res.message) appendToConsole(`Backend msg: ${res.message}`, 'info')
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
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Page Header -->
    <div>
      <h1 class="text-phi-xl font-bold tracking-tight">Manual Transaction Trigger</h1>
      <p class="text-sm text-muted-foreground mt-0.5">
        Picu penyelesaian manual untuk transaksi tertunda akibat gangguan listener atau gateway.
      </p>
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
        
        <div class="flex-1 rounded-2xl border border-border bg-[#0B0F19] p-4 font-mono text-[10px] leading-relaxed text-sky-400 overflow-y-auto whitespace-pre-wrap min-h-[280px] max-h-[400px]">
          <span v-if="!consoleOutput" class="text-slate-600">// Menunggu pemicuan aksi...</span>
          <span v-else>{{ consoleOutput }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
