<script setup lang="ts">
import { ArrowLeft, Calendar, Clock, Truck, Plus, ChevronRight, HelpCircle, Store, MapPin } from '@lucide/vue'

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

interface StoreItem {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  category: string
  description?: string
  image_url?: string
}

const activeTab = ref<'trips' | 'stores'>('trips')
const trips = ref<Trip[]>([])
const stores = ref<StoreItem[]>([])
const loading = ref(true)
const loadingStores = ref(false)

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

const fetchStores = async () => {
  loadingStores.value = true
  try {
    const res = await request<{ data: StoreItem[] }>('/stores')
    if (res.data) {
      stores.value = res.data
    }
  } catch (err) {
    console.error('Gagal mengambil daftar tokoh:', err)
  } finally {
    loadingStores.value = false
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'stores' && stores.value.length === 0) {
    fetchStores()
  } else if (newTab === 'trips' && trips.value.length === 0) {
    fetchActiveTrips()
  }
})

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

const getCategoryLabel = (value: string) => {
  switch (value) {
    case 'supermarket': return 'Supermarket'
    case 'pasar': return 'Pasar Tradisional'
    case 'mall': return 'Mall'
    case 'toko': return 'Warung / Toko'
    case 'apotek': return 'Apotek'
    case 'restoran': return 'Restoran'
    default: return value || 'Lainnya'
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
          <h1 class="text-lg font-bold text-foreground">
            {{ activeTab === 'trips' ? 'Cari Runner (Trip)' : 'Direktori Tokoh' }}
          </h1>
          <p class="text-[11px] text-muted-foreground">
            {{ activeTab === 'trips' ? 'Lihat daftar rencana perjalanan aktif' : 'Daftar tokoh titip beli terdaftar' }}
          </p>
        </div>
      </div>
      <button 
        class="p-2 text-primary hover:bg-slate-50 rounded-xl"
        title="Refresh data"
        @click="activeTab === 'trips' ? fetchActiveTrips() : fetchStores()"
      >
        <Plus v-if="loading || loadingStores" class="w-5 h-5 rotate-45" />
        <span v-else class="text-xs font-bold">Refresh</span>
      </button>
    </div>

    <!-- Tabs Switcher -->
    <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl shrink-0">
      <button 
        type="button"
        :class="[
          'py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2',
          activeTab === 'trips' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
        ]"
        @click="activeTab = 'trips'"
      >
        <Truck class="w-4 h-4" />
        Runner Aktif
      </button>
      <button 
        type="button"
        :class="[
          'py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2',
          activeTab === 'stores' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
        ]"
        @click="activeTab = 'stores'"
      >
        <Store class="w-4 h-4" />
        Daftar Tokoh
      </button>
    </div>

    <!-- Runner Trips View -->
    <template v-if="activeTab === 'trips'">
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
    </template>

    <!-- Store Directory View -->
    <template v-else>
      <!-- Loading skeleton -->
      <div v-if="loadingStores" class="space-y-4">
        <div v-for="i in 3" :key="i" class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 animate-pulse flex gap-3">
          <div class="w-14 h-14 bg-slate-100 rounded-2xl shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-slate-200 rounded w-1/2" />
            <div class="h-3 bg-slate-100 rounded w-3/4" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="stores.length === 0" class="bg-slate-50 rounded-[1.5rem] p-8 text-center border border-slate-100">
        <div class="w-14 h-14 bg-white rounded-[1rem] flex items-center justify-center mx-auto mb-3 shadow-soft border border-slate-100">
          <Store class="w-6 h-6 text-slate-300" />
        </div>
        <p class="text-xs font-bold text-slate-700">Belum ada tokoh terdaftar</p>
        <p class="text-[11px] text-slate-400 mt-0.5">Daftar tokoh titip beli yang dikelola admin akan muncul di sini</p>
      </div>

      <!-- Stores List -->
      <div v-else class="space-y-3">
        <div 
          v-for="store in stores" 
          :key="store.id" 
          class="bg-white border border-border/40 rounded-3xl p-4 shadow-sm flex items-start gap-4 hover:border-primary/20 transition-all"
        >
          <!-- Store Image or Placeholder -->
          <div class="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100">
            <img v-if="store.image_url" :src="store.image_url" :alt="store.name" class="w-full h-full object-cover" >
            <Store v-else class="w-7 h-7 text-orange-500" />
          </div>

          <!-- Store details -->
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h3 class="text-xs font-bold text-slate-800 leading-snug">{{ store.name }}</h3>
              <span class="inline-block text-[8px] font-extrabold px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 uppercase">
                {{ getCategoryLabel(store.category) }}
              </span>
            </div>
            <p v-if="store.address" class="text-[10px] text-slate-500 leading-normal line-clamp-2">
              {{ store.address }}
            </p>
            <p v-if="store.description" class="text-[9px] text-slate-400 italic">
              "{{ store.description }}"
            </p>

            <div class="flex items-center gap-2 pt-1.5">
              <!-- View on Map Button -->
              <NuxtLink
                :to="`/map/viewer?lat=${store.lat}&lng=${store.lng}&color=22c55e&stores=1`"
                target="_blank"
                class="inline-flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
              >
                <MapPin class="w-3 h-3" />
                Lihat di Peta
              </NuxtLink>
              <span class="text-slate-350 text-[9px] font-mono">|</span>
              <!-- Order to this store button -->
              <NuxtLink
                :to="`/orders/new?category=beli`"
                class="inline-flex items-center gap-0.5 text-[10px] text-orange-500 font-bold hover:underline"
              >
                Titip Beli
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
