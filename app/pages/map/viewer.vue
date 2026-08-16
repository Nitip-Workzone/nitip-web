<template>
  <div class="w-screen h-screen m-0 p-0 overflow-hidden relative">
    <div ref="mapContainer" class="w-full h-full z-10" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mapContainer = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let marker: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any = null
let isInitialized = false

// Store markers layer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeMarkers: any[] = []

interface StoreMarker {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  image_url?: string
}

async function loadStoreMarkers(baseUrl: string) {
  if (!map || !L) return
  try {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
      : null

    const res = await fetch(`${baseUrl}/api/v1/stores`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const json = await res.json()
    const stores: StoreMarker[] = json.data || []

    // Clear existing store markers
    storeMarkers.forEach(m => map.removeLayer(m))
    storeMarkers.length = 0

    stores.forEach(s => {
      const shopIcon = L.divIcon({
        html: `
          <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
            <div style="background:#22c55e;width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
          </div>
        `,
        className: 'store-marker-icon',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })

      const popupContent = `
        <div style="min-width:140px;font-family:sans-serif;">
          ${s.image_url ? `<img src="${s.image_url}" alt="${s.name}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px;">` : ''}
          <strong style="font-size:13px;display:block;">${s.name}</strong>
          ${s.address ? `<span style="font-size:11px;color:#64748b;">${s.address}</span>` : ''}
        </div>
      `

      const m = L.marker([s.lat, s.lng], { icon: shopIcon })
        .addTo(map)
        .bindPopup(popupContent, { maxWidth: 200 })

      storeMarkers.push(m)
    })
  } catch {
    // Fail silently — store markers are enhancement only
  }
}

const initMap = async () => {
  const lat = route.query.lat ? parseFloat(route.query.lat as string) : null
  const lng = route.query.lng ? parseFloat(route.query.lng as string) : null

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return
  }

  if (!isInitialized) {
    isInitialized = true
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
      zoomControl: false
    }).setView([lat, lng], 16)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    const markerColor = route.query.color ? `#${route.query.color}` : '#6366f1'
    const pulseIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center" style="width: 40px; height: 40px;">
          <div class="absolute rounded-full animate-ping opacity-75" style="width: 32px; height: 32px; background-color: ${markerColor};"></div>
          <div class="absolute rounded-full border-2 border-white shadow-md" style="width: 14px; height: 14px; background-color: ${markerColor};"></div>
        </div>
      `,
      className: 'custom-pulse-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    })

    marker = L.marker([lat, lng], { icon: pulseIcon }).addTo(map)

    // Expose moveMap globally for Flutter WebViewController to call if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).moveMap = (newLat: number, newLng: number) => {
      if (map && marker) {
        const newLatLng = new L.LatLng(newLat, newLng)
        map.setView(newLatLng, 16)
        marker.setLatLng(newLatLng)
      }
    }

    // Optionally load store markers when ?stores=1
    if (route.query.stores === '1') {
      const apiBase = (window as any).__NITIP_API_BASE__ || window.location.origin
      await loadStoreMarkers(apiBase)
    }
  } else {
    if (map && marker) {
      const newLatLng = new L.LatLng(lat, lng)
      map.setView(newLatLng, 16)
      marker.setLatLng(newLatLng)
    }
  }
}

onMounted(() => {
  if (import.meta.client) {
    initMap()
  }
})

watch(() => route.query, () => {
  if (import.meta.client) {
    initMap()
  }
}, { deep: true })

</script>

<style>
html, body, #__nuxt {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.leaflet-control-attribution {
  display: none !important;
}
@keyframes ping {
  0% {
    transform: scale(0.2);
    opacity: 0.8;
  }
  80%, 100% {
    transform: scale(1.2);
    opacity: 0;
  }
}
.animate-ping {
  animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
