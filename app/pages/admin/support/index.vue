<script setup lang="ts">
import { useSupportStore } from '~/stores/support'

definePageMeta({ layout: 'admin' })

const supportStore = useSupportStore()
const toastStore = useToastStore()
const activeTab = ref<'queue' | 'my' | 'all'>('queue')
const loading = ref(true)

let queuePoll: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await Promise.all([
    supportStore.fetchQueue(),
    supportStore.fetchMyActiveCsTicket(),
    supportStore.fetchAllTickets(),
  ])
  loading.value = false

  queuePoll = setInterval(() => {
    supportStore.fetchQueue()
    supportStore.fetchMyActiveCsTicket()
  }, 10000)
})

onUnmounted(() => {
  if (queuePoll) {
    clearInterval(queuePoll)
    queuePoll = null
  }
})

function getStatusLabel(s: string) {
  const map: Record<string,string> = { queued:'Antrian', open:'Terbuka', assigned:'Ditangani', in_progress:'Diproses', waiting_user:'Menunggu User', resolved:'Selesai', closed:'Ditutup' }
  return map[s] || s
}

async function handleClaim(id: string) {
  try {
    await supportStore.claimTicket(id)
    toastStore.add('Tiket berhasil diambil! Anda sekarang menangani 1 sesi.')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toastStore.add(err?.data?.message || 'Gagal mengambil tiket (mungkin sudah punya sesi aktif)')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black tracking-tight">CS Support Panel</h1>
        <p class="text-sm text-muted-foreground">Kelola antrian tiket bantuan pelanggan</p>
      </div>
    </div>

    <!-- Active Ticket Banner -->
    <div v-if="supportStore.activeCsTicket" class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">!</div>
        <div>
          <p class="text-xs font-bold text-blue-900">Anda sedang menangani 1 tiket aktif</p>
          <p class="text-[11px] text-blue-700">{{ supportStore.activeCsTicket.title }} • #{{ supportStore.activeCsTicket.id.slice(0,8).toUpperCase() }}</p>
        </div>
      </div>
      <NuxtLink :to="`/admin/support/${supportStore.activeCsTicket.id}`" class="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Buka Tiket</NuxtLink>
    </div>

    <div v-else class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">✓</div>
      <div>
        <p class="text-xs font-bold text-emerald-900">Siap menerima tiket baru</p>
        <p class="text-[11px] text-emerald-700">Anda tidak memiliki sesi aktif. Silakan ambil dari antrian.</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-card border rounded-xl p-4">
        <p class="text-[11px] font-bold text-muted-foreground uppercase">Antrian</p>
        <p class="text-2xl font-black mt-1">{{ supportStore.queueTotal }}</p>
      </div>
      <div class="bg-card border rounded-xl p-4">
        <p class="text-[11px] font-bold text-muted-foreground uppercase">Total</p>
        <p class="text-2xl font-black mt-1">{{ supportStore.allTotal }}</p>
      </div>
      <div class="bg-card border rounded-xl p-4">
        <p class="text-[11px] font-bold text-muted-foreground uppercase">Aktif Saya</p>
        <p class="text-2xl font-black mt-1">{{ supportStore.activeCsTicket ? 1 : 0 }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex bg-slate-100 p-1 rounded-xl w-fit">
      <button :class="['px-4 py-2 text-xs font-bold rounded-lg', activeTab==='queue' ? 'bg-white shadow' : 'text-slate-500']" @click="activeTab='queue'">Antrian ({{ supportStore.queueTotal }})</button>
      <button :class="['px-4 py-2 text-xs font-bold rounded-lg', activeTab==='my' ? 'bg-white shadow' : 'text-slate-500']" @click="activeTab='my'">Ditangani Saya</button>
      <button :class="['px-4 py-2 text-xs font-bold rounded-lg', activeTab==='all' ? 'bg-white shadow' : 'text-slate-500']" @click="activeTab='all'">Semua</button>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-muted-foreground">Memuat tiket...</div>

    <div v-else class="bg-card border rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 border-b text-[10px] font-bold uppercase text-slate-500">
            <tr>
              <th class="text-left p-3">ID</th>
              <th class="text-left p-3">User</th>
              <th class="text-left p-3">Judul</th>
              <th class="text-left p-3">Kategori</th>
              <th class="text-left p-3">Status</th>
              <th class="text-left p-3">Dibuat</th>
              <th class="text-left p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in (activeTab==='queue' ? supportStore.queueTickets : activeTab==='my' ? supportStore.allTickets.filter(x=>x.assigned_cs_id && supportStore.activeCsTicket && x.id===supportStore.activeCsTicket.id) : supportStore.allTickets)" :key="t.id" class="border-b hover:bg-slate-50/50">
              <td class="p-3 font-mono font-bold">#{{ t.id.slice(0,8).toUpperCase() }}</td>
              <td class="p-3">{{ t.user_name || t.user_id.slice(0,6) }}</td>
              <td class="p-3 max-w-[200px] truncate">{{ t.title }}</td>
              <td class="p-3"><span class="text-[10px] bg-slate-100 border px-2 py-0.5 rounded-full uppercase">{{ t.category }}</span></td>
              <td class="p-3"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full border">{{ getStatusLabel(t.status) }}</span></td>
              <td class="p-3 text-[11px] text-slate-500">{{ new Date(t.created_at).toLocaleString('id-ID') }}</td>
              <td class="p-3 flex gap-2">
                <NuxtLink :to="`/admin/support/${t.id}`" class="text-primary font-bold hover:underline">Lihat</NuxtLink>
                <button v-if="activeTab==='queue'" :disabled="!!supportStore.activeCsTicket" class="text-emerald-600 font-bold disabled:opacity-30 disabled:cursor-not-allowed" @click="handleClaim(t.id)">Ambil</button>
              </td>
            </tr>
            <tr v-if="(activeTab==='queue' ? supportStore.queueTickets : supportStore.allTickets).length===0">
              <td colspan="7" class="p-8 text-center text-slate-400 text-xs">Tidak ada tiket di tab ini</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
