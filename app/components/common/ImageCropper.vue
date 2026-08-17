<script setup lang="ts">
/**
 * ImageCropper.vue – Wajib crop, rasio tetap per tipe agar UI user konsisten
 * product: 1:1 1200x1200, logo: 1:1 circular 400x400, cover: 16:9 1200x675
 * Library ringan custom canvas 2D <20KB, no dep, support drag/wheel/pinch/rotate
 */
const props = withDefaults(defineProps<{
  src: string
  type?: 'product' | 'logo' | 'cover'
}>(), {
  type: 'product',
})

const emit = defineEmits<{
  (e: 'cropped', payload: { blob: Blob; url: string; file: File }): void
  (e: 'cancel'): void
}>()

const RATIOS: Record<string, number> = {
  product: 1,
  logo: 1,
  cover: 16 / 9,
}
const OUTPUTS: Record<string, { w: number; h: number }> = {
  product: { w: 1200, h: 1200 },
  logo: { w: 400, h: 400 },
  cover: { w: 1200, h: 675 },
}
const LABELS: Record<string, { title: string; sub: string; size: string }> = {
  product: { title: 'Crop Foto Produk Wajib 1:1', sub: 'Geser & zoom agar produk di tengah, hasil konsisten 1200×1200', size: '1:1 • 1200×1200' },
  logo: { title: 'Crop Logo Toko Wajib 1:1', sub: 'Logo bulat, wajah/logo di tengah. Output 400×400', size: '1:1 Circular • 400×400' },
  cover: { title: 'Crop Sampul Toko Wajib 16:9', sub: 'Banner sampul agar tidak gepeng di detail merchant. Output 1200×675', size: '16:9 • 1200×675' },
}

const aspect = computed(() => RATIOS[props.type] ?? 1)
const output = computed(() => OUTPUTS[props.type] ?? OUTPUTS.product)
const label = computed(() => LABELS[props.type] ?? LABELS.product)
const isCircular = computed(() => props.type === 'logo')

const containerRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const imgLoaded = ref(false)
const naturalW = ref(0)
const naturalH = ref(0)

const scale = ref(1)
const minScale = ref(1)
const maxScale = ref(3)
const offsetX = ref(0)
const offsetY = ref(0)
const rotation = ref(0) // 0,90,180,270
const dragging = ref(false)
let lastX = 0
let lastY = 0
let initialPinchDist = 0
let initialPinchScale = 1

const canvasBox = ref({ w: 280, h: 280 }) // display crop box size

// Calculate initial fit cover
const calcInitial = () => {
  if (!containerRef.value || naturalW.value === 0) return
  const boxW = canvasBox.value.w
  const boxH = canvasBox.value.h
  // Fit so image covers crop box
  const scaleX = boxW / naturalW.value
  const scaleY = boxH / naturalH.value
  const cover = Math.max(scaleX, scaleY) * 1.1 // sedikit lebih besar
  minScale.value = cover * 0.8
  maxScale.value = cover * 4
  scale.value = cover
  offsetX.value = 0
  offsetY.value = 0
}

const onImgLoad = () => {
  if (!imgRef.value) return
  naturalW.value = imgRef.value.naturalWidth
  naturalH.value = imgRef.value.naturalHeight
  imgLoaded.value = true
  nextTick(() => calcInitial())
}

watch(() => props.src, () => {
  imgLoaded.value = false
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  rotation.value = 0
})

onMounted(() => {
  const updateBox = () => {
    if (!containerRef.value) return
    const vw = window.innerWidth
    const size = Math.min(vw - 64, 360) // mobile responsif
    if (props.type === 'cover') {
      const w = size
      const h = w / aspect.value
      canvasBox.value = { w, h }
    } else {
      canvasBox.value = { w: size, h: size / aspect.value }
    }
    calcInitial()
  }
  updateBox()
  window.addEventListener('resize', updateBox)
  onUnmounted(() => window.removeEventListener('resize', updateBox))
})

const onPointerDown = (e: PointerEvent | TouchEvent) => {
  dragging.value = true
  const pt = getPoint(e)
  lastX = pt.x
  lastY = pt.y
  ;(e.currentTarget as HTMLElement)?.setPointerCapture?.((e as PointerEvent).pointerId)
}
const onPointerMove = (e: PointerEvent | TouchEvent) => {
  if (!dragging.value) return
  if ((e as TouchEvent).touches && (e as TouchEvent).touches.length === 2) {
    handlePinch(e as TouchEvent)
    return
  }
  const pt = getPoint(e)
  offsetX.value += pt.x - lastX
  offsetY.value += pt.y - lastY
  lastX = pt.x
  lastY = pt.y
  clampOffsets()
}
const onPointerUp = () => {
  dragging.value = false
  initialPinchDist = 0
}

const getPoint = (e: PointerEvent | TouchEvent) => {
  const t = (e as TouchEvent).touches?.[0] ?? (e as PointerEvent)
  return { x: (t as PointerEvent).clientX ?? (t as Touch).clientX, y: (t as PointerEvent).clientY ?? (t as Touch).clientY }
}

const handlePinch = (e: TouchEvent) => {
  if (e.touches.length !== 2) return
  e.preventDefault()
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (initialPinchDist === 0) {
    initialPinchDist = dist
    initialPinchScale = scale.value
  } else {
    const factor = dist / initialPinchDist
    scale.value = Math.min(maxScale.value, Math.max(minScale.value, initialPinchScale * factor))
    clampOffsets()
  }
}

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    e.preventDefault()
    initialPinchDist = 0
  } else {
    onPointerDown(e)
  }
}

const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = -e.deltaY * 0.001
  scale.value = Math.min(maxScale.value, Math.max(minScale.value, scale.value * (1 + delta)))
  clampOffsets()
}

const clampOffsets = () => {
  // Batasi agar tidak kosong di crop box
  const limit = 200
  offsetX.value = Math.max(-limit, Math.min(limit, offsetX.value))
  offsetY.value = Math.max(-limit, Math.min(limit, offsetY.value))
}

const rotateLeft = () => {
  rotation.value = (rotation.value - 90 + 360) % 360
}
const rotateRight = () => {
  rotation.value = (rotation.value + 90) % 360
}
const resetAll = () => {
  calcInitial()
  rotation.value = 0
}

const zoomIn = () => {
  scale.value = Math.min(maxScale.value, scale.value * 1.2)
}
const zoomOut = () => {
  scale.value = Math.max(minScale.value, scale.value / 1.2)
}

// Render cropped to blob
const processing = ref(false)
const doCrop = async () => {
  if (!imgRef.value || !imgLoaded.value) return
  processing.value = true
  try {
    const outW = output.value.w
    const outH = output.value.h
    const off = document.createElement('canvas')
    off.width = outW
    off.height = outH
    const ctx = off.getContext('2d')
    if (!ctx) throw new Error('canvas 2d not supported')

    // Fill white bg (jpeg)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outW, outH)

    // Calculate source mapping
    // Crop box in display corresponds to output
    // We need to map image transform: scale, offset, rotation, centered
    const boxW = canvasBox.value.w
    const boxH = canvasBox.value.h

    // Save
    ctx.save()
    if (isCircular.value) {
      ctx.beginPath()
      ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2)
      ctx.clip()
    }

    // Transform: move to center, rotate, scale, translate offset, draw image centered then offset
    // Normalize: image natural size * display scale vs box
    // We simulate: image drawn at (boxW/2 + offsetX, boxH/2 + offsetY) with scaled size natural*scale/displayPixelRatio
    // For output canvas, map box to output
    const scaleToOutput = outW / boxW // how much box maps to output width

    ctx.translate(outW / 2, outH / 2)
    ctx.rotate((rotation.value * Math.PI) / 180)
    ctx.translate(offsetX.value * scaleToOutput, offsetY.value * scaleToOutput)
    ctx.scale(scale.value * scaleToOutput, scale.value * scaleToOutput)

    // Draw image centered at 0,0
    ctx.drawImage(imgRef.value, -naturalW.value / 2, -naturalH.value / 2, naturalW.value, naturalH.value)
    ctx.restore()

    const blob: Blob | null = await new Promise((resolve) => off.toBlob((b) => resolve(b), 'image/jpeg', 0.75))
    if (!blob) throw new Error('Gagal crop')
    const url = URL.createObjectURL(blob)
    const file = new File([blob], `${props.type}-${Date.now()}.jpg`, { type: 'image/jpeg' })
    emit('cropped', { blob, url, file })
  } catch (e) {
    console.error('[crop] failed', e)
  } finally {
    processing.value = false
  }
}

const sliderScale = computed({
  get: () => scale.value,
  set: (v: number) => {
    scale.value = Math.min(maxScale.value, Math.max(minScale.value, v))
  },
})
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-md">
    <!-- Header -->
    <div class="shrink-0 px-4 py-3 flex items-center justify-between bg-black/40 text-white">
      <div class="min-w-0">
        <p class="text-sm font-black truncate">{{ label.title }}</p>
        <p class="text-[11px] opacity-70 mt-0.5 truncate">{{ label.sub }} • {{ label.size }}</p>
      </div>
      <button class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 ml-3" @click="emit('cancel')">
        ✕
      </button>
    </div>

    <!-- Crop area -->
    <div
      ref="containerRef"
      class="flex-1 relative flex items-center justify-center overflow-hidden select-none touch-none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @touchstart="onTouchStart"
      @touchmove="onPointerMove"
      @touchend="onPointerUp"
      @wheel="onWheel"
    >
      <!-- Dim background -->
      <div class="absolute inset-0 bg-black/60" />

      <!-- Crop box container -->
      <div
        class="relative"
        :style="{ width: canvasBox.w + 'px', height: canvasBox.h + 'px' }"
      >
        <!-- Actual image layer clipped to crop box -->
        <div
          class="absolute inset-0 overflow-hidden"
          :class="isCircular ? 'rounded-full' : 'rounded-xl'"
          :style="{ border: '2px dashed rgba(255,255,255,0.8)' }"
        >
          <!-- eslint-disable-next-line vue/html-self-closing -->
          <img
            ref="imgRef"
            :src="src"
            alt="crop source"
            class="absolute top-1/2 left-1/2 max-w-none select-none"
            :style="{
              width: naturalW ? naturalW * scale + 'px' : 'auto',
              height: naturalH ? naturalH * scale + 'px' : 'auto',
              transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }"
            draggable="false"
            @load="onImgLoad"
          />
          <!-- Grid 3x3 -->
          <div class="absolute inset-0 pointer-events-none">
            <div class="w-full h-full grid grid-cols-3 grid-rows-3">
              <div v-for="i in 9" :key="i" class="border border-white/20" />
            </div>
          </div>
        </div>

        <!-- Outside dim using shadow -->
        <div class="absolute inset-0 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" :class="isCircular ? 'rounded-full' : 'rounded-xl'" />
      </div>

      <!-- Loading overlay when image not loaded -->
      <div v-if="!imgLoaded" class="absolute inset-0 flex items-center justify-center text-white/70 text-xs">
        Memuat gambar...
      </div>
    </div>

    <!-- Controls -->
    <div class="shrink-0 bg-black/80 backdrop-blur-md p-4 space-y-3">
      <!-- Zoom slider -->
      <div class="flex items-center gap-3">
        <button class="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center active:scale-95" @click="zoomOut">−</button>
        <input
          v-model.number="sliderScale"
          type="range"
          :min="minScale"
          :max="maxScale"
          step="0.01"
          class="flex-1 accent-primary"
        />
        <button class="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center active:scale-95" @click="zoomIn">+</button>
      </div>

      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button class="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold active:scale-95" @click="rotateLeft">↺ 90°</button>
          <button class="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold active:scale-95" @click="rotateRight">↻ 90°</button>
          <button class="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold active:scale-95" @click="resetAll">Reset</button>
        </div>
        <div class="text-[10px] text-white/60 hidden sm:block">Geser untuk posisi • Pinch/scroll untuk zoom</div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          class="flex-1 h-11 rounded-2xl bg-white/10 text-white text-xs font-bold active:scale-[0.98]"
          @click="emit('cancel')"
        >
          Batal
        </button>
        <button
          :disabled="processing || !imgLoaded"
          class="flex-1 h-11 rounded-2xl bg-primary text-white text-xs font-black disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
          @click="doCrop"
        >
          <span v-if="processing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ processing ? 'Memproses...' : 'Simpan Crop Wajib' }}
        </button>
      </div>

      <p class="text-[10px] text-white/50 text-center">Crop wajib agar foto konsisten di aplikasi pembeli. Rasio {{ label.size }} tetap.</p>
    </div>
  </div>
</template>
