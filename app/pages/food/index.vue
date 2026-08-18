<script setup lang="ts">
import { Star, Search, MapPin, ChevronLeft, ChevronRight, UtensilsCrossed, ArrowRight, Flame, X, LocateFixed, RefreshCw } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'

definePageMeta({
  layout: 'user',
})

const merchantsStore = useMerchantsStore()
const { error } = useToast()

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 15
const searchRadius = ref(5.0)
const showRadiusPicker = ref(false)

const radiusOptions = [
  { label: '1 Km', value: 1.0 },
  { label: '3 Km', value: 3.0 },
  { label: '5 Km', value: 5.0, default: true },
  { label: '10 Km', value: 10.0 },
]

// Geolocation state
const lat = ref(0.876031736523683)
const lng = ref(124.0118274994378)
const geoLoading = ref(false)
const locationLabel = ref('Lolak, Sulawesi Utara')

const loadLocationAndMerchants = async () => {
  geoLoading.value = true
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        lat.value = position.coords.latitude
        lng.value = position.coords.longitude
        // Simple reverse geocode for display
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.value}&lon=${lng.value}&accept-language=id`
          )
          const data = await res.json()
          const parts = data.display_name?.split(',') || []
          locationLabel.value = parts.slice(0, 2).join(',').trim()
        } catch { /* ignore */ }
        fetchMerchants()
      },
      () => {
        fetchMerchants()
      }
    )
  } else {
    fetchMerchants()
  }
}

const fetchMerchants = async () => {
  try {
    await merchantsStore.fetchNearbyMerchants(lat.value, lng.value, searchRadius.value)
    geoLoading.value = false
    // fetch active promotions for first 10 merchants for badge display
    if (merchantsStore.merchants.length > 0) {
      const ids = merchantsStore.merchants.slice(0, 10).map(m => m.id)
      merchantsStore.fetchActivePromotionsBatch(ids)
    }
  } catch {
    error('Gagal mengambil daftar toko terdekat.')
    geoLoading.value = false
  }
}

const setRadius = (val: number) => {
  searchRadius.value = val
  showRadiusPicker.value = false
  currentPage.value = 1
  fetchMerchants()
}

onMounted(() => {
  loadLocationAndMerchants()
})

// Computed
const filteredMerchants = computed(() => {
  let list = [...merchantsStore.merchants]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m => m.name.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)))
  }
  return list.sort((a, b) => {
    if (a.is_open && !b.is_open) return -1
    if (!a.is_open && b.is_open) return 1
    return (b.rating || 0) - (a.rating || 0)
  })
})

const openMerchants = computed(() => filteredMerchants.value.filter(m => m.is_open))
const closedMerchants = computed(() => filteredMerchants.value.filter(m => !m.is_open))

const paginatedMerchants = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredMerchants.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(filteredMerchants.value.length / itemsPerPage))

const isLoading = computed(() => geoLoading.value || merchantsStore.loading)

// Category emoji mapping
const getCategoryEmoji = (category: string) => {
  const map: Record<string, string> = {
    food: '🍽️', drink: '☕', snack: '🍿', bakery: '🥐',
    coffee: '☕', restaurant: '🍜', warung: '🍲',
  }
  return map[category?.toLowerCase()] || '🏪'
}

// Rating color
const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return 'text-emerald-500'
  if (rating >= 3.5) return 'text-amber-500'
  return 'text-slate-400'
}

const scrollToTop = () => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="pb-28 min-h-screen bg-slate-50/60">

    <!-- ── HERO HEADER ── -->
    <div class="relative bg-white px-4 pt-4 pb-5 border-b border-slate-100">
      <div class="flex items-center gap-3 mb-4">
        <NuxtLink
          to="/dashboard"
          class="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft class="w-4 h-4" />
        </NuxtLink>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="text-base font-black text-slate-900 tracking-tight">Nitip Food</h1>
            <span class="text-xs">🍔</span>
          </div>
          <!-- Location row -->
          <button
            class="flex items-center gap-1 mt-0.5 group"
            @click="loadLocationAndMerchants"
          >
            <LocateFixed class="w-3 h-3 text-primary shrink-0" />
            <span class="text-[10px] font-semibold text-slate-500 truncate max-w-[200px] group-hover:text-primary transition-colors">
              {{ locationLabel }}
            </span>
            <RefreshCw v-if="geoLoading" class="w-2.5 h-2.5 text-slate-400 animate-spin" />
          </button>
        </div>
      </div>

      <!-- Search bar -->
      <div class="relative">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari warung, restoran, minuman..."
          class="w-full h-11 pl-10 pr-10 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-primary/40 focus:outline-none transition-all placeholder:text-slate-400"
          @input="currentPage = 1"
        >
        <button
          v-if="searchQuery"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300 transition-all"
          @click="searchQuery = ''; currentPage = 1"
        >
          <X class="w-3 h-3 text-slate-500" />
        </button>
      </div>

      <!-- Radius Pill -->
      <div class="flex items-center gap-2 mt-3">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Radius:</span>
        <div class="flex gap-1.5">
          <button
            v-for="opt in radiusOptions"
            :key="opt.value"
            class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all"
            :class="searchRadius === opt.value
              ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25'
              : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'"
            @click="setRadius(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── CONTENT AREA ── -->
    <div class="px-4 pt-4 space-y-5">

      <!-- Stats Row -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Toko Terdekat</p>
          <p class="text-sm font-black text-slate-800 mt-0.5">
            <span class="text-primary">{{ filteredMerchants.length }}</span> Mitra Ditemukan
          </p>
        </div>
        <div v-if="!isLoading && filteredMerchants.length > 0" class="flex gap-3 text-[10px] font-bold">
          <div class="flex items-center gap-1 text-emerald-600">
            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {{ openMerchants.length }} Buka
          </div>
          <div class="flex items-center gap-1 text-slate-400">
            <span class="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            {{ closedMerchants.length }} Tutup
          </div>
        </div>
      </div>

      <!-- ── LOADING SKELETON ── -->
      <div v-if="isLoading" class="space-y-3">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-white rounded-3xl p-4 flex gap-4 animate-pulse border border-slate-100"
        >
          <div class="w-[72px] h-[72px] bg-slate-100 rounded-2xl shrink-0" />
          <div class="flex-1 space-y-2.5 pt-1">
            <div class="h-3.5 bg-slate-100 rounded-lg w-2/3" />
            <div class="h-2.5 bg-slate-100 rounded-lg w-5/6" />
            <div class="flex gap-2 mt-1">
              <div class="h-5 bg-slate-100 rounded-full w-14" />
              <div class="h-5 bg-slate-100 rounded-full w-20" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── EMPTY STATE ── -->
      <div
        v-else-if="paginatedMerchants.length === 0"
        class="bg-white border border-dashed border-slate-200 rounded-3xl py-16 px-6 text-center"
      >
        <div class="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <UtensilsCrossed class="w-8 h-8 text-slate-300" />
        </div>
        <h3 class="text-xs font-extrabold text-slate-700">Tidak Ada Mitra Food</h3>
        <p class="text-[10px] text-slate-400 mt-1 leading-relaxed">
          Tidak ada toko dalam radius <span class="font-bold text-primary">{{ searchRadius }} km</span> dari lokasi Anda.
          <br>Coba perluas radius pencarian.
        </p>
        <button
          class="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-xl active:scale-95 transition-all shadow-sm shadow-primary/25"
          @click="loadLocationAndMerchants"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      </div>

      <!-- ── MERCHANT LIST ── -->
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="m in paginatedMerchants"
          :key="m.id"
          :to="`/food/${m.id}`"
          class="group bg-white rounded-[20px] border border-slate-100 overflow-hidden flex gap-0 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-slate-200 active:scale-[0.98] transition-all duration-200"
          :class="!m.is_open ? 'opacity-70 bg-slate-50/80' : ''"
        >
          <!-- Left: Visual — foto profile diperbesar + promo highlight -->
          <div class="w-[108px] shrink-0 relative self-stretch overflow-hidden bg-slate-50 flex items-center justify-center">
            <!-- Merchant profile image — diperbesar, object-cover agar penuh, backend raw https://upload.nihtip.com/ clean uuid_nano.jpg <1MB -->
            <img
              v-if="m.image_url"
              :src="m.image_url"
              :alt="m.name"
              class="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
            >
            <!-- Fallback emoji HANYA jika tidak ada image_url — piring sendok tidak timpa foto lagi -->
            <div
              v-if="!m.image_url"
              class="w-full h-full flex items-center justify-center text-[30px]"
              :class="m.is_open ? 'bg-gradient-to-br from-orange-50 to-amber-50' : 'bg-slate-100'"
            >
              {{ getCategoryEmoji(m.category) }}
            </div>

            <!-- Closed overlay -->
            <div v-if="!m.is_open" class="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span class="text-[10px] font-black text-white tracking-widest uppercase bg-black/60 px-2.5 py-1 rounded-full">TUTUP</span>
            </div>

            <!-- Promo corner ribbon — highlight promo agar kelihatan -->
            <div
              v-if="merchantsStore.activePromotions[m.id]"
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black tracking-wider uppercase px-1.5 py-1 text-center leading-none z-[2]"
            >
              {{ (merchantsStore.activePromotions[m.id]?.discount_value || 0) }}{{ merchantsStore.activePromotions[m.id]?.discount_type==='flat' ? 'K' : '%' }} OFF
            </div>
          </div>

          <!-- Right: Content — clean tapi promo highlight -->
          <div class="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-center">
            <!-- Top row: name + rating -->
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <h3 class="text-[15px] font-bold text-slate-900 truncate leading-tight">{{ m.name }}</h3>
                <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-1 leading-snug">
                  {{ m.description || 'Mitra kuliner terpercaya' }}
                </p>
              </div>
              <div class="flex items-center gap-1 shrink-0 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span class="text-[12px] font-bold text-slate-800">{{ (m.rating || 5).toFixed(1) }}</span>
              </div>
            </div>

            <!-- Promo highlight row — lebih kelihatan -->
            <div v-if="merchantsStore.activePromotions[m.id]" class="mt-2.5 flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black tracking-wide shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
                🎉 {{ merchantsStore.activePromotions[m.id]?.code || 'PROMO' }} {{ merchantsStore.activePromotions[m.id]?.discount_type==='flat' ? 'Rp'+(merchantsStore.activePromotions[m.id]?.discount_value||0) : (merchantsStore.activePromotions[m.id]?.discount_value||0)+'%' }} OFF
              </span>
              <span class="text-[10px] text-slate-400">Sisa {{ (merchantsStore.activePromotions[m.id]?.max_uses||0) - (merchantsStore.activePromotions[m.id]?.used_count||0) }}</span>
            </div>

            <!-- Bottom row: status + location -->
            <div class="flex items-center gap-2 mt-2">
              <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border" :class="m.is_open ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-100 border-slate-200'">
                <span class="w-1.5 h-1.5 rounded-full" :class="m.is_open ? 'bg-emerald-500' : 'bg-slate-300'" />
                {{ m.is_open ? 'Buka' : 'Tutup' }}
              </span>
              <span class="text-[10px] text-slate-400 flex items-center gap-1 ml-auto truncate">
                <MapPin class="w-3 h-3 shrink-0" />
                {{ m.address ? m.address.split(',')[0] : searchRadius + ' km' }}
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- ── PAGINATION ── -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 pt-2">
        <button
          :disabled="currentPage === 1"
          class="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
          @click="currentPage--; scrollToTop()"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="flex gap-1">
          <button
            v-for="p in totalPages"
            :key="p"
            class="w-7 h-7 rounded-lg text-[11px] font-extrabold transition-all"
            :class="currentPage === p
              ? 'bg-primary text-white shadow-sm shadow-primary/25'
              : 'text-slate-400 hover:bg-slate-100'"
            @click="currentPage = p; scrollToTop()"
          >
            {{ p }}
          </button>
        </div>

        <button
          :disabled="currentPage === totalPages"
          class="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
          @click="currentPage++; scrollToTop()"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <!-- Bottom hint text -->
      <div v-if="!isLoading && filteredMerchants.length > 0" class="text-center py-2">
        <p class="text-[9px] text-slate-300 font-medium">
          Menampilkan {{ Math.min(currentPage * itemsPerPage, filteredMerchants.length) }} dari {{ filteredMerchants.length }} mitra &nbsp;·&nbsp; diurutkan berdasarkan rating tertinggi
        </p>
      </div>
    </div>
  </div>
</template>
