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

// Store markers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeMarkers: any[] = []

interface StoreItem {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  image_url?: string
}

// Load store markers and wire StoreChannel callback
async function loadStoreMarkers(notifyFlutter: (lat: number, lng: number, address: string) => Promise<void>) {
  if (!map || !L) return
  try {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
      : null

    const apiBase = (window as any).__NITIP_API_BASE__ || window.location.origin
    const res = await fetch(`${apiBase}/api/v1/stores`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const json = await res.json()
    const stores: StoreItem[] = json.data || []

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
        <div style="min-width:130px;font-family:sans-serif;cursor:pointer;">
          ${s.image_url ? `<img src="${s.image_url}" alt="${s.name}" style="width:100%;height:70px;object-fit:cover;border-radius:8px;margin-bottom:6px;">` : ''}
          <strong style="font-size:13px;display:block;">${s.name}</strong>
          ${s.address ? `<span style="font-size:11px;color:#64748b;display:block;margin-top:2px;">${s.address}</span>` : ''}
          <button onclick="window.__selectStore && window.__selectStore('${s.id}', '${s.name.replace(/'/g, "\\'")}', ${s.lat}, ${s.lng}, '${storeAddress.replace(/'/g, "\\'")}'); return false;"
            style="margin-top:8px;width:100%;padding:6px;background:#22c55e;color:white;border:none;border-radius:8px;font-size:12px;font-weight:bold;cursor:pointer;">
            Pilih Lokasi Ini
          </button>
        </div>
      `

      const m = L.marker([s.lat, s.lng], { icon: shopIcon })
        .addTo(map)
        .bindPopup(popupContent, { maxWidth: 220 })

      storeMarkers.push(m)
    })

    // Expose global selectStore so the popup button can call it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__selectStore = async (id: string, name: string, lat: number, lng: number, address: string) => {
      // Move main marker to store location
      if (map && marker) {
        const newLatLng = new L.LatLng(lat, lng)
        map.setView(newLatLng, 16)
        marker.setLatLng(newLatLng)
        map.closePopup()
      }
      // Notify Flutter via LocationChannel (for address fill)
      await notifyFlutter(lat, lng, address)
      // Also notify Flutter via StoreChannel with full store payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).StoreChannel) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).StoreChannel.postMessage(JSON.stringify({ id, name, lat, lng, address }))
      }
    }
  } catch {
    // Fail silently
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

    marker = L.marker([lat, lng], { draggable: true }).addTo(map)

    // Helper to send updates to Flutter
    const notifyFlutter = async (newLat: number, newLng: number, address = '') => {
      let resolvedAddress = address
      if (!resolvedAddress) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`)
          const data = await response.json()
          resolvedAddress = data.display_name || `Lokasi (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`
        } catch {
          resolvedAddress = `Lokasi (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).LocationChannel) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).LocationChannel.postMessage(
          JSON.stringify({
            lat: newLat,
            lng: newLng,
            address: resolvedAddress
          })
        )
      }
    }

    // Drag events
    marker.on('dragend', async () => {
      const pos = marker.getLatLng()
      await notifyFlutter(pos.lat, pos.lng)
    })

    // Map click events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on('click', async (e: any) => {
      marker.setLatLng(e.latlng)
      await notifyFlutter(e.latlng.lat, e.latlng.lng)
    })

    // Expose moveMap globally for Flutter WebViewController to call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).moveMap = async (newLat: number, newLng: number, address = '') => {
      if (map && marker) {
        const newLatLng = new L.LatLng(newLat, newLng)
        map.setView(newLatLng, 16)
        marker.setLatLng(newLatLng)
        await notifyFlutter(newLat, newLng, address)
      }
    }

    // Load store markers (always — visible as reference in picker)
    await loadStoreMarkers(notifyFlutter)
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
</style>
