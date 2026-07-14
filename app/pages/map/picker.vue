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
