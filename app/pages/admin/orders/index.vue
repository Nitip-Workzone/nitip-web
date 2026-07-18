<script setup lang="ts">
import { 
  ShoppingBag, 
  Search, 
  Eye, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  XCircle,
} from '@lucide/vue'
import { useOrdersStore, type AdminOrder } from '~/stores/orders'

definePageMeta({
  layout: 'admin',
})

const ordersStore = useOrdersStore()
const { success, error: toastError } = useToast()

const searchQuery = ref('')
const selectedOrder = ref<AdminOrder | null>(null)
const showDetail = ref(false)

onMounted(() => {
  ordersStore.fetchOrders()
})

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Purchasing', value: 'purchasing' },
  { label: 'Delivering', value: 'delivering' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Disputed', value: 'disputed' },
]

const displayedOrders = computed(() => {
  if (!searchQuery.value.trim()) return ordersStore.orders
  const q = searchQuery.value.toLowerCase()
  return ordersStore.orders.filter(
    (o) => o.id.toLowerCase().includes(q) || o.item_details.toLowerCase().includes(q)
  )
})

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'pending': return 'warning'
    case 'disputed': return 'destructive'
    case 'cancelled': return 'secondary'
    case 'accepted':
    case 'purchasing':
    case 'delivering': return 'info'
    default: return 'secondary'
  }
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

const handleCancelOrder = async (id: string) => {
  if (!confirm('Are you sure you want to FORCE CANCEL this order? This bypasses standard flow.')) return
  const ok = await ordersStore.cancelOrder(id)
  if (ok) success('Order cancelled successfully')
  else toastError('Failed to cancel order')
}

const handleResolveDispute = async (id: string, side: typeof ROLE_REQUESTER | typeof ROLE_RUNNER) => {
  if (!confirm(`Resolve dispute in favor of ${side}?`)) return
  const ok = await ordersStore.resolveDispute(id, side)
  if (ok) success(`Dispute resolved for ${side}`)
  else toastError('Failed to resolve dispute')
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">Order Management</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Monitor and manage all delivery orders across the platform.
        </p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="ordersStore.loading"
        @click="ordersStore.fetchOrders()"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </UiButton>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search Order ID or items…"
          class="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
        >
      </div>

      <select
        v-model="ordersStore.filters.status"
        class="h-10 rounded-md border border-input bg-background/50 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer"
        @change="ordersStore.fetchOrders()"
      >
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Data Table -->
    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div v-if="ordersStore.loading" class="p-12 flex justify-center">
        <RefreshCw class="w-8 h-8 text-primary animate-spin" />
      </div>

      <div v-else-if="displayedOrders.length === 0" class="py-20 text-center">
        <ShoppingBag class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p class="font-semibold">No orders found</p>
        <p class="text-sm text-muted-foreground">Try changing your filters or search query.</p>
      </div>

      <template v-else>
        <UiTable>
          <UiTableHeader>
            <UiTableRow :header="true">
              <UiTableHead>Order ID / Date</UiTableHead>
              <UiTableHead>Item Details</UiTableHead>
              <UiTableHead>Cost + Fee</UiTableHead>
              <UiTableHead>Status</UiTableHead>
              <UiTableHead class="text-right">Actions</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="order in displayedOrders" :key="order.id" :class="{'bg-destructive/5': order.status === 'disputed'}">
              <UiTableCell>
                <div class="flex flex-col">
                  <span class="font-mono text-[11px] font-bold text-primary">{{ order.id.substring(0, 8) }}...</span>
                  <span class="text-[10px] text-muted-foreground">{{ formatDate(order.created_at) }}</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                <p class="text-[13px] font-medium max-w-[200px] truncate">{{ order.item_details }}</p>
              </UiTableCell>
              <UiTableCell>
                <div class="text-[12px]">
                  <p class="font-bold">{{ formatCurrency(order.estimated_cost + order.delivery_fee) }}</p>
                  <p class="text-[10px] text-muted-foreground">Fee: {{ formatCurrency(order.delivery_fee) }}</p>
                </div>
              </UiTableCell>
              <UiTableCell>
                <div class="flex flex-col gap-1">
                  <UiBadge :variant="getStatusVariant(order.status)">{{ order.status }}</UiBadge>
                  <span class="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">{{ order.payment_status }}</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Dispute Resolution buttons if disputed -->
                  <template v-if="order.status === 'disputed'">
                    <button 
                      class="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                      title="Resolve for Runner"
                      @click="handleResolveDispute(order.id, ROLE_RUNNER)"
                    >
                      <CheckCircle2 class="w-4 h-4" />
                    </button>
                    <button 
                      class="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                      title="Refund Requester"
                      @click="handleResolveDispute(order.id, ROLE_REQUESTER)"
                    >
                      <XCircle class="w-4 h-4" />
                    </button>
                  </template>

                  <button 
                    class="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                    title="View Details"
                    @click="selectedOrder = order; showDetail = true"
                  >
                    <Eye class="w-4 h-4" />
                  </button>

                  <button 
                    v-if="['pending', 'accepted', 'purchasing', 'delivering'].includes(order.status)"
                    class="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                    title="Force Cancel"
                    @click="handleCancelOrder(order.id)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>
      </template>
    </div>

    <!-- Order Detail Component (Placeholder for Modal/Drawer) -->
    <AdminOrderDetailModal
      v-if="showDetail && selectedOrder"
      v-model:open="showDetail"
      :order="selectedOrder"
      @updated="ordersStore.fetchOrders()"
    />
  </div>
</template>
