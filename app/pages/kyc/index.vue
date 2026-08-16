<script setup lang="ts">
import { ChevronLeft, Camera, Upload, AlertCircle, Trash2 } from '@lucide/vue'
import { useToastStore } from '~/stores/toast'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'user',
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
</script>

<template>
  <div class="relative min-h-screen bg-slate-50">
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div class="flex items-center justify-between px-4 h-14">
        <button 
          class="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
          @click="router.back()"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <h1 class="text-sm font-extrabold text-slate-900">Formulir Verifikasi</h1>
        <div class="w-9" />
      </div>
    </div>

    <div class="px-5 pt-6 pb-32 max-w-md mx-auto space-y-6">
      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-700">
        <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p class="text-xs font-bold leading-tight">Syarat Verifikasi e-KYC</p>
          <p class="text-[11px] mt-1 opacity-90 leading-relaxed">
            Pastikan nama profil Facebook sesuai, dan wajah pada foto selfie terlihat jelas tanpa penutup (masker/kacamata gelap).
          </p>
        </div>
      </div>

      <div class="space-y-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-soft">
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold text-slate-600">Nama Profil Facebook <span class="text-red-500">*</span></label>
          <input 
            v-model="facebookName" 
            type="text" 
            :class="['w-full h-12 rounded-xl border px-4 text-xs font-semibold focus:outline-none focus:border-primary/50 bg-slate-50 focus:bg-white transition-all', errors.facebookName ? 'border-red-300' : 'border-slate-200']"
            placeholder="Masukkan nama profil Facebook Anda" 
          >
          <p v-if="errors.facebookName" class="text-[10px] text-red-500 font-semibold">{{ errors.facebookName }}</p>
        </div>

        <div class="space-y-1.5 pt-2">
          <label class="text-[11px] font-bold text-slate-600">Screenshot Halaman Profil Facebook <span class="text-red-500">*</span></label>
          <div v-if="!facebookScreenshotPreview" class="relative">
            <input 
              type="file" 
              accept="image/*" 
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              @change="e => onFileChange(e, 'facebook')"
            >
            <div :class="['border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center bg-slate-50 transition-colors', errors.facebookScreenshot ? 'border-red-300' : 'border-slate-300 hover:border-primary/50']">
              <Upload class="w-8 h-8 text-slate-400 mb-2" />
              <p class="text-xs font-bold text-slate-700">Pilih gambar dari galeri</p>
              <p class="text-[10px] text-slate-400 mt-1">Maks 20MB (JPG/PNG)</p>
            </div>
          </div>
          <div v-else class="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 group bg-black">
            <img :src="facebookScreenshotPreview" class="w-full h-full object-contain" alt="Facebook Screenshot">
            <button 
              class="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-colors"
              @click="clearFile('facebook')"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <p v-if="errors.facebookScreenshot" class="text-[10px] text-red-500 font-semibold">{{ errors.facebookScreenshot }}</p>
        </div>

        <div class="space-y-1.5 pt-2">
          <label class="text-[11px] font-bold text-slate-600">Foto Selfie Terkini <span class="text-red-500">*</span></label>
          <div v-if="!selfiePreview" class="relative">
            <input 
              type="file" 
              accept="image/*" 
              capture="user"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              @change="e => onFileChange(e, 'selfie')"
            >
            <div :class="['border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center bg-slate-50 transition-colors', errors.selfie ? 'border-red-300' : 'border-slate-300 hover:border-primary/50']">
              <Camera class="w-8 h-8 text-slate-400 mb-2" />
              <p class="text-xs font-bold text-slate-700">Ambil foto selfie / pilih galeri</p>
              <p class="text-[10px] text-slate-400 mt-1">Pastikan wajah terlihat jelas</p>
            </div>
          </div>
          <div v-else class="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 group bg-black">
            <img :src="selfiePreview" class="w-full h-full object-cover" alt="Selfie">
            <button 
              class="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-colors"
              @click="clearFile('selfie')"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <p v-if="errors.selfie" class="text-[10px] text-red-500 font-semibold">{{ errors.selfie }}</p>
        </div>
      </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-5 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40 max-w-md mx-auto">
      <button
        :disabled="loading"
        class="w-full h-12 rounded-xl font-bold text-sm bg-primary text-white shadow-sm shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        @click="submitKyc"
      >
        <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Kirim Pengajuan
      </button>
    </div>
  </div>
</template>
