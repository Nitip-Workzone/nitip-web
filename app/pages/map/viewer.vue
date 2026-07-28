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
