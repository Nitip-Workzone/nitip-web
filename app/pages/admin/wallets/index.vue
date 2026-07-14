<script setup lang="ts">
import { 
  Wallet, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Search,
  ExternalLink,
  Ban,
  Banknote,
  TrendingUp,
  CalendarDays
} from 'lucide-vue-next'
import { useWalletsStore } from '~/stores/wallets'

definePageMeta({
  layout: 'admin',
})

const walletsStore = useWalletsStore()
const { success, error: toastError } = useToast()

const searchQuery = ref('')

onMounted(() => {
  walletsStore.fetchWithdrawals()
  walletsStore.fetchSystemBalance()
})

const displayedWithdrawals = computed(() => {
  if (!searchQuery.value.trim()) return walletsStore.withdrawals
  const q = searchQuery.value.toLowerCase()
  return walletsStore.withdrawals.filter(
    (w) => w.id.toLowerCase().includes(q) || w.wallet_id.toLowerCase().includes(q)
  )
})

const systemBalance = computed(() => walletsStore.systemBalance)

const handleApprove = async (id: string) => {
  if (!confirm('Approve this withdrawal? The corresponding user balance will be permanently deducted.')) return
  const ok = await walletsStore.approveWithdrawal(id)
  if (ok) success('Withdrawal approved successfully')
  else toastError('Failed to approve withdrawal')
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">Wallet Management</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Review and approve withdrawal requests from runners.
        </p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="walletsStore.loading || walletsStore.systemBalanceLoading"
        @click="walletsStore.fetchWithdrawals(); walletsStore.fetchSystemBalance()"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </UiButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UiCard class="p-4 flex items-center gap-4 bg-primary/5 border-primary/20">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Clock class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Requests</p>
          <p class="text-xl font-bold">{{ walletsStore.withdrawals.length }}</p>
        </div>
      </UiCard>

      <UiCard class="p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <Banknote class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform Revenue</p>
          <div v-if="walletsStore.systemBalanceLoading" class="h-7 w-24 bg-muted animate-pulse rounded mt-1" />
          <p v-else class="text-xl font-bold text-emerald-600">{{ formatCurrency(systemBalance?.balance || 0) }}</p>
        </div>
      </UiCard>

      <UiCard class="p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
          <CalendarDays class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fees Today</p>
          <div v-if="walletsStore.systemBalanceLoading" class="h-7 w-24 bg-muted animate-pulse rounded mt-1" />
          <p v-else class="text-xl font-bold text-blue-600">{{ formatCurrency(systemBalance?.today || 0) }}</p>
        </div>
      </UiCard>

      <UiCard class="p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
          <TrendingUp class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Collected</p>
          <div v-if="walletsStore.systemBalanceLoading" class="h-7 w-24 bg-muted animate-pulse rounded mt-1" />
          <p v-else class="text-xl font-bold text-violet-600">{{ formatCurrency(systemBalance?.total_collected || 0) }}</p>
        </div>
      </UiCard>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search Transaction ID or Wallet ID…"
          class="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
        >
      </div>
    </div>

    <!-- Data Table -->
    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div v-if="walletsStore.loading" class="p-12 flex justify-center">
        <RefreshCw class="w-8 h-8 text-primary animate-spin" />
      </div>

      <div v-else-if="displayedWithdrawals.length === 0" class="py-20 text-center">
        <Ban class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p class="font-semibold">No pending withdrawals</p>
        <p class="text-sm text-muted-foreground">Everything is processed! Good job.</p>
      </div>

      <template v-else>
        <UiTable>
          <UiTableHeader>
            <UiTableRow :header="true">
              <UiTableHead>Transaction ID / Wallet</UiTableHead>
              <UiTableHead>Date Requested</UiTableHead>
              <UiTableHead>Amount</UiTableHead>
              <UiTableHead>Status</UiTableHead>
              <UiTableHead class="text-right">Actions</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="tx in displayedWithdrawals" :key="tx.id">
              <UiTableCell>
                <div class="flex flex-col">
                  <span class="font-mono text-[11px] font-bold text-primary">{{ tx.id.substring(0, 8) }}...</span>
                  <span class="text-[10px] text-muted-foreground truncate max-w-[120px]">Wallet: {{ tx.wallet_id.substring(0, 8) }}...</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                <span class="text-[12px]">{{ formatDate(tx.created_at) }}</span>
              </UiTableCell>
              <UiTableCell>
                <p class="font-bold text-[14px] text-destructive">
                   - {{ formatCurrency(tx.amount) }}
                 </p>
              </UiTableCell>
              <UiTableCell>
                <UiBadge variant="warning" class="text-[10px]">Pending Approval</UiBadge>
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center justify-end gap-2">
                  <UiButton 
                    variant="ghost" 
                    size="sm" 
                    class="h-8 w-8 p-0"
                    title="View Wallet Details"
                  >
                    <ExternalLink class="w-4 h-4" />
                  </UiButton>
                  <UiButton 
                    variant="primary" 
                    size="sm" 
                    class="h-8 px-3 text-xs font-bold"
                    @click="handleApprove(tx.id)"
                  >
                    Approve
                  </UiButton>
                </div>
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>
      </template>
    </div>
  </div>
</template>
