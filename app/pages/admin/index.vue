<script setup lang="ts">
import { 
  Users, 
  ShoppingBag, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Clock,
  Banknote
} from 'lucide-vue-next'
import { useUsersStore } from '~/stores/users'
import { useOrdersStore } from '~/stores/orders'
import { useWalletsStore } from '~/stores/wallets'

definePageMeta({
  layout: 'admin'
})

const usersStore = useUsersStore()
const ordersStore = useOrdersStore()
const walletsStore = useWalletsStore()

const loading = ref(true)

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    usersStore.fetchUsers(),
    ordersStore.fetchOrders(),
    walletsStore.fetchWithdrawals(),
    walletsStore.fetchSystemBalance()
  ])
  loading.value = false
})

const platformRevenue = computed(() => {
  if (!walletsStore.systemBalance) return '...'
  return formatCurrency(walletsStore.systemBalance.balance)
})

const stats = computed(() => [
  { name: 'Total Users', value: usersStore.users.length.toString(), icon: Users, change: '+12%', changeType: 'increase' },
  { name: 'All Orders', value: ordersStore.orders.length.toString(), icon: ShoppingBag, change: '+5%', changeType: 'increase' },
  { name: 'Platform Revenue', value: platformRevenue.value, icon: Banknote, change: formatCurrency(walletsStore.systemBalance?.today || 0), changeType: 'increase' },
  { name: 'Pending Withdraw', value: walletsStore.withdrawals.length.toString(), icon: Wallet, change: 'NOW', changeType: 'increase' },
])

const recentOrders = computed(() => ordersStore.orders.slice(0, 5))

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-500'
    case 'pending': return 'bg-amber-500/10 text-amber-500'
    case 'disputed': return 'bg-destructive/10 text-destructive'
    default: return 'bg-blue-500/10 text-blue-500'
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <!-- Header -->
    <div class="flex flex-col gap-2">
      <h1 class="text-phi-xl font-bold tracking-tight">Dashboard Overview</h1>
      <p class="text-muted-foreground">Welcome to the Nitip Admin panel. Here's what's happening today.</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UiCard v-for="stat in stats" :key="stat.name" class="p-6 hover:border-primary/50 transition-colors group">
        <div class="flex items-start justify-between">
          <div class="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <component :is="stat.icon" class="w-5 h-5" />
          </div>
          <div class="flex items-center gap-1 text-xs font-semibold" :class="stat.changeType === 'increase' ? 'text-emerald-500' : 'text-destructive'">
            <span>{{ stat.change }}</span>
            <ArrowUpRight v-if="stat.changeType === 'increase'" class="w-3 h-3" />
            <ArrowDownRight v-else class="w-3 h-3" />
          </div>
        </div>
        <div class="mt-4">
          <p class="text-sm font-medium text-muted-foreground">{{ stat.name }}</p>
          <div v-if="loading" class="h-8 w-20 bg-muted animate-pulse rounded mt-1" />
          <p v-else class="text-phi-lg font-bold mt-1">{{ stat.value }}</p>
        </div>
      </UiCard>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Recent Activity -->
      <UiCard class="xl:col-span-2" title="Recent Orders" description="The latest orders processed through the platform.">
        <template #default>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead>
                <tr class="text-muted-foreground border-b border-border/50">
                  <th class="pb-4 font-medium px-4">Order ID</th>
                  <th class="pb-4 font-medium px-4">Item</th>
                  <th class="pb-4 font-medium px-4">Amount</th>
                  <th class="pb-4 font-medium px-4">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/50">
                <tr v-if="loading">
                  <td colspan="4" class="py-8 text-center text-muted-foreground animate-pulse">Loading orders...</td>
                </tr>
                <tr v-else-if="recentOrders.length === 0">
                  <td colspan="4" class="py-8 text-center text-muted-foreground">No orders yet.</td>
                </tr>
                <tr v-for="order in recentOrders" :key="order.id" class="hover:bg-accent/30 transition-colors group">
                  <td class="py-4 px-4 font-medium text-[11px] font-mono text-primary">{{ order.id.substring(0, 8) }}...</td>
                  <td class="py-4 px-4 text-muted-foreground max-w-[200px] truncate">{{ order.item_details }}</td>
                  <td class="py-4 px-4 font-bold text-xs">Rp {{ (order.estimated_cost + order.delivery_fee).toLocaleString() }}</td>
                  <td class="py-4 px-4">
                    <span 
                      class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      :class="getStatusVariant(order.status)"
                    >
                      {{ order.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <template #footer>
          <UiButton to="/admin/orders" variant="ghost" size="sm" class="w-full mt-4">View All Orders</UiButton>
        </template>
      </UiCard>

      <!-- System Status -->
      <div class="space-y-6">
        <UiCard title="System Performance">
          <div class="space-y-6">
            <div v-for="i in 3" :key="i" class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-muted-foreground">Server Load {{ i }}</span>
                <span>{{ 40 + (i * 15) }}%</span>
              </div>
              <div class="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div class="h-full bg-primary transition-all duration-1000" :style="{ width: (40 + (i * 15)) + '%' }"/>
              </div>
            </div>
          </div>
        </UiCard>

        <UiCard title="Quick Actions">
          <div class="grid grid-cols-2 gap-2">
            <UiButton variant="secondary" size="sm" class="text-xs h-16 flex-col gap-1">
              <Users class="w-4 h-4" />
              New User
            </UiButton>
            <UiButton variant="secondary" size="sm" class="text-xs h-16 flex-col gap-1">
              <Clock class="w-4 h-4" />
              System Logs
            </UiButton>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
