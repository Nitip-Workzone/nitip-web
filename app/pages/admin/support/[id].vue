<script setup lang="ts">
import { useSupportStore } from '~/stores/support'
import { ArrowLeft, Send } from '@lucide/vue'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const supportStore = useSupportStore()
const toastStore = useToastStore()

const ticketId = route.params.id as string
const messageText = ref('')
const isInternal = ref(false)
const sending = ref(false)
const loading = ref(true)
const polling = ref<NodeJS.Timeout | null>(null)
const bottomRef = ref<HTMLElement | null>(null)

onMounted(async () => {
  try {
    await supportStore.fetchTicketDetail(ticketId, true)
    await supportStore.fetchMessages(ticketId, true)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  startPolling()
})

onUnmounted(() => {
  if (polling.value) clearInterval(polling.value)
})

function startPolling() {
  if (polling.value) clearInterval(polling.value)
  polling.value = setInterval(async () => {
    try {
      const last = supportStore.messages[supportStore.messages.length - 1]
      await supportStore.fetchMessages(ticketId, true, last?.id)
      scrollToBottom()
    } catch {}
  }, 5000)
}

function scrollToBottom() {
  nextTick(() => bottomRef.value?.scrollIntoView({ behavior: 'smooth' }))
}

async function handleSend() {
  if (!messageText.value.trim()) return
  sending.value = true
  try {
    await supportStore.sendMessage(ticketId, messageText.value.trim(), true, isInternal.value)
    messageText.value = ''
    scrollToBottom()
  } catch (e: any) {
    toastStore.add(e?.data?.message || 'Gagal kirim pesan')
  } finally {
    sending.value = false
  }
}

async function handleAction(action: 'resolve' | 'release' | 'close') {
  if (!confirm(`Yakin ${action} tiket ini?`)) return
  try {
    if (action === 'resolve') await supportStore.resolveTicket(ticketId)
    if (action === 'release') await supportStore.releaseTicket(ticketId)
    if (action === 'close') await supportStore.closeTicket(ticketId, true)
    toastStore.add(`Tiket berhasil di-${action}`)
    await supportStore.fetchTicketDetail(ticketId, true)
    await supportStore.fetchMyActiveCsTicket()
    if (action === 'close') router.push('/admin/support')
  } catch (e: any) {
    toastStore.add(e?.data?.message || `Gagal ${action}`)
  }
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-4rem)]">
    <div class="bg-card border-b p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button class="p-2 -ml-2" @click="router.push('/admin/support')"><ArrowLeft class="w-5 h-5" /></button>
        <div>
          <h1 class="text-sm font-black">{{ supportStore.currentTicket?.title || 'Detail Tiket' }}</h1>
          <p class="text-[11px] text-muted-foreground">#{{ ticketId.slice(0,8).toUpperCase() }} • {{ supportStore.currentTicket?.status }} • {{ supportStore.currentTicket?.category }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="text-xs font-bold border px-3 py-1.5 rounded-lg" @click="handleAction('release')">Lepas</button>
        <button class="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg" @click="handleAction('resolve')">Selesaikan</button>
        <button class="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg" @click="handleAction('close')">Tutup</button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Left info -->
      <div class="w-72 border-r bg-slate-50 p-4 space-y-4 overflow-y-auto hidden lg:block">
        <div class="bg-white border rounded-xl p-4 space-y-2">
          <p class="text-[10px] font-bold uppercase text-muted-foreground">Detail Tiket</p>
          <p class="text-xs"><span class="font-bold">User:</span> {{ supportStore.currentTicket?.user_name || supportStore.currentTicket?.user_id }}</p>
          <p class="text-xs"><span class="font-bold">Order:</span> {{ supportStore.currentTicket?.order_id || '-' }}</p>
          <p class="text-xs"><span class="font-bold">Kategori:</span> {{ supportStore.currentTicket?.category }}</p>
          <p class="text-xs"><span class="font-bold">Prioritas:</span> {{ supportStore.currentTicket?.priority }}</p>
          <p class="text-[11px] text-muted-foreground mt-2">{{ supportStore.currentTicket?.description }}</p>
        </div>
      </div>

      <!-- Chat -->
      <div class="flex-1 flex flex-col bg-slate-50/50">
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div v-for="m in supportStore.messages" :key="m.id" class="flex" :class="m.sender_role==='cs' ? 'justify-end' : 'justify-start'">
            <div :class="['max-w-[70%] rounded-2xl px-4 py-2.5', m.sender_role==='cs' ? 'bg-primary text-white' : m.is_internal ? 'bg-amber-100 border border-amber-200 text-amber-900' : 'bg-white border text-slate-800', 'rounded-' + (m.sender_role==='cs' ? 'bl' : 'br')]">
              <p v-if="m.is_internal" class="text-[9px] font-bold uppercase mb-1">Internal</p>
              <p class="text-xs leading-relaxed">{{ m.message }}</p>
              <p class="text-[9px] mt-1 opacity-60">{{ new Date(m.created_at).toLocaleTimeString('id-ID') }} • {{ m.sender_role }}</p>
            </div>
          </div>
          <div ref="bottomRef" />
        </div>

        <div class="bg-white border-t p-3 flex flex-col gap-2">
          <label class="flex items-center gap-2 text-[11px]"><input type="checkbox" v-model="isInternal"> Catatan internal (tidak dilihat user)</label>
          <div class="flex gap-2">
            <textarea v-model="messageText" rows="2" placeholder="Ketik balasan..." class="flex-1 rounded-xl border px-4 py-2.5 text-xs focus:outline-none focus:border-primary/50 resize-none" @keydown.enter.exact.prevent="handleSend"></textarea>
            <button :disabled="sending || !messageText.trim()" class="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50" @click="handleSend"><Send class="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
