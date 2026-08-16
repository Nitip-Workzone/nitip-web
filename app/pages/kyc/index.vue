<script setup lang="ts">
import { ArrowLeft, Camera, Upload, AlertCircle, Trash2, Users2 } from '@lucide/vue'
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

const loading = ref(false)
const errors = ref<Record<string, string>>({})

const onFileChange = (e: Event, type: 'facebook' | 'selfie') => {
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
  if (type === 'facebook') {
    facebookScreenshotFile.value = file
    facebookScreenshotPreview.value = preview
    delete errors.value.facebookScreenshot
  } else {
    selfieFile.value = file
    selfiePreview.value = preview
    delete errors.value.selfie
  }
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
  }
}

const validateForm = () => {
  errors.value = {}
  if (!facebookName.value || facebookName.value.trim().length < 3) {
    errors.value.facebookName = 'Nama profil Facebook wajib diisi minimal 3 karakter'
  }
  if (!facebookScreenshotFile.value) {
    errors.value.facebookScreenshot = 'Screenshot profil Facebook wajib diunggah'
  }
  if (!selfieFile.value) {
    errors.value.selfie = 'Foto selfie wajib diunggah'
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
        <div class="w-[140px] h-[140px] mx-auto bg-white flex items-center justify-center">
          <div class="w-28 h-28 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Users2 class="w-14 h-14 text-primary" />
          </div>
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

      <!-- Selfie Upload -->
      <div class="space-y-2">
        <label class="text-sm font-semibold text-slate-700">Foto Selfie Terkini</label>
        
        <!-- Preview -->
        <div v-if="selfiePreview" class="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-black" style="aspect-ratio: 3/4;">
          <img :src="selfiePreview" class="w-full h-full object-cover" alt="Selfie">
          <button
            class="absolute top-2 right-2 p-2 bg-black/50 hover:bg-primary text-white rounded-xl backdrop-blur-sm transition-colors flex items-center gap-1.5 text-xs font-bold"
            @click="clearFile('selfie')"
          >
            <Trash2 class="w-3.5 h-3.5" />
            Ambil Ulang
          </button>
        </div>

        <!-- Upload options -->
        <div v-else class="space-y-3">
          <label class="relative block cursor-pointer">
            <input type="file" accept="image/*" capture="user" class="hidden" @change="e => onFileChange(e, 'selfie')">
            <div :class="['rounded-2xl p-4 border-2 flex items-center gap-4 hover:border-primary/50 transition-colors', errors.selfie ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white']">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Camera class="w-6 h-6 text-primary" />
              </div>
              <div class="text-left">
                <p class="text-sm font-bold text-slate-800">Ambil Selfie Sekarang</p>
                <p class="text-xs text-slate-500 mt-0.5">Pastikan wajah terlihat jelas, tanpa masker</p>
              </div>
              <span class="ml-auto text-slate-300">›</span>
            </div>
          </label>

          <label class="relative block cursor-pointer">
            <input type="file" accept="image/*" class="hidden" @change="e => onFileChange(e, 'selfie')">
            <div :class="['rounded-2xl p-4 border-2 flex items-center gap-4 hover:border-primary/50 transition-colors', errors.selfie ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white']">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Upload class="w-6 h-6 text-primary" />
              </div>
              <div class="text-left">
                <p class="text-sm font-bold text-slate-800">Pilih dari Galeri</p>
                <p class="text-xs text-slate-500 mt-0.5">Pilih foto selfie terbaru dari galeri Anda</p>
              </div>
              <span class="ml-auto text-slate-300">›</span>
            </div>
          </label>
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
