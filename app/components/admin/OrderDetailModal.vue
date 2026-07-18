<script setup lang="ts">
import { 
  X, 
  ShoppingBag, 
  User, 
  MapPin, 
  Package, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  ExternalLink,
  History
} from '@lucide/vue'
import type { AdminOrder } from '~/stores/orders'

const props = defineProps<{
  open: boolean
  order: AdminOrder | null
}>()

const emit = defineEmits(['update:open', 'updated'])

const ordersStore = useOrdersStore()
const { success, error: toastError } = useToast()

const handleClose = () => emit('update:open', false)

const handleCancel = async () => {
  if (!props.order) return
  if (!confirm('Cancel this order?')) return
  const ok = await ordersStore.cancelOrder(props.order.id)
  if (ok) {
    success('Order cancelled')
    emit('updated')
    handleClose()
  } else {
    toastError('Failed to cancel order')
  }
}

const handleResolve = async (side: typeof ROLE_REQUESTER | typeof ROLE_RUNNER) => {
  if (!props.order) return
  if (!confirm(`Resolve in favor of ${side}?`)) return
  const ok = await ordersStore.resolveDispute(props.order.id, side)
  if (ok) {
    success(`Resolved for ${side}`)
    emit('updated')
    handleClose()
  } else {
    toastError('Failed to resolve dispute')
  }
}

const formatDate = (date: string) =>
  new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}
</script>

<template>
  <Transition name="fade">
    <div v-if="open && order" class="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleClose" />
      
      <div 
        class="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-phi-base leading-none">Order Details</h3>
              <p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-mono">{{ order.id }}</p>
            </div>
          </div>
          <button class="p-2 rounded-full hover:bg-muted transition-colors" @click="handleClose">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          <!-- Status Ribbon -->
          <div class="flex items-center justify-between p-4 rounded-2xl bg-secondary/50 border border-border/50">
            <div class="space-y-1">
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter text-center">Current Status</p>
              <UiBadge :variant="order.status === 'completed' ? 'success' : order.status === 'disputed' ? 'destructive' : 'info'" class="px-4 py-1 text-xs">
                {{ order.status.toUpperCase() }}
              </UiBadge>
            </div>
            <div class="h-8 w-px bg-border/50 mx-4" />
            <div class="space-y-1">
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter text-center">Payment</p>
              <UiBadge variant="secondary" class="px-4 py-1 text-xs">
                {{ order.payment_status.toUpperCase() }}
              </UiBadge>
            </div>
            <div class="h-8 w-px bg-border/50 mx-4" />
            <div class="space-y-1 text-right">
              <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Total Amount</p>
              <p class="text-lg font-bold">{{ formatCurrency(order.estimated_cost + order.delivery_fee) }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left Column: Basic Info -->
            <div class="space-y-6">
              <section>
                <div class="flex items-center gap-2 mb-3">
                  <Package class="w-4 h-4 text-primary" />
                  <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Details</h4>
                </div>
                <div class="p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <p class="text-sm leading-relaxed">{{ order.item_details }}</p>
                </div>
              </section>

              <section>
                <div class="flex items-center gap-2 mb-3">
                  <User class="w-4 h-4 text-primary" />
                  <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Parties</h4>
                </div>
                <div class="space-y-3">
                  <div class="flex items-center justify-between text-xs p-3 rounded-xl border border-border/50">
                    <span class="text-muted-foreground">Requester ID</span>
                    <span class="font-mono font-medium">{{ order.requester_id.substring(0, 12) }}...</span>
                  </div>
                  <div class="flex items-center justify-between text-xs p-3 rounded-xl border border-border/50">
                    <span class="text-muted-foreground">Runner ID</span>
                    <span class="font-mono font-medium text-primary">{{ order.runner_id?.substring(0, 12) || 'NOT ASSIGNED' }}...</span>
                  </div>
                </div>
              </section>

              <section>
                <div class="flex items-center gap-2 mb-3">
                  <History class="w-4 h-4 text-primary" />
                  <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timestamps</h4>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="p-3 rounded-xl bg-muted/20">
                    <p class="text-[10px] text-muted-foreground mb-1 uppercase">Created</p>
                    <p class="text-[11px] font-medium">{{ formatDate(order.created_at) }}</p>
                  </div>
                  <div class="p-3 rounded-xl bg-muted/20">
                    <p class="text-[10px] text-muted-foreground mb-1 uppercase">Updated</p>
                    <p class="text-[11px] font-medium">{{ formatDate(order.updated_at) }}</p>
                  </div>
                </div>
              </section>
            </div>

            <!-- Right Column: Evidence & Location -->
            <div class="space-y-6">
              <section>
                <div class="flex items-center gap-2 mb-3">
                  <AlertTriangle class="w-4 h-4 text-primary" />
                  <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidence & Proof</h4>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="relative group aspect-square rounded-2xl bg-secondary overflow-hidden border border-border/50">
                    <img v-if="order.receipt_image_url" :src="order.receipt_image_url" class="w-full h-full object-cover">
                    <div v-else class="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center p-4 italic">No Receipt</div>
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span class="text-[10px] font-bold text-white px-3 py-1 bg-primary rounded-full">Receipt Proof</span>
                    </div>
                  </div>
                  <div class="relative group aspect-square rounded-2xl bg-secondary overflow-hidden border border-border/50">
                    <img v-if="order.delivery_image_url" :src="order.delivery_image_url" class="w-full h-full object-cover">
                    <div v-else class="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center p-4 italic">No Delivery Proof</div>
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span class="text-[10px] font-bold text-white px-3 py-1 bg-primary rounded-full">Delivery Proof</span>
                    </div>
                  </div>
                </div>
                <div v-if="order.dispute_reason" class="mt-4 p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                  <p class="text-[10px] font-bold text-destructive uppercase mb-1">Dispute Reason</p>
                  <p class="text-xs italic text-destructive/80">"{{ order.dispute_reason }}"</p>
                </div>
              </section>

              <UiButton variant="secondary" class="w-full gap-2 text-xs">
                <MapPin class="w-4 h-4" />
                View Map Location
                <ExternalLink class="w-3 h-3 ml-auto opacity-50" />
              </UiButton>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 border-t border-border/50 bg-muted/30 flex items-center justify-end gap-3">
          <template v-if="order.status === 'disputed'">
            <UiButton variant="destructive" @click="handleResolve(ROLE_REQUESTER)">
              <XCircle class="w-4 h-4 mr-2" />
              Refund Requester
            </UiButton>
            <UiButton variant="primary" @click="handleResolve(ROLE_RUNNER)">
              <CheckCircle2 class="w-4 h-4 mr-2" />
              Release to Runner
            </UiButton>
          </template>
          
          <UiButton 
            v-if="['pending', 'accepted', 'purchasing', 'delivering'].includes(order.status)"
            variant="ghost" 
            class="text-destructive hover:bg-destructive/10"
            @click="handleCancel"
          >
            Cancel Order
          </UiButton>
          
          <UiButton variant="secondary" @click="handleClose">Close</UiButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
