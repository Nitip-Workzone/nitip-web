<script setup lang="ts">
import { X, Search, MapPin, LocateFixed, Loader2 } from '@lucide/vue'

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

interface StoreItem {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  image_url?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeMarkers: any[] = []

async function loadStoreMarkers() {
  if (!map || !L) return
  try {
    const { request } = useApi()
    const res = await request<{ data: StoreItem[] }>('/stores')
    const stores = res.data || []

    // Clear existing store markers
    storeMarkers.forEach(m => map.removeLayer(m))
    storeMarkers.length = 0

    stores.forEach(s => {
      const shopIcon = L.divIcon({
        html: `
          <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div style="background:#22c55e;width:30px;height:30px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(34,197,94,0.5);display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
          </div>
        `,
        className: 'store-picker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const storeAddress = s.address || s.name
      const popupContent = `
        <div style="min-width:130px;font-family:sans-serif;">
          ${s.image_url ? `<img src="${s.image_url}" alt="${s.name}" style="width:100%;height:70px;object-fit:cover;border-radius:8px;margin-bottom:6px;">` : ''}
          <strong style="font-size:13px;display:block;">${s.name}</strong>
          ${s.address ? `<span style="font-size:11px;color:#64748b;display:block;margin-top:2px;">${s.address}</span>` : ''}
          <button onclick="window.__selectStoreFromPicker && window.__selectStoreFromPicker(${s.lat}, ${s.lng}, '${storeAddress.replace(/'/g, "\\'")}'); return false;"
            style="margin-top:8px;width:100%;padding:6px;background:#22c55e;color:white;border:none;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">
            Pilih Toko Ini
          </button>
        </div>
      `

      const m = L.marker([s.lat, s.lng], { icon: shopIcon })
        .addTo(map)
        .bindPopup(popupContent, { maxWidth: 220 })

      storeMarkers.push(m)
    })
  } catch (err) {
    console.error('Gagal mengambil store markers:', err)
  }
}

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

  // Expose global selectStoreFromPicker so the popup button can call it
  if (import.meta.client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__selectStoreFromPicker = (lat: number, lng: number, _address: string) => {
      moveMapTo(lat, lng)
      if (map) map.closePopup()
    }
  }

  // Load store markers
  await loadStoreMarkers()

  // Initial reverse geocode
  await reverseGeocode(currentLat.value, currentLng.value)
})

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (import.meta.client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__selectStoreFromPicker
  }
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