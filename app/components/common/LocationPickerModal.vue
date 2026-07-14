<script setup lang="ts">
import { X, Search, MapPin, LocateFixed, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  initialLat?: number
  initialLng?: number
}>()

const emit = defineEmits<{
  close: []
  select: [payload: { lat: number; lng: number; address: string }]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const searchResults = ref<Array<{ display_name: string; lat: number; lng: number }>>([])
const searchLoading = ref(false)
const currentAddress = ref('Mencari alamat...')
const selectingLocation = ref(false)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let marker: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const currentLat = ref(props.initialLat ?? 0.8811)
const currentLng = ref(props.initialLng ?? 124.014)

async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`
    )
    const data = await response.json()
    currentAddress.value = data.display_name || `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  } catch {
    currentAddress.value = `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  }
}

async function searchPlaces() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  searchLoading.value = true
  try {
    const q = encodeURIComponent(searchQuery.value)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5&accept-language=id`
    )
    const data = await response.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchResults.value = data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))
  } catch {
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (searchQuery.value.length >= 3) {
      searchPlaces()
    } else if (searchQuery.value.length === 0) {
      searchResults.value = []
    }
  }, 600)
}

function selectSearchResult(place: { display_name: string; lat: number; lng: number }) {
  currentLat.value = place.lat
  currentLng.value = place.lng
  currentAddress.value = place.display_name
  searchResults.value = []
  searchQuery.value = ''

  if (map && marker) {
    const Lng = L
    const newLatLng = new Lng.LatLng(place.lat, place.lng)
    map.setView(newLatLng, 16)
    marker.setLatLng(newLatLng)
  }
}

function moveMapTo(lat: number, lng: number) {
  if (map && marker) {
    const newLatLng = new L.LatLng(lat, lng)
    map.setView(newLatLng, 16)
    marker.setLatLng(newLatLng)
    currentLat.value = lat
    currentLng.value = lng
    reverseGeocode(lat, lng)
  }
}

function getCurrentLocation() {
  if (!navigator.geolocation) return
  selectingLocation.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      selectingLocation.value = false
      moveMapTo(pos.coords.latitude, pos.coords.longitude)
    },
    () => {
      selectingLocation.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

function handleConfirm() {
  emit('select', {
    lat: currentLat.value,
    lng: currentLng.value,
    address: currentAddress.value,
  })
}

onMounted(async () => {
  if (!import.meta.client) return

  L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  // Fix marker icons
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })

  map = L.map(mapContainer.value!, {
    zoomControl: false,
  }).setView([currentLat.value, currentLng.value], 16)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  marker = L.marker([currentLat.value, currentLng.value], { draggable: true }).addTo(map)

  // Map click → move marker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.on('click', async (e: any) => {
    marker.setLatLng(e.latlng)
    currentLat.value = e.latlng.lat
    currentLng.value = e.latlng.lng
    await reverseGeocode(e.latlng.lat, e.latlng.lng)
  })

  // Marker drag end
  marker.on('dragend', async () => {
    const pos = marker.getLatLng()
    currentLat.value = pos.lat
    currentLng.value = pos.lng
    await reverseGeocode(pos.lat, pos.lng)
  })

  // Initial reverse geocode
  await reverseGeocode(currentLat.value, currentLng.value)
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white w-full sm:max-w-lg h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <h2 class="text-base font-bold text-foreground">{{ title }}</h2>
          <button class="p-1.5 rounded-full hover:bg-slate-100 transition-colors" @click="emit('close')">
            <X class="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <!-- Search Bar -->
        <div class="px-4 py-3 shrink-0">
          <div class="relative">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari alamat atau tempat..."
              class="w-full text-xs pl-10 pr-10 py-3 border border-border/60 rounded-2xl bg-slate-50 focus:outline-none focus:border-primary/50"
              @input="onSearchInput"
              @keydown.enter.prevent="searchPlaces"
            >
            <div v-if="searchLoading" class="absolute right-3.5 top-1/2 -translate-y-1/2">
              <Loader2 class="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>

          <!-- Search Results Dropdown -->
          <div
            v-if="searchResults.length > 0"
            class="absolute left-4 right-4 mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-20 max-h-60 overflow-y-auto"
          >
            <button
              v-for="(place, idx) in searchResults"
              :key="idx"
              class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
              @click="selectSearchResult(place)"
            >
              <MapPin class="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span class="text-xs text-foreground leading-relaxed line-clamp-2">{{ place.display_name }}</span>
            </button>
          </div>
        </div>

        <!-- Map -->
        <div class="flex-1 relative">
          <div ref="mapContainer" class="absolute inset-0 z-10" />

          <!-- Current Location FAB -->
          <button
            class="absolute bottom-4 right-4 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors border border-slate-200"
            @click="getCurrentLocation"
          >
            <LocateFixed v-if="!selectingLocation" class="w-5 h-5 text-primary" />
            <Loader2 v-else class="w-5 h-5 text-primary animate-spin" />
          </button>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 space-y-3 shrink-0 bg-white">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin class="w-4 h-4 text-primary" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-muted-foreground uppercase">Lokasi Terpilih</p>
              <p class="text-xs text-foreground font-medium leading-relaxed truncate">{{ currentAddress }}</p>
            </div>
          </div>

          <button
            class="w-full bg-primary text-white text-xs font-bold py-3.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 active:scale-[0.99] transition-all"
            @click="handleConfirm"
          >
            Konfirmasi Lokasi
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.leaflet-control-attribution {
  display: none !important;
}
</style>