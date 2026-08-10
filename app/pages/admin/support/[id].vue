<script setup lang="ts">
import { useSupportStore } from '~/stores/support'
import { ArrowLeft, RefreshCw, CheckCircle, Clock, User, Phone, Mail, FileText, ClipboardList } from '@lucide/vue'

definePageMeta({ layout: 'admin' })

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
    await supportStore.fetchTicketDetail(ticketId, true)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function handleAction(action: 'resolve' | 'release' | 'close') {
  if (!confirm(`Yakin ${action} tiket ini?`)) return
  try {
    if (action === 'resolve') await supportStore.resolveTicket(ticketId)
    if (action === 'release') await supportStore.releaseTicket(ticketId)
    if (action === 'close') await supportStore.closeTicket(ticketId, true)
    toastStore.add(`Tiket berhasil di-${action}`)
    await handleRefresh()
    await supportStore.fetchMyActiveCsTicket()
    if (action === 'close') router.push('/admin/support')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toastStore.add(err?.data?.message || `Gagal ${action}`)
  }
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-4rem)]">
    <!-- Header -->
    <div class="bg-card border-b p-4 flex items-center justify-between shadow-sm">
      <div class="flex items-center gap-3">
        <button class="p-2 -ml-2 text-slate-600 hover:text-slate-900" @click="router.push('/admin/support')">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-sm font-black flex items-center gap-2">
            <span>{{ supportStore.currentTicket?.title || 'Detail Tiket' }}</span>
            <button 
              class="p-1 rounded-lg text-muted-foreground hover:bg-slate-100 active:scale-95 transition-all"
              @click="handleRefresh"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': supportStore.loading }" />
            </button>
          </h1>
          <p class="text-[11px] text-muted-foreground">#{{ ticketId.slice(0,8).toUpperCase() }} • {{ supportStore.currentTicket?.status }} • {{ supportStore.currentTicket?.category }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2" v-if="supportStore.currentTicket">
        <a 
          v-if="supportStore.currentTicket.user_whatsapp"
          :href="`https://wa.me/${supportStore.currentTicket.user_whatsapp.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent('Halo, saya CS Nitip terkait tiket bantuan Anda #' + ticketId.slice(0,8).toUpperCase() + ': ' + supportStore.currentTicket.title)}`"
          target="_blank"
          class="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 transition-all"
        >
          Hubungi Klien via WA
        </a>
        <button class="text-xs font-bold border px-3 py-2 rounded-lg hover:bg-slate-50" @click="handleAction('release')">Lepas</button>
        <button class="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700" @click="handleAction('resolve')">Selesaikan</button>
        <button class="text-xs font-bold bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800" @click="handleAction('close')">Tutup</button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center bg-slate-50">
      <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>

    <!-- Main Content Grid -->
    <div v-else-if="supportStore.currentTicket" class="flex-1 flex overflow-hidden bg-slate-50">
      <!-- Left Info Sidebar -->
      <div class="w-80 border-r bg-white p-5 space-y-5 overflow-y-auto hidden md:block">
        <div class="space-y-4">
          <div class="flex items-center gap-2 border-b pb-2">
            <ClipboardList class="w-4 h-4 text-slate-400" />
            <h2 class="text-xs font-black uppercase text-slate-400 tracking-wider">Detail Tiket</h2>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-2.5 text-xs">
              <User class="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p class="font-bold text-slate-700">Pelapor</p>
                <p class="text-slate-500 mt-0.5">{{ supportStore.currentTicket.user_name || 'Tidak ada nama' }}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">{{ supportStore.currentTicket.user_id }}</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 text-xs">
              <Mail class="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p class="font-bold text-slate-700">Email</p>
                <p class="text-slate-500 mt-0.5">{{ supportStore.currentTicket.user_email || '-' }}</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 text-xs">
              <Phone class="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p class="font-bold text-slate-700">WhatsApp Klien</p>
                <p class="text-slate-500 mt-0.5">{{ supportStore.currentTicket.user_whatsapp || '-' }}</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 text-xs">
              <FileText class="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p class="font-bold text-slate-700">ID Order</p>
                <p class="text-slate-500 mt-0.5 font-mono">{{ supportStore.currentTicket.order_id || '-' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t pt-4 space-y-2 text-xs">
          <p class="flex justify-between"><span class="text-slate-500">Kategori:</span> <strong class="text-slate-700">{{ supportStore.currentTicket.category }}</strong></p>
          <p class="flex justify-between"><span class="text-slate-500">Prioritas:</span> <strong class="text-slate-700">{{ supportStore.currentTicket.priority }}</strong></p>
          <p class="flex justify-between"><span class="text-slate-500">Status:</span> <strong class="text-slate-700 uppercase">{{ supportStore.currentTicket.status }}</strong></p>
          <p class="flex justify-between"><span class="text-slate-500">Dibuat:</span> <strong class="text-slate-700">{{ new Date(supportStore.currentTicket.created_at).toLocaleString() }}</strong></p>
        </div>
      </div>

      <!-- Center Action & Timeline Area -->
      <div class="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 max-w-4xl mx-auto w-full">
        <!-- Main Description Card -->
        <div class="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 class="text-lg font-black text-slate-800">{{ supportStore.currentTicket.title }}</h2>
          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4 border border-slate-100">
            {{ supportStore.currentTicket.description }}
          </p>
        </div>

        <!-- WhatsApp Action Handoff Panel -->
        <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div class="space-y-1 text-center md:text-left">
            <h3 class="text-sm font-extrabold text-emerald-800 flex items-center justify-center md:justify-start gap-1.5">
              <span>💬</span> Hubungkan CS & Klien Langsung via WhatsApp
            </h3>
            <p class="text-xs text-emerald-700 leading-relaxed">
              Gunakan kontak WhatsApp Klien (<span class="font-bold font-mono">{{ supportStore.currentTicket.user_whatsapp || '-' }}</span>) untuk memulai tanya-jawab/obrolan penanganan langsung secara asinkron dan efisien.
            </p>
          </div>
          <a 
            v-if="supportStore.currentTicket.user_whatsapp"
            :href="`https://wa.me/${supportStore.currentTicket.user_whatsapp.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent('Halo, saya CS Nitip terkait tiket bantuan Anda #' + ticketId.slice(0,8).toUpperCase() + ': ' + supportStore.currentTicket.title)}`"
            target="_blank"
            class="whitespace-nowrap bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            Hubungi Klien via WA
          </a>
        </div>

        <!-- Progress Log Timeline Card -->
        <div class="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
          <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Log Riwayat Progres</h3>
          
          <div class="relative pl-6 space-y-6 border-l border-slate-150 ml-3 py-1">
            <!-- Step 1: Created -->
            <div class="relative">
              <div class="absolute -left-[31px] top-0.5 bg-emerald-500 text-white rounded-full p-1 border-4 border-white shadow-sm">
                <CheckCircle class="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-800">Tiket Terdaftar</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">Tiket dibuat oleh pengguna dan masuk ke sistem antrian bantuan.</p>
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
                <h4 :class="['text-xs font-bold', supportStore.currentTicket.assigned_cs_id ? 'text-slate-800' : 'text-slate-400']">Tiket Diklaim CS</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  <span v-if="supportStore.currentTicket.assigned_cs_id">
                    Tiket diambil alih oleh Customer Service: <strong class="text-slate-700">{{ supportStore.currentTicket.assigned_cs_name || 'Petugas CS' }}</strong>.
                  </span>
                  <span v-else>Menunggu CS mengambil alih tiket untuk diproses.</span>
                </p>
              </div>
            </div>

            <!-- Step 3: Closed -->
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
                <h4 :class="['text-xs font-bold', ['resolved', 'closed'].includes(supportStore.currentTicket.status) ? 'text-slate-800' : 'text-slate-400']">Penyelesaian Tiket</h4>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  <span v-if="['resolved', 'closed'].includes(supportStore.currentTicket.status)">
                    Tiket resmi ditandai selesai/selesai diproses.
                  </span>
                  <span v-else>Tiket akan ditandai selesai setelah solusi diberikan kepada pengguna.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
