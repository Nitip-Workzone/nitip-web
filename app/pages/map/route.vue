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
let L: any = null
let leafletPromise: Promise<any> | null = null

const loadLeaflet = () => {
  if (leafletPromise) return leafletPromise
  leafletPromise = (async () => {
    const leaflet = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
    // Fix marker icons
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (leaflet.Icon.Default.prototype as any)._getIconUrl
    leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
    L = leaflet
    return leaflet
  })()
  return leafletPromise
}

const initMap = async () => {
  const originLat = route.query.origin_lat ? parseFloat(route.query.origin_lat as string) : null
  const originLng = route.query.origin_lng ? parseFloat(route.query.origin_lng as string) : null
  const destLat = route.query.dest_lat ? parseFloat(route.query.dest_lat as string) : null
  const destLng = route.query.dest_lng ? parseFloat(route.query.dest_lng as string) : null

  if (originLat === null || originLng === null || destLat === null || destLng === null || isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
    console.warn('Coordinates not ready yet')
    return
  }

  // If coordinates are 0, wait for valid data
  if (originLat === 0 && originLng === 0 && destLat === 0 && destLng === 0) {
    console.warn('Coordinates are zero, waiting for real coordinates')
    return
  }

  const leaflet = await loadLeaflet()

  if (!map && mapContainer.value) {
    map = leaflet.map(mapContainer.value, {
      zoomControl: false
    })

    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
  }

  if (!map) return

  // Clear existing markers and polylines safely using leaflet instance
  map.eachLayer((layer: any) => {
    if (layer instanceof leaflet.Marker || layer instanceof leaflet.Polyline) {
      map.removeLayer(layer)
    }
  })

  // Customize origin (green) and destination (red) markers
  const originIcon = leaflet.divIcon({
    html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-pin-marker',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  })

  const destIcon = leaflet.divIcon({
    html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-pin-marker',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  })

  leaflet.marker([originLat, originLng], { icon: originIcon }).addTo(map)
  leaflet.marker([destLat, destLng], { icon: destIcon }).addTo(map)

  const bounds = leaflet.latLngBounds([
    [originLat, originLng],
    [destLat, destLng]
  ])
  setTimeout(() => {
    if (map) {
      map.invalidateSize()
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, 100)

  // Fetch routing geometry from Project OSRM API
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.routes && data.routes.length > 0) {
      const coordinates = data.routes[0].geometry.coordinates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const latLngs = coordinates.map((c: any) => [c[1], c[0]])
      
      const polyline = leaflet.polyline(latLngs, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.8,
        lineJoin: 'round'
      }).addTo(map)
      
      setTimeout(() => {
        if (map) {
          map.invalidateSize()
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
        }
      }, 100)
    } else {
      throw new Error('No routes found')
    }
  } catch (e) {
    console.warn('Failed to fetch routing, falling back to straight line:', e)
    const fallbackLine = leaflet.polyline([[originLat, originLng], [destLat, destLng]], {
      color: '#6366f1',
      weight: 4,
      dashArray: '5, 10',
      opacity: 0.8
    }).addTo(map)
    setTimeout(() => {
      if (map) {
        map.invalidateSize()
        map.fitBounds(fallbackLine.getBounds(), { padding: [40, 40] })
      }
    }, 100)
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
