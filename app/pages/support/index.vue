<script setup lang="ts">
import { useSupportStore } from '~/stores/support'
import { MessageCircle, Plus, Clock } from '@lucide/vue'

definePageMeta({ layout: 'user' })

const supportStore = useSupportStore()
const router = useRouter()
const loading = ref(true)

onMounted(async () => {
  await supportStore.fetchMyTickets()
  loading.value = false
})

function getStatusColor(status: string) {
  switch (status) {
    case 'queued':
    case 'open': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'assigned':
    case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'waiting_user': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'closed': return 'bg-slate-100 text-slate-600 border-slate-200'
    default: return 'bg-slate-100 text-slate-500'
  }
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    queued: 'Antrian',
    open: 'Terbuka',
    assigned: 'Ditangani',
    in_progress: 'Diproses',
    waiting_user: 'Menunggu Anda',
    resolved: 'Selesai',
    closed: 'Ditutup',
  }
  return map[status] || status
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50">
    <div class="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
    <div class="relative z-10 max-w-md mx-auto px-5 pt-5 pb-24 space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-black text-slate-900 tracking-tight">Pusat Bantuan</h1>
          <p class="text-[11px] text-slate-500 mt-0.5">Tiket bantuan & live chat CS</p>
        </div>
        <NuxtLink to="/support/new" class="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md">
          <Plus class="w-4 h-4" /> Tiket Baru
        </NuxtLink>
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="bg-white border border-slate-100 rounded-2xl p-4 animate-pulse h-20" />
      </div>

      <template v-else>
        <div v-if="supportStore.myTickets.length === 0" class="bg-white border border-slate-100 rounded-3xl p-10 text-center space-y-3">
          <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
            <MessageCircle class="w-7 h-7 text-slate-300" />
          </div>
          <h3 class="text-sm font-bold text-slate-700">Belum ada tiket bantuan</h3>
          <p class="text-xs text-slate-400 max-w-[240px] mx-auto">Jika mengalami kendala, buat tiket dan CS kami akan membantu via chat.</p>
          <NuxtLink to="/support/new" class="inline-block mt-2 bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl">Buat Tiket Pertama</NuxtLink>
        </div>

        <div v-else class="space-y-3">
          <div v-for="t in supportStore.myTickets" :key="t.id" class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-primary/20 transition-all cursor-pointer" @click="router.push(`/support/${t.id}`)">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-900 truncate">{{ t.title }}</p>
                <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{{ t.description }}</p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase" :class="getStatusColor(t.status)">{{ getStatusLabel(t.status) }}</span>
                  <span class="text-[9px] text-slate-400 flex items-center gap-1"><Clock class="w-3 h-3" />{{ new Date(t.created_at).toLocaleDateString('id-ID') }}</span>
                </div>
              </div>
              <span class="text-[10px] font-bold text-slate-400 uppercase">{{ t.category }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
