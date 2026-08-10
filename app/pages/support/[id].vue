<script setup lang="ts">
import { useSupportStore } from '~/stores/support'
import { ArrowLeft, Send, RefreshCw } from '@lucide/vue'

definePageMeta({ layout: 'user' })

const route = useRoute()
const router = useRouter()
const supportStore = useSupportStore()
const toastStore = useToastStore()

const ticketId = route.params.id as string
const messageText = ref('')
const sending = ref(false)
const loading = ref(true)
const bottomRef = ref<HTMLElement | null>(null)

onMounted(async () => {
  await handleRefresh()
  scrollToBottom()
})

async function handleRefresh() {
  try {
    await supportStore.fetchTicketDetail(ticketId, false)
    await supportStore.fetchMessages(ticketId, false)
  } catch (e) {
    console.error(e)
    toastStore.add('Gagal memuat tiket')
  } finally {
    loading.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    bottomRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

async function handleSend() {
  if (!messageText.value.trim()) return
  sending.value = true
  try {
    await supportStore.sendMessage(ticketId, messageText.value.trim(), false, false)
    messageText.value = ''
    scrollToBottom()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toastStore.add(err?.data?.message || 'Gagal mengirim pesan')
  } finally {
    sending.value = false
  }
}

async function handleClose() {
  if (!confirm('Tutup tiket ini?')) return
  try {
    await supportStore.closeTicket(ticketId, false)
    toastStore.add('Tiket ditutup')
    await supportStore.fetchTicketDetail(ticketId, false)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toastStore.add(err?.data?.message || 'Gagal menutup tiket')
  }
}

function getStatusLabel(s: string) {
  const map: Record<string,string> = { queued:'Antrian', assigned:'Ditangani', in_progress:'Diproses', waiting_user:'Menunggu Anda', resolved:'Selesai', closed:'Ditutup' }
  return map[s] || s
}
</script>

<template>
  <div class="flex flex-col h-[100dvh] bg-slate-50">
    <div class="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3">
      <button class="p-2 -ml-2" @click="router.push('/support')"><ArrowLeft class="w-5 h-5" /></button>
      <div class="flex-1 min-w-0">
        <h1 class="text-sm font-black flex items-center gap-2 truncate">
          <span>{{ supportStore.currentTicket?.title || 'Detail Tiket' }}</span>
          <button 
            class="p-1 rounded-lg text-muted-foreground hover:bg-slate-100 active:scale-95 transition-all"
            @click="handleRefresh"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': supportStore.loading }" />
          </button>
        </h1>
        <p class="text-[11px] text-slate-500">{{ supportStore.currentTicket ? getStatusLabel(supportStore.currentTicket.status) : '' }} • {{ supportStore.currentTicket?.category }}</p>
      </div>
      <button v-if="supportStore.currentTicket && supportStore.currentTicket.status !== 'closed'" class="text-[11px] font-bold text-slate-600 border border-slate-200 rounded-full px-3 py-1.5" @click="handleClose">Tutup</button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div class="bg-primary/5 border border-primary/10 rounded-xl p-3 text-[11px]">
          <p class="font-bold text-slate-700">{{ supportStore.currentTicket?.title }}</p>
          <p class="text-slate-600 mt-1">{{ supportStore.currentTicket?.description }}</p>
          <p v-if="supportStore.currentTicket?.order_id" class="mt-2 text-[10px] text-slate-500">Order: {{ supportStore.currentTicket.order_id?.slice(0,8).toUpperCase() }}</p>
        </div>

        <div v-for="m in supportStore.messages" :key="m.id" class="flex" :class="m.sender_role === 'user' ? 'justify-end' : 'justify-start'">
          <div :class="['max-w-[75%] rounded-2xl px-4 py-2.5', m.sender_role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm']">
            <p class="text-xs leading-relaxed">{{ m.message }}</p>
            <p class="text-[9px] mt-1 opacity-60">{{ new Date(m.created_at).toLocaleTimeString('id-ID',{hour:'2-digit', minute:'2-digit'}) }} • {{ m.sender_role === 'cs' ? 'CS' : 'Anda' }}</p>
          </div>
        </div>
        <div ref="bottomRef" />
      </div>

      <div class="bg-white border-t border-slate-100 p-4 flex gap-2 safe-bottom">
        <textarea v-model="messageText" rows="1" placeholder="Ketik pesan..." class="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:border-primary/50 resize-none max-h-24" @keydown.enter.exact.prevent="handleSend"/>
        <button :disabled="sending || !messageText.trim()" class="w-11 h-11 bg-primary text-white rounded-2xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all" @click="handleSend">
          <Send class="w-5 h-5" />
        </button>
      </div>
    </template>
  </div>
</template>
