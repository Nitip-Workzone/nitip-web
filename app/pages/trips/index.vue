<script setup lang="ts">
import { ArrowLeft, Calendar, Clock, Truck, Plus, ChevronRight, HelpCircle } from '@lucide/vue'

definePageMeta({
  layout: 'user',
})

const router = useRouter()
const { request } = useApi()

interface Trip {
  id: string
  runner_id: string
  origin_name: string
  destination_name: string
  departure_time: string
  vehicle_type: string
  available_weight_kg: number
  available_volume_liters: number
  notes?: string
}

const trips = ref<Trip[]>([])
const loading = ref(true)

const fetchActiveTrips = async () => {
  loading.value = true
  try {
    const res = await request<{ data: Trip[] }>('/trips')
    if (res.data) {
      trips.value = res.data
    }
  } catch (err) {
    console.error('Gagal mengambil rencana perjalanan:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchActiveTrips()
})

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getVehicleLabel = (type: string) => {
  switch (type) {
    case 'motorcycle': return 'Motor'
    case 'car': return 'Mobil'
    case 'pickup': return 'Bak Terbuka (Pickup)'
    default: return type
  }
}
</script>

<template>
  <div class="p-4 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button class="p-2 -ml-2 text-muted-foreground hover:text-foreground" @click="router.push('/dashboard')">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-lg font-bold text-foreground">Cari Runner (Trip)</h1>
          <p class="text-[11px] text-muted-foreground">Lihat daftar rencana perjalanan aktif</p>
        </div>
      </div>
      <button 
        class="p-2 text-primary hover:bg-slate-50 rounded-xl"
        title="Refresh data"
        @click="fetchActiveTrips"
      >
        <Plus v-if="loading" class="w-5 h-5 rotate-45" />
        <span v-else class="text-xs font-bold">Refresh</span>
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 animate-pulse">
        <div class="h-4 bg-slate-200 rounded w-1/2" />
        <div class="h-3 bg-slate-100 rounded w-3/4" />
        <div class="h-3 bg-slate-50 rounded w-1/4" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="trips.length === 0" class="bg-slate-50 rounded-[1.5rem] p-8 text-center border border-slate-100">
      <div class="w-14 h-14 bg-white rounded-[1rem] flex items-center justify-center mx-auto mb-3 shadow-soft border border-slate-100">
        <Truck class="w-6 h-6 text-slate-300" />
      </div>
      <p class="text-xs font-bold text-slate-700">Belum ada perjalanan aktif</p>
      <p class="text-[11px] text-slate-400 mt-0.5">Semua rencana perjalanan Runner yang aktif akan muncul di sini</p>
      <NuxtLink
        to="/orders/new"
        class="inline-flex mt-4 bg-primary text-white text-[11px] font-bold px-5 py-2.5 rounded-xl shadow-sm"
      >
        Buat Order Jastip
      </NuxtLink>
    </div>

    <!-- Trips List -->
    <div v-else class="space-y-3">
      <div 
        v-for="trip in trips" 
        :key="trip.id" 
        class="bg-white border border-border/40 rounded-3xl p-5 shadow-sm space-y-4 hover:border-primary/20 transition-all"
      >
        <!-- Rute / Origin -> Destination -->
        <div class="space-y-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
          <div class="relative">
            <span class="absolute -left-5 top-0.5 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-50" />
            <p class="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Asal keberangkatan</p>
            <p class="text-xs font-semibold text-slate-800 mt-0.5">{{ trip.origin_name }}</p>
          </div>
          <div class="relative mt-2">
            <span class="absolute -left-5 top-0.5 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10" />
            <p class="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Tujuan akhir</p>
            <p class="text-xs font-semibold text-slate-800 mt-0.5">{{ trip.destination_name }}</p>
          </div>
        </div>

        <!-- Info tambahan -->
        <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-[11px]">
          <div class="space-y-1">
            <div class="flex items-center gap-1.5 text-slate-500">
              <Calendar class="w-3.5 h-3.5" />
              <span>Tanggal Berangkat</span>
            </div>
            <p class="font-bold text-slate-800">{{ formatDate(trip.departure_time) }}</p>
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-1.5 text-slate-500">
              <Clock class="w-3.5 h-3.5" />
              <span>Jam</span>
            </div>
            <p class="font-bold text-slate-800">{{ formatTime(trip.departure_time) }} WIB</p>
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-1.5 text-slate-500">
              <Truck class="w-3.5 h-3.5" />
              <span>Kendaraan</span>
            </div>
            <p class="font-bold text-slate-800">{{ getVehicleLabel(trip.vehicle_type) }}</p>
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-1.5 text-slate-500">
              <HelpCircle class="w-3.5 h-3.5" />
              <span>Sisa Kapasitas</span>
            </div>
            <p class="font-bold text-slate-800">{{ trip.available_weight_kg }} kg / {{ trip.available_volume_liters }} L</p>
          </div>
        </div>

        <div v-if="trip.notes" class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 italic">
          Catatan: "{{ trip.notes }}"
        </div>

        <!-- Action Button -->
        <NuxtLink 
          :to="`/orders/new?trip_id=${trip.id}`"
          class="w-full bg-primary text-white text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] shadow-md shadow-primary/10"
        >
          Titip ke Runner Ini
          <ChevronRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
