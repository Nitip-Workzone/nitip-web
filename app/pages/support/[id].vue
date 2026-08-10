<script setup lang="ts">
import { useSupportStore } from '~/stores/support'
import { ArrowLeft, RefreshCw, CheckCircle, Clock, User, HelpCircle, MessageSquare } from '@lucide/vue'

definePageMeta({ layout: 'user' })

const route = useRoute()
const router = useRouter()
const supportStore = useSupportStore()
const toastStore = useToastStore()

const ticketId = route.params.id as string
const loading = ref(true)

onMounted(async () => {
  await handleRefresh()
})

async function handleRefresh() {
  try {
    await supportStore.fetchTicketDetail(ticketId, false)
  } catch (e) {
    console.error(e)
    toastStore.add('Gagal memuat tiket')
  } finally {
    loading.value = false
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
  <div class="flex flex-col min-h-[100dvh] bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-20">
      <button class="p-2 -ml-2 text-slate-600 hover:text-slate-900" @click="router.push('/support')">
        <ArrowLeft class="w-5 h-5" />
      </button>
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
      
      <div class="flex items-center gap-2">
        <a 
          v-if="supportStore.currentTicket"
          :href="`https://wa.me/${(supportStore.currentTicket.assigned_cs_whatsapp || '6282125197825').replace(/\D/g, '')}?text=${encodeURIComponent('Halo CS Nitip, saya butuh bantuan terkait tiket bantuan #' + ticketId.slice(0,8).toUpperCase() + ' saya: ' + supportStore.currentTicket.title)}`"
          target="_blank"
          class="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
        >
          <span>💬 Chat WhatsApp</span>
        </a>
        <button v-if="supportStore.currentTicket && supportStore.currentTicket.status !== 'closed' && supportStore.currentTicket.status !== 'resolved'" class="text-xs font-bold text-slate-600 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50" @click="handleClose">Tutup Tiket</button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>

    <!-- Main Content -->
    <div v-else-if="supportStore.currentTicket" class="flex-1 max-w-2xl w-full mx-auto p-4 md:p-6 space-y-6">
      <!-- Ticket Info Card -->
      <div class="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-extrabold uppercase bg-primary/5 text-primary border border-primary/10 rounded-md px-2.5 py-1">
            {{ supportStore.currentTicket.category }}
          </span>
          <span class="text-xs font-bold text-slate-400">
            #{{ ticketId.slice(0,8).toUpperCase() }}
          </span>
        </div>

        <div>
          <h2 class="text-base font-black text-slate-800">{{ supportStore.currentTicket.title }}</h2>
          <p class="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">{{ supportStore.currentTicket.description }}</p>
        </div>

        <div v-if="supportStore.currentTicket.order_id" class="border-t border-slate-100 pt-4 flex items-center gap-2 text-xs text-slate-500">
          <HelpCircle class="w-4 h-4 text-slate-400" />
          <span>Terkait Order:</span>
          <span class="font-extrabold text-slate-700">#{{ supportStore.currentTicket.order_id.slice(0,8).toUpperCase() }}</span>
        </div>
      </div>

      <!-- Ticket Status Progress Timeline -->
      <div class="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Status Progress Tiket</h3>
        
        <div class="relative pl-6 space-y-6 border-l border-slate-150 ml-3 py-1">
          <!-- Step 1: Created -->
          <div class="relative">
            <div class="absolute -left-[31px] top-0.5 bg-emerald-500 text-white rounded-full p-1 border-4 border-white shadow-sm">
              <CheckCircle class="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 class="text-xs font-bold text-slate-800">Tiket Dibuat</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">Laporan berhasil masuk ke sistem antrian Nitip. Menunggu CS merespon.</p>
            </div>
          </div>

          <!-- Step 2: Assigned -->
          <div class="relative">
            <div 
              :class="[
                'absolute -left-[31px] top-0.5 rounded-full p-1 border-4 border-white shadow-sm',
                supportStore.currentTicket.assigned_cs_id ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              ]"
            >
              <User class="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 :class="['text-xs font-bold', supportStore.currentTicket.assigned_cs_id ? 'text-slate-800' : 'text-slate-400']">Diproses CS</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">
                <span v-if="supportStore.currentTicket.assigned_cs_id">
                  Ditangani oleh CS: <strong class="text-slate-700">{{ supportStore.currentTicket.assigned_cs_name || 'Petugas CS' }}</strong>.
                </span>
                <span v-else>Menunggu petugas Customer Service mengambil tiket Anda.</span>
              </p>
            </div>
          </div>

          <!-- Step 3: Resolved -->
          <div class="relative">
            <div 
              :class="[
                'absolute -left-[31px] top-0.5 rounded-full p-1 border-4 border-white shadow-sm',
                ['resolved', 'closed'].includes(supportStore.currentTicket.status) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              ]"
            >
              <Clock class="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 :class="['text-xs font-bold', ['resolved', 'closed'].includes(supportStore.currentTicket.status) ? 'text-slate-800' : 'text-slate-400']">Selesai</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">
                <span v-if="['resolved', 'closed'].includes(supportStore.currentTicket.status)">
                  Tiket telah diselesaikan dan ditutup. Terima kasih atas masukan Anda.
                </span>
                <span v-else>Tiket akan ditandai selesai setelah penanganan masalah selesai.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- WhatsApp Call to Action Card -->
      <div class="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 text-center space-y-4">
        <div class="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <MessageSquare class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <h4 class="text-sm font-extrabold text-emerald-800">Butuh Percakapan Langsung?</h4>
          <p class="text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
            Untuk interaksi real-time yang lebih cepat, aman, dan mudah, hubungi CS kami secara langsung melalui WhatsApp.
          </p>
        </div>
        <a 
          :href="`https://wa.me/${(supportStore.currentTicket.assigned_cs_whatsapp || '6282125197825').replace(/\D/g, '')}?text=${encodeURIComponent('Halo CS Nitip, saya butuh bantuan terkait tiket bantuan #' + ticketId.slice(0,8).toUpperCase() + ' saya: ' + supportStore.currentTicket.title)}`"
          target="_blank"
          class="inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95"
        >
          <span>Mulai Chat WhatsApp</span>
        </a>
      </div>
    </div>
  </div>
</template>
