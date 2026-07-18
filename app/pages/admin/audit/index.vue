<script setup lang="ts">
import { History, Eye, RefreshCw, ChevronLeft, ChevronRight, Filter } from '@lucide/vue'
import { useAuditStore, type AuditLog } from '~/stores/audit'
import { useUsersStore } from '~/stores/users'

definePageMeta({
  layout: 'admin',
})

const auditStore = useAuditStore()
const usersStore = useUsersStore()

const selectedLog = ref<AuditLog | null>(null)
const showDetailModal = ref(false)
const selectedActionFilter = ref('')

const fetchAll = async (page: number = 1) => {
  await Promise.all([
    auditStore.fetchAuditLogs(page, selectedActionFilter.value),
    usersStore.fetchUsers()
  ])
}

onMounted(() => {
  fetchAll()
})

const getUserName = (userId: string | null) => {
  if (!userId) return 'Sistem (Auto)'
  const u = usersStore.users.find((user) => user.id === userId)
  return u ? u.name : `User (${userId.substring(0, 8)}...)`
}

const openDetail = (log: AuditLog) => {
  selectedLog.value = log
  showDetailModal.value = true
}

const handleFilterChange = () => {
  fetchAll(1)
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

const getActionColor = (action: string) => {
  if (action.includes('REJECT') || action.includes('CANCEL') || action.includes('SUSPEND')) {
    return 'bg-red-500/10 text-red-600 border-red-200'
  }
  if (action.includes('APPROVE') || action.includes('COMPLETE') || action.includes('VERIFY')) {
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
  }
  if (action.includes('CREATE') || action.includes('ACCEPT')) {
    return 'bg-blue-500/10 text-blue-600 border-blue-200'
  }
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

// Action list for filtering
const actionTypes = [
  { label: 'Semua Aksi', value: '' },
  { label: 'Wallet Deposit', value: 'WALLET_DEPOSIT' },
  { label: 'Wallet Withdrawal', value: 'WALLET_WITHDRAWAL' },
  { label: 'KYC Approval', value: 'KYC_APPROVAL' },
  { label: 'KYC Rejection', value: 'KYC_REJECTION' },
  { label: 'User Suspend', value: 'USER_SUSPEND' },
  { label: 'User Unsuspend', value: 'USER_UNSUSPEND' },
  { label: 'User Verify', value: 'USER_VERIFY' },
  { label: 'Order Create', value: 'ORDER_CREATE' },
  { label: 'Order Accept', value: 'ORDER_ACCEPT' },
  { label: 'Order Complete', value: 'ORDER_COMPLETE' },
  { label: 'Order Cancel', value: 'ORDER_CANCEL' },
]

const totalPages = computed(() => Math.ceil(auditStore.total / auditStore.limit))
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">Audit Logs</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Pantau log transaksi finansial, perubahan status pengguna, dan eksekusi pesanan sistem.
        </p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="auditStore.loading"
        @click="fetchAll(auditStore.page)"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </UiButton>
    </div>

    <!-- Filter toolbar -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-xs">
        <Filter class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <select
          v-model="selectedActionFilter"
          class="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer appearance-none"
          @change="handleFilterChange"
        >
          <option v-for="opt in actionTypes" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Logs Table Card -->
    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <!-- Loading state -->
      <div v-if="auditStore.loading" class="divide-y divide-border/50 bg-card p-4 space-y-4">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="auditStore.logs.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center gap-3"
      >
        <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <History class="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p class="font-semibold text-foreground">Tidak ada log audit ditemukan</p>
          <p class="text-sm text-muted-foreground mt-0.5">Cobalah mengubah filter pencarian Anda.</p>
        </div>
      </div>

      <!-- Data Table -->
      <template v-else>
        <UiTable>
          <UiTableHeader>
            <UiTableRow :header="true">
              <UiTableHead>Waktu</UiTableHead>
              <UiTableHead>Pelaku</UiTableHead>
              <UiTableHead>Aksi</UiTableHead>
              <UiTableHead>Sumber Daya</UiTableHead>
              <UiTableHead class="hidden md:table-cell">IP Address</UiTableHead>
              <UiTableHead class="text-right">Aksi</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="log in auditStore.logs" :key="log.id">
              <UiTableCell class="text-xs text-muted-foreground whitespace-nowrap">
                {{ formatDate(log.created_at) }}
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {{ getUserName(log.user_id).substring(0, 2).toUpperCase() }}
                  </div>
                  <span class="text-xs font-semibold text-slate-800">{{ getUserName(log.user_id) }}</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                <span 
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border"
                  :class="getActionColor(log.action)"
                >
                  {{ log.action }}
                </span>
              </UiTableCell>
              <UiTableCell class="text-xs">
                <span class="font-bold text-slate-700 capitalize">{{ log.resource }}</span>
                <span v-if="log.resource_id" class="text-muted-foreground font-mono ml-1 text-[10px]">
                  ({{ log.resource_id.substring(0, 8) }}...)
                </span>
              </UiTableCell>
              <UiTableCell class="hidden md:table-cell text-xs font-mono text-slate-500">
                {{ log.ip_address || '127.0.0.1' }}
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center justify-end">
                  <UiButton variant="secondary" size="sm" @click="openDetail(log)">
                    <Eye class="w-3.5 h-3.5 mr-1.5" />
                    Detail
                  </UiButton>
                </div>
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>

        <!-- Pagination Footer -->
        <div class="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
          <p class="text-xs text-muted-foreground">
            Menampilkan
            <span class="font-semibold text-foreground">{{ auditStore.logs.length }}</span>
            dari
            <span class="font-semibold text-foreground">{{ auditStore.total }}</span>
            log
          </p>
          <div class="flex items-center gap-1.5">
            <button
              class="h-8 w-8 rounded-md flex items-center justify-center border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40"
              :disabled="auditStore.page <= 1"
              @click="fetchAll(auditStore.page - 1)"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-xs font-semibold text-slate-800 px-2">Hal {{ auditStore.page }} dari {{ totalPages }}</span>
            <button
              class="h-8 w-8 rounded-md flex items-center justify-center border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40"
              :disabled="auditStore.page >= totalPages"
              @click="fetchAll(auditStore.page + 1)"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Detail Modal -->
    <UiModal v-model:open="showDetailModal" title="Detail Log Audit">
      <div v-if="selectedLog" class="space-y-4 text-xs max-h-[70vh] overflow-y-auto p-1">
        <!-- Log metadata -->
        <div class="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div>
            <p class="font-bold text-muted-foreground uppercase text-[9px]">Aksi</p>
            <p class="font-semibold text-slate-800 mt-0.5">{{ selectedLog.action }}</p>
          </div>
          <div>
            <p class="font-bold text-muted-foreground uppercase text-[9px]">Sumber Daya (ID)</p>
            <p class="font-mono text-slate-800 mt-0.5">{{ selectedLog.resource }} ({{ selectedLog.resource_id }})</p>
          </div>
          <div>
            <p class="font-bold text-muted-foreground uppercase text-[9px]">Pelaku</p>
            <p class="font-semibold text-slate-800 mt-0.5">{{ getUserName(selectedLog.user_id) }}</p>
          </div>
          <div>
            <p class="font-bold text-muted-foreground uppercase text-[9px]">Waktu Kejadian</p>
            <p class="font-semibold text-slate-800 mt-0.5">{{ formatDate(selectedLog.created_at) }}</p>
          </div>
          <div class="col-span-2">
            <p class="font-bold text-muted-foreground uppercase text-[9px]">User Agent</p>
            <p class="text-slate-500 font-mono mt-0.5 break-all">{{ selectedLog.user_agent || 'N/A' }}</p>
          </div>
        </div>

        <!-- Values changes (JSON block) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-muted-foreground uppercase">Nilai Lama (Old Values)</label>
            <pre class="p-3 bg-slate-900 text-slate-200 font-mono text-[10px] rounded-2xl overflow-x-auto max-h-52">{{ selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '{}' }}</pre>
          </div>
          <div class="space-y-1.5">
            <label class="text-[9px] font-bold text-muted-foreground uppercase">Nilai Baru (New Values)</label>
            <pre class="p-3 bg-slate-900 text-slate-200 font-mono text-[10px] rounded-2xl overflow-x-auto max-h-52">{{ selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '{}' }}</pre>
          </div>
        </div>

        <!-- Close button -->
        <div class="flex pt-2">
          <UiButton
            class="flex-1"
            variant="secondary"
            @click="showDetailModal = false"
          >
            Tutup
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
