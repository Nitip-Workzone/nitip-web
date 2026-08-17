<script setup lang="ts">
import { ArrowLeft, Camera, Upload, AlertCircle, Trash2, Users2, Video } from '@lucide/vue'
import { useToastStore } from '~/stores/toast'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'default',
})

const router = useRouter()
const toastStore = useToastStore()
const { request } = useApi()

const facebookName = ref('')
const facebookScreenshotFile = ref<File | null>(null)
const facebookScreenshotPreview = ref<string | null>(null)

const selfieFile = ref<File | null>(null)
const selfiePreview = ref<string | null>(null)

// Camera live state for selfie (must be from camera directly, no file picker)
const selfieVideoRef = ref<HTMLVideoElement | null>(null)
const selfieCanvasRef = ref<HTMLCanvasElement | null>(null)
const selfieStream = ref<MediaStream | null>(null)
const selfieCameraActive = ref(false)
const selfieCameraError = ref<string | null>(null)
const selfieCapturedFromCamera = ref(false) // must be true to ensure camera capture, not file
const isSecureContext = ref<boolean>(true)

if (import.meta.client) {
  isSecureContext.value = window.isSecureContext || location.hostname === 'localhost' || location.protocol === 'https:'
}

const loading = ref(false)
const errors = ref<Record<string, string>>({})

// Fallback for insecure context / old WebView: still must be camera capture attribute, not gallery
const onFallbackSelfieFile = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (file.size > 20 * 1024 * 1024) {
    toastStore.add('Ukuran gambar maksimal 20MB')
    return
  }
  if (!file.type.startsWith('image/')) {
    toastStore.add('Hanya menerima format gambar')
    return
  }
  const preview = URL.createObjectURL(file)
  // Mark as camera captured via fallback (capture=user ensures camera intent on mobile)
  selfieFile.value = file
  selfiePreview.value = preview
  selfieCapturedFromCamera.value = true
  delete errors.value.selfie
  selfieCameraError.value = null
}

const onFileChange = (e: Event, type: 'facebook') => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 20 * 1024 * 1024) {
    toastStore.add('Ukuran gambar maksimal 20MB')
    return
  }
  if (!file.type.startsWith('image/')) {
    toastStore.add('Hanya menerima format gambar (JPG/PNG)')
    return
  }

  const preview = URL.createObjectURL(file)
  facebookScreenshotFile.value = file
  facebookScreenshotPreview.value = preview
  delete errors.value.facebookScreenshot
}

const clearFile = (type: 'facebook' | 'selfie') => {
  if (type === 'facebook') {
    facebookScreenshotFile.value = null
    if (facebookScreenshotPreview.value) URL.revokeObjectURL(facebookScreenshotPreview.value)
    facebookScreenshotPreview.value = null
  } else {
    selfieFile.value = null
    if (selfiePreview.value) URL.revokeObjectURL(selfiePreview.value)
    selfiePreview.value = null
    selfieCapturedFromCamera.value = false
    stopSelfieCamera()
  }
}

async function attachSelfieStreamToVideo() {
  await nextTick()
  const video = selfieVideoRef.value
  const stream = selfieStream.value
  if (!video || !stream) return
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  try {
    await video.play()
  } catch {
    // play might be blocked, try again on canplay
    video.addEventListener('canplay', () => { video.play().catch(() => {}) }, { once: true })
  }
}

async function startSelfieCamera() {
  selfieCameraError.value = null
  // Render video container first, then get stream
  selfieCameraActive.value = true
  await nextTick()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1024 } },
      audio: false,
    })
    selfieStream.value = stream
    await attachSelfieStreamToVideo()
  } catch (err: unknown) {
    selfieCameraActive.value = false
    const name = (err as { name?: string })?.name
    const msg = name === 'NotAllowedError' ? 'Akses kamera ditolak, aktifkan izin kamera di browser' : name === 'NotFoundError' ? 'Kamera tidak ditemukan di perangkat ini' : `Gagal membuka kamera selfie (${name || 'unknown'}), pastikan perangkat memiliki kamera depan`
    selfieCameraError.value = msg
    toastStore.add(msg)
    if (selfieStream.value) {
      selfieStream.value.getTracks().forEach(t => t.stop())
      selfieStream.value = null
    }
  }
}

function stopSelfieCamera() {
  if (selfieStream.value) {
    selfieStream.value.getTracks().forEach(t => t.stop())
    selfieStream.value = null
  }
  if (selfieVideoRef.value) {
    const v = selfieVideoRef.value
    v.pause()
    v.srcObject = null
  }
  selfieCameraActive.value = false
}

function captureSelfieFromCamera() {
  const video = selfieVideoRef.value
  const canvas = selfieCanvasRef.value
  if (!video || !canvas) return
  const w = video.videoWidth || 720
  const h = video.videoHeight || 1280
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // Mirror selfie for natural preview
  ctx.translate(w, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, w, h)
  canvas.toBlob((blob) => {
    if (!blob) {
      toastStore.add('Gagal menangkap selfie dari kamera')
      return
    }
    const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' })
    const preview = URL.createObjectURL(file)
    if (selfiePreview.value) URL.revokeObjectURL(selfiePreview.value)
    selfieFile.value = file
    selfiePreview.value = preview
    selfieCapturedFromCamera.value = true
    delete errors.value.selfie
    stopSelfieCamera()
    toastStore.add('Selfie berhasil diambil langsung dari kamera')
  }, 'image/jpeg', 0.9)
}

onUnmounted(() => {
  stopSelfieCamera()
  if (facebookScreenshotPreview.value) URL.revokeObjectURL(facebookScreenshotPreview.value)
  if (selfiePreview.value) URL.revokeObjectURL(selfiePreview.value)
})

const validateForm = () => {
  errors.value = {}
  if (!facebookName.value || facebookName.value.trim().length < 3) {
    errors.value.facebookName = 'Nama profil Facebook wajib diisi minimal 3 karakter'
  }
  if (!facebookScreenshotFile.value) {
    errors.value.facebookScreenshot = 'Screenshot profil Facebook wajib diunggah'
  }
  if (!selfieFile.value) {
    errors.value.selfie = 'Foto selfie wajib diambil langsung dari kamera, tidak boleh pilih file'
  } else if (!selfieCapturedFromCamera.value) {
    errors.value.selfie = 'Foto selfie wajib dari kamera langsung, bukan dari galeri/file'
  }
  return Object.keys(errors.value).length === 0
}

const submitKyc = async () => {
  if (!validateForm()) {
    toastStore.add('Mohon lengkapi semua data wajib yang ditandai merah.')
    return
  }

  loading.value = true
  try {
    const formData = new FormData()
    formData.append('facebook_name', facebookName.value.trim())
    formData.append('facebook_screenshot', facebookScreenshotFile.value!)
    formData.append('selfie', selfieFile.value!)

    await request('/kyc/submit', {
      method: 'POST',
      body: formData,
    })

    toastStore.add('Pengajuan verifikasi berhasil dikirim!')
    router.replace('/kyc/status')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Array<{ message?: string }> } }
    const msg = err.data?.message || (err.data?.errors?.[0]?.message) || 'Gagal mengirim pengajuan verifikasi.'
    toastStore.add(msg)
  } finally {
    loading.value = false
  }
}

// Step indicator labels for appbar
const stepLabel = 'Langkah 1 dari 2'
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col max-w-md mx-auto">
    <!-- AppBar with step indicator -->
    <div class="flex items-center justify-between px-4 h-14 mt-6">
      <button
        class="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-800"
        @click="router.back()"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <!-- Step dots -->
      <div class="flex items-center gap-1.5">
        <div class="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <span class="text-white text-xs font-bold">1</span>
        </div>
        <div class="w-6 h-0.5 bg-slate-200" />
        <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
          <span class="text-slate-500 text-xs font-bold">2</span>
        </div>
        <div class="w-6 h-0.5 bg-slate-200" />
        <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
          <span class="text-slate-500 text-xs font-bold">3</span>
        </div>
      </div>
      <div class="w-9" />
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 px-6 pb-6 space-y-6 overflow-y-auto">
      <!-- Header -->
      <div class="pt-4 space-y-2 text-center">
        <div class="w-[160px] h-[160px] mx-auto bg-white flex items-center justify-center">
          <img src="/images/kyc_ktp.png" alt="Facebook Profile" class="w-full h-full object-contain">
        </div>
        <h2 class="text-[22px] font-extrabold text-slate-900">Profil Facebook</h2>
        <p class="text-sm text-slate-500 leading-relaxed">
          Masukkan nama profil Facebook Anda dan unggah screenshot profil Anda.
        </p>
      </div>

      <!-- Facebook Name -->
      <div class="space-y-1.5">
        <label class="text-sm font-semibold text-slate-700">Nama Profil Facebook</label>
        <div class="relative">
          <Users2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            v-model="facebookName"
            type="text"
            :class="['w-full h-12 rounded-xl border pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all', errors.facebookName ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-primary']"
            placeholder="Nama akun profil Facebook Anda"
          >
        </div>
        <p v-if="errors.facebookName" class="text-xs text-red-500 font-medium">{{ errors.facebookName }}</p>
      </div>

      <!-- Screenshot Upload -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-slate-700">Screenshot Profil Facebook</label>
        
        <!-- Preview -->
        <div v-if="facebookScreenshotPreview" class="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-black" style="aspect-ratio: 4/3;">
          <img :src="facebookScreenshotPreview" class="w-full h-full object-contain" alt="Facebook Screenshot">
          <button
            class="absolute top-2 right-2 p-2 bg-black/50 hover:bg-primary text-white rounded-xl backdrop-blur-sm transition-colors flex items-center gap-1.5 text-xs font-bold"
            @click="clearFile('facebook')"
          >
            <Trash2 class="w-3.5 h-3.5" />
            Ambil Ulang
          </button>
        </div>

        <!-- Upload options -->
        <div v-else class="space-y-3">
          <label class="relative block cursor-pointer">
            <input type="file" accept="image/*" capture="environment" class="hidden" @change="e => onFileChange(e, 'facebook')">
            <div :class="['rounded-2xl p-4 border-2 flex items-center gap-4 hover:border-primary/50 transition-colors', errors.facebookScreenshot ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white']">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Camera class="w-6 h-6 text-primary" />
              </div>
              <div class="text-left">
                <p class="text-sm font-bold text-slate-800">Ambil Foto Langsung</p>
                <p class="text-xs text-slate-500 mt-0.5">Gunakan kamera untuk mengambil foto screen profil</p>
              </div>
              <span class="ml-auto text-slate-300">›</span>
            </div>
          </label>

          <label class="relative block cursor-pointer">
            <input type="file" accept="image/*" class="hidden" @change="e => onFileChange(e, 'facebook')">
            <div :class="['rounded-2xl p-4 border-2 flex items-center gap-4 hover:border-primary/50 transition-colors', errors.facebookScreenshot ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white']">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Upload class="w-6 h-6 text-primary" />
              </div>
              <div class="text-left">
                <p class="text-sm font-bold text-slate-800">Pilih dari Galeri <span class="text-primary text-xs">(Sangat Disarankan)</span></p>
                <p class="text-xs text-slate-500 mt-0.5">Upload screenshot profil Facebook dari galeri</p>
              </div>
              <span class="ml-auto text-slate-300">›</span>
            </div>
          </label>
        </div>
        <p v-if="errors.facebookScreenshot" class="text-xs text-red-500 font-medium">{{ errors.facebookScreenshot }}</p>
      </div>

      <!-- Selfie Upload - WAJIB KAMERA LANGSUNG, tidak boleh file -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-slate-700 flex items-center gap-2">
          Foto Selfie Terkini
          <span class="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-bold border border-red-200">Wajib Kamera Langsung</span>
        </label>
        
        <!-- Preview dari kamera -->
        <div v-if="selfiePreview" class="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-black" style="aspect-ratio: 3/4;">
          <img :src="selfiePreview" class="w-full h-full object-cover" alt="Selfie">
          <div class="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1">
            <Video class="w-3 h-3" /> Kamera Langsung
          </div>
          <button
            class="absolute top-2 right-2 p-2 bg-black/50 hover:bg-primary text-white rounded-xl backdrop-blur-sm transition-colors flex items-center gap-1.5 text-xs font-bold"
            @click="clearFile('selfie')"
          >
            <Trash2 class="w-3.5 h-3.5" />
            Ambil Ulang
          </button>
        </div>

        <!-- Camera live - FIXED preview hitam: nextTick attach + playsInline + secure context check -->
        <div v-else class="space-y-3">
          <!-- Video element - always mounted when cameraActive, with proper lifecycle -->
          <div v-if="selfieCameraActive" class="relative w-full rounded-2xl overflow-hidden border-2 border-primary/30 bg-black" style="aspect-ratio: 3/4;">
            <video
              ref="selfieVideoRef"
              autoplay
              playsinline
              muted
              class="absolute inset-0 w-full h-full object-cover"
              style="transform: scaleX(-1);"
              @loadedmetadata="() => { if (selfieVideoRef) selfieVideoRef.play().catch(()=>{}) }"
            ></video>
            <!-- Fallback black overlay hidden when video has dimensions -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none" :class="selfieVideoRef && selfieVideoRef.videoWidth>0 ? 'hidden' : 'flex'">
              <div class="text-white/60 text-xs">Memuat kamera...</div>
            </div>
            <canvas ref="selfieCanvasRef" class="hidden"></canvas>
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 z-10">
              <button class="min-w-[90px] px-5 py-3 bg-white text-slate-800 rounded-2xl text-sm font-bold shadow-lg" @click="stopSelfieCamera()">Batal</button>
              <button class="min-w-[130px] px-5 py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg flex items-center gap-2 justify-center" @click="captureSelfieFromCamera()">
                <Camera class="w-4 h-4" /> Ambil Selfie
              </button>
            </div>
            <div class="absolute top-2 left-2 right-2 flex justify-between z-10">
              <span class="px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm">Kamera Aktif - Wajah jelas, tanpa masker</span>
              <span v-if="selfieStream" class="px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[9px] font-bold">● LIVE</span>
            </div>
          </div>

          <!-- Start camera button - wajib kamera, tidak ada galeri -->
          <button
            v-if="!selfieCameraActive"
            class="w-full rounded-2xl p-4 border-2 flex items-center gap-4 hover:border-primary/50 transition-colors bg-white text-left"
            :class="errors.selfie ? 'border-red-300 bg-red-50' : 'border-slate-200'"
            @click="startSelfieCamera()"
          >
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Camera class="w-6 h-6 text-primary" />
            </div>
            <div class="text-left flex-1">
              <p class="text-sm font-bold text-slate-800">Ambil Selfie Sekarang - Wajib Kamera</p>
              <p class="text-xs text-slate-500 mt-0.5">Wajib dari kamera langsung, tidak boleh pilih file. Pastikan wajah jelas, tanpa masker</p>
              <p v-if="!isSecureContext" class="text-[10px] text-amber-600 mt-1">⚠️ Memerlukan HTTPS - jika tidak support, akan fallback ke capture</p>
            </div>
            <span class="ml-auto text-slate-300 text-xl">›</span>
          </button>

          <!-- Fallback capture input for insecure context or iOS WebView lama -->
          <div v-if="!selfieCameraActive && !isSecureContext" class="space-y-2">
            <label class="relative block cursor-pointer">
              <input type="file" accept="image/*" capture="user" class="hidden" @change="e => onFallbackSelfieFile(e)">
              <div class="rounded-2xl p-3 border border-amber-300 bg-amber-50 flex items-center gap-3">
                <Camera class="w-5 h-5 text-amber-600" />
                <div class="text-left">
                  <p class="text-xs font-bold text-amber-800">Fallback: Ambil via Kamera Sistem</p>
                  <p class="text-[10px] text-amber-700">Jika preview hitam, gunakan ini (tetap wajib kamera)</p>
                </div>
              </div>
            </label>
          </div>

          <canvas ref="selfieCanvasRef" class="hidden"></canvas>

          <p v-if="selfieCameraError" class="text-xs text-red-500 font-medium bg-red-50 p-3 rounded-xl border border-red-200 whitespace-pre-wrap">{{ selfieCameraError }}</p>
          <div class="rounded-xl p-3 bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <p class="font-bold">🔒 Keamanan eKYC:</p>
            <p class="mt-1">Foto selfie <strong>wajib diambil langsung dari kamera</strong> perangkat, tidak boleh memilih file dari galeri. Preview harus menampilkan wajah Anda secara live sebelum klik Ambil Selfie.</p>
            <p v-if="selfieCameraActive && selfieVideoRef && selfieVideoRef.videoWidth===0" class="mt-2 text-[10px] text-amber-700">Debug: videoWidth=0, stream={{ !!selfieStream }}, tracks={{ selfieStream?.getVideoTracks().length || 0 }}, jika tetap hitam coba tutup dan buka lagi atau cek izin kamera browser.</p>
          </div>
        </div>
        <p v-if="errors.selfie" class="text-xs text-red-500 font-medium">{{ errors.selfie }}</p>
      </div>

      <!-- Tips Box -->
      <div class="rounded-2xl p-4 bg-primary/5 border border-primary/10 space-y-2.5">
        <div class="flex items-start gap-3">
          <AlertCircle class="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p class="text-xs text-primary/80 font-medium">Profil Facebook tidak boleh dikunci/private</p>
        </div>
        <div class="flex items-start gap-3">
          <AlertCircle class="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p class="text-xs text-primary/80 font-medium">Foto wajah di profil harus mirip dengan selfie Anda</p>
        </div>
        <div class="flex items-start gap-3">
          <AlertCircle class="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p class="text-xs text-primary/80 font-medium">Akun baru / palsu akan ditolak saat verifikasi</p>
        </div>
      </div>
    </div>

    <!-- Bottom CTA -->
    <div class="px-6 pt-4 pb-10 bg-white shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)] border-t border-slate-100">
      <button
        :disabled="loading || (!facebookScreenshotFile && !selfieFile)"
        class="w-full h-14 rounded-2xl font-bold text-base bg-primary text-white shadow-sm shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        @click="submitKyc"
      >
        <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Lanjut ke Selfie
      </button>
    </div>
  </div>
</template>
