<script setup lang="ts">
import { useMerchantsStore } from '~/stores/merchants'
import { useToastStore } from '~/stores/toast'
import { Store, MapPin, Save, ArrowLeft, Clock, Star, Wallet, Camera } from '@lucide/vue'

definePageMeta({
  layout: 'user',
  ssr: false,
})

const merchantsStore = useMerchantsStore()
const toastStore = useToastStore()
const router = useRouter()

const name = ref('')
const description = ref('')
const address = ref('')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const category = ref('food')
const imageUrl = ref('')
const coverUrl = ref('')
const loading = ref(true)
const saving = ref(false)
const showLocationPicker = ref(false)

// Crop wajib logo 1:1 circular 400 & cover 16:9 1200x675
const cropperOpen = ref(false)
const cropperSrc = ref('')
const cropperType = ref<'logo' | 'cover'>('logo')
const croppedLogoBlob = ref<Blob | null>(null)
const croppedCoverBlob = ref<Blob | null>(null)
const logoPreview = ref('')
const coverPreview = ref('')
const logoFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)

const openLogoPicker = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { toastStore.add('File harus gambar'); return }
  if (file.size > 10*1024*1024) { toastStore.add('Maks 10MB'); return }
  if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)
  cropperSrc.value = URL.createObjectURL(file)
  cropperType.value = 'logo'
  cropperOpen.value = true
  input.value = ''
}
const openCoverPicker = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { toastStore.add('File harus gambar'); return }
  if (file.size > 10*1024*1024) { toastStore.add('Maks 10MB'); return }
  if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)
  cropperSrc.value = URL.createObjectURL(file)
  cropperType.value = 'cover'
  cropperOpen.value = true
  input.value = ''
}
const onCropped = (payload: { blob: Blob; url: string; file: File }) => {
  if (cropperType.value === 'logo') {
    croppedLogoBlob.value = payload.blob
    logoFile.value = payload.file
    if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
    logoPreview.value = payload.url
  } else {
    croppedCoverBlob.value = payload.blob
    coverFile.value = payload.file
    if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
    coverPreview.value = payload.url
  }
  if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value = '' }
  cropperOpen.value = false
}
const onCropCancel = () => {
  if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value = '' }
  cropperOpen.value = false
}

interface DayHours { open: string; close: string; closed?: boolean }
const openingHours = ref<Record<string, DayHours>>({
  monday: { open: '08:00', close: '22:00' },
  tuesday: { open: '08:00', close: '22:00' },
  wednesday: { open: '08:00', close: '22:00' },
  thursday: { open: '08:00', close: '22:00' },
  friday: { open: '08:00', close: '22:00' },
  saturday: { open: '08:00', close: '22:00' },
  sunday: { open: '08:00', close: '22:00' },
})

const dayLabels: Record<string,string> = { 
  monday: 'Senin', 
  tuesday: 'Selasa', 
  wednesday: 'Rabu', 
  thursday: 'Kamis', 
  friday: 'Jumat', 
  saturday: 'Sabtu', 
  sunday: 'Minggu' 
}

const categories = [
  { value: 'food', label: 'Makanan & Minuman' },
  { value: 'mart', label: 'Minimarket / Toko' },
  { value: 'laundry', label: 'Laundry' },
]

onMounted(async () => {
  try {
    const m = await merchantsStore.fetchMerchantProfile()
    if (m) {
      name.value = m.name
      description.value = m.description || ''
      address.value = m.address || ''
      latitude.value = m.latitude
      longitude.value = m.longitude
      category.value = m.category
      imageUrl.value = (m as { image_url?: string }).image_url || ''
      coverUrl.value = (m as { cover_url?: string; coverUrl?: string }).cover_url || (m as { coverUrl?: string }).coverUrl || ''
      const oh = (m as { opening_hours?: Record<string, unknown> }).opening_hours
      if (oh && typeof oh === 'object' && Object.keys(oh).length > 0) {
        for (const k of Object.keys(oh)) {
          if (dayLabels[k]) (openingHours.value as Record<string, DayHours>)[k] = { open: (oh[k] as DayHours).open, close: (oh[k] as DayHours).close, closed: (oh[k] as DayHours).closed }
        }
      }
    } else {
      await navigateTo('/merchant/menu')
      return
    }
  } catch (e) {
    console.error('Failed to fetch merchant profile:', e)
  } finally {
    loading.value = false
  }
})

function onLocationSelected(payload: { lat: number; lng: number; address: string }) {
  latitude.value = payload.lat
  longitude.value = payload.lng
  address.value = payload.address
  showLocationPicker.value = false
}

async function handleSave() {
  if (!name.value.trim() || name.value.trim().length < 2) {
    toastStore.add('Nama toko minimal 2 karakter')
    return
  }
  if (!address.value.trim()) {
    toastStore.add('Alamat toko wajib diisi')
    return
  }
  if (!latitude.value || !longitude.value) {
    toastStore.add('Lokasi toko belum dipilih')
    return
  }

  saving.value = true
  try {
    // Jika ada file logo/cover yang sudah di-crop wajib, upload dulu baru dapat URL
    let finalImageUrl = imageUrl.value.trim()
    let finalCoverUrl = coverUrl.value.trim()
    
    if (logoFile.value) {
      try {
        finalImageUrl = await merchantsStore.uploadMenuImage(logoFile.value)
      } catch {
        toastStore.add('Gagal upload logo')
        saving.value = false
        return
      }
    }
    if (coverFile.value) {
      try {
        finalCoverUrl = await merchantsStore.uploadMenuImage(coverFile.value)
      } catch {
        toastStore.add('Gagal upload sampul')
        saving.value = false
        return
      }
    }

    await merchantsStore.updateMerchantProfile({
      name: name.value.trim(),
      description: description.value.trim(),
      address: address.value.trim(),
      latitude: latitude.value,
      longitude: longitude.value,
      category: category.value,
      image_url: finalImageUrl || undefined,
      cover_url: finalCoverUrl || undefined,
      opening_hours: openingHours.value,
    } as unknown as { name: string; description: string; address: string; latitude: number; longitude: number; category: string; image_url?: string; cover_url?: string; opening_hours: Record<string, unknown> })
    toastStore.add('Profil toko berhasil diperbarui!')
    router.push('/merchant/menu')
  } catch (error: unknown) {
    const msg = (error as { data?: { message?: string }, message?: string })?.data?.message || (error as { message?: string }).message || 'Gagal memperbarui profil toko'
    toastStore.add(msg)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50">
    <!-- Header banner background -->
    <div class="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-indigo-100/70 to-transparent pointer-events-none" />

    <div class="relative z-10 max-w-md mx-auto px-4 pt-4 pb-24 space-y-5">
      <!-- Back Navigation Header -->
      <div class="flex items-center gap-2">
        <button class="p-2.5 bg-white/80 hover:bg-white rounded-2xl border border-slate-100 text-slate-700 active:scale-95 transition-all shadow-sm" @click="router.push('/merchant/menu')">
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div>
          <h1 class="text-lg font-black text-slate-900 tracking-tight">Profil Toko</h1>
          <p class="text-[10px] text-slate-400 font-semibold">Kelola identitas toko mitra Anda</p>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="bg-white border border-slate-100 rounded-3xl p-6 animate-pulse space-y-4">
        <div class="h-4 bg-slate-100 rounded w-1/3" />
        <div class="h-10 bg-slate-100 rounded-xl" />
        <div class="h-10 bg-slate-100 rounded-xl" />
      </div>

      <template v-else>
        <!-- Store Shop Cover/Sampul Wajib 16:9 -->
        <div class="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-soft">
          <div class="relative h-36 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
            <img v-if="coverPreview" :src="coverPreview" class="absolute inset-0 w-full h-full object-cover" >
            <img v-else-if="coverUrl" :src="coverUrl" class="absolute inset-0 w-full h-full object-cover opacity-80" >
            <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-lg pointer-events-none" />
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div v-if="!coverPreview && !coverUrl" class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Store class="w-6 h-6" />
              </div>
            </div>
            <div class="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/40 text-white text-[9px] font-bold backdrop-blur-md">16:9 • 1200×675</div>
            <div class="absolute top-2 right-2 px-2 py-1 rounded-full bg-amber-500 text-white text-[9px] font-black">Wajib Crop Sampul</div>
          </div>
          <div class="p-3 flex items-center justify-between">
            <div>
              <p class="text-[10px] font-black text-slate-800">Sampul Toko</p>
              <p class="text-[9px] text-slate-500">Rasio tetap 16:9 agar tidak gepeng di detail merchant</p>
              <p v-if="croppedCoverBlob" class="text-[9px] text-emerald-600 font-bold mt-1">✓ Sudah crop 1200×675</p>
            </div>
            <label class="h-9 px-3 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1.5 cursor-pointer active:scale-95">
              <Camera class="w-3.5 h-3.5" /> {{ coverPreview ? 'Ganti & Crop 16:9' : 'Upload & Crop 16:9' }}
              <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="openCoverPicker" >
            </label>
          </div>
        </div>

        <!-- Logo Merchant Wajib 1:1 Circular -->
        <div class="bg-white border border-slate-100 rounded-3xl p-4 shadow-soft flex items-center gap-4">
          <div class="w-20 h-20 rounded-full border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0">
            <img v-if="logoPreview" :src="logoPreview" class="w-full h-full object-cover" >
            <img v-else-if="imageUrl" :src="imageUrl" class="w-full h-full object-cover opacity-80" >
            <Store v-else class="w-7 h-7 text-amber-400" />
          </div>
          <div class="flex-1 min-w-0 space-y-1">
            <p class="text-[10px] font-black text-slate-800 flex items-center gap-2">Logo Toko <span class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px]">Wajib 1:1 Circular • 400×400</span></p>
            <p class="text-[9px] text-slate-500">Rasio tetap bulat, dipakai 84×84 di hero food/[id]</p>
            <label class="inline-flex h-8 px-3 rounded-xl bg-slate-900 text-white text-[10px] font-bold items-center gap-1 cursor-pointer active:scale-95 mt-1">
              <Camera class="w-3 h-3" /> {{ logoPreview ? 'Ganti & Crop 1:1' : 'Upload & Crop 1:1' }}
              <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="openLogoPicker" >
            </label>
            <p v-if="croppedLogoBlob" class="text-[9px] text-emerald-600 font-bold">✓ Sudah crop circular siap</p>
          </div>
        </div>

        <!-- Store Main Details Card -->
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-soft space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Store class="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">Informasi Utama</h3>
              <p class="text-[9px] text-slate-400 font-semibold leading-none">Identitas yang tampil pada aplikasi pelanggan</p>
            </div>
          </div>

          <hr class="border-slate-50">

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Toko/Merchant</label>
            <input 
              v-model="name" 
              type="text" 
              class="w-full h-11 rounded-2xl border border-slate-200 px-4 text-xs font-semibold focus:outline-none focus:border-primary bg-slate-50/50 focus:bg-white transition-all" 
              placeholder="Warung Budi"
            >
          </div>

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deskripsi Toko</label>
            <textarea 
              v-model="description" 
              rows="3" 
              class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-semibold focus:outline-none focus:border-primary bg-slate-50/50 focus:bg-white transition-all resize-none min-h-[70px]" 
              placeholder="Makanan enak, laundry express, harga terjangkau..."
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategori Layanan</label>
            <select 
              v-model="category" 
              class="w-full h-11 rounded-2xl border border-slate-200 px-4 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:border-primary transition-all"
            >
              <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>

          <div v-if="imageUrl && !logoPreview" class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL Logo Lama (fallback)</label>
            <input v-model="imageUrl" type="url" class="w-full h-11 rounded-2xl border border-slate-200 px-4 text-xs font-semibold bg-slate-50/50" >
          </div>
          <div v-if="coverUrl && !coverPreview" class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL Sampul Lama (fallback)</label>
            <input v-model="coverUrl" type="url" class="w-full h-11 rounded-2xl border border-slate-200 px-4 text-xs font-semibold bg-slate-50/50" >
          </div>
        </div>

        <!-- Store Location Card -->
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-soft space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <MapPin class="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">Lokasi Fisik</h3>
              <p class="text-[9px] text-slate-400 font-semibold leading-none">Koordinat akurat untuk penjemputan pesanan</p>
            </div>
          </div>

          <hr class="border-slate-50">

          <div class="space-y-3">
            <button 
              type="button" 
              class="w-full p-4 border border-slate-200 rounded-2xl flex items-center gap-3 hover:bg-slate-50/50 active:scale-[0.98] transition-all text-left shadow-sm bg-slate-50/20" 
              @click="showLocationPicker = true"
            >
              <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
                <MapPin class="w-5 h-5 fill-current" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[8px] font-black text-rose-500 uppercase tracking-wider leading-none">Lokasi Toko</p>
                <p :class="['text-xs mt-1 font-extrabold truncate', address ? 'text-slate-800' : 'text-slate-400']">
                  {{ address || 'Pilih lokasi di peta...' }}
                </p>
                <p v-if="latitude && longitude" class="text-[9px] text-slate-400 mt-0.5 font-semibold">
                  {{ latitude.toFixed(6) }}, {{ longitude.toFixed(6) }}
                </p>
              </div>
            </button>
          </div>
        </div>

        <!-- Opening Hours Card -->
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-soft space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Clock class="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">Jam Operasional</h3>
              <p class="text-[9px] text-slate-400 font-semibold leading-none">Atur jam buka dan tutup mingguan toko Anda</p>
            </div>
          </div>

          <hr class="border-slate-50">

          <div class="space-y-2.5">
            <div 
              v-for="(label, k) in dayLabels" 
              :key="k" 
              class="flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-2xl px-3.5 py-3 transition-colors hover:bg-slate-50"
            >
              <span class="text-[11px] font-black text-slate-800 w-12">{{ label }}</span>
              
              <!-- Checkbox status closed -->
              <label class="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  class="w-4.5 h-4.5 rounded text-primary focus:ring-primary border-slate-300"
                  :checked="!!openingHours[k]?.closed" 
                  @change="(e: Event)=>{ const _el = e.target as HTMLInputElement; openingHours[k] = openingHours[k] || {open:'08:00', close:'22:00'}; openingHours[k]!.closed = _el.checked }"
                >
                <span class="text-[10px] font-extrabold text-slate-500">Tutup</span>
              </label>

              <!-- Inputs for time range if open -->
              <div v-if="!openingHours[k]?.closed" class="flex items-center gap-1.5">
                <input 
                  v-model="openingHours[k]!.open" 
                  type="time" 
                  class="w-20 h-7 text-[10px] font-black rounded-lg border border-slate-200 px-1 text-center bg-white focus:outline-none focus:border-primary"
                >
                <span class="text-[10px] text-slate-400 font-bold">-</span>
                <input 
                  v-model="openingHours[k]!.close" 
                  type="time" 
                  class="w-20 h-7 text-[10px] font-black rounded-lg border border-slate-200 px-1 text-center bg-white focus:outline-none focus:border-primary"
                >
              </div>
              <span v-else class="text-[10px] font-black text-rose-500 uppercase tracking-wider">Hari Libur</span>
            </div>
          </div>
        </div>

        <!-- Rating & Wallet Status Card -->
        <div v-if="merchantsStore.currentMerchant" class="bg-white border border-slate-100 rounded-3xl p-5 shadow-soft flex items-center justify-between">
          <div class="space-y-0.5">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Rating Saat Ini</p>
            <p class="text-sm font-black text-slate-900 mt-1 flex items-center gap-0.5 leading-none">
              <Star class="w-4 h-4 fill-amber-400 stroke-amber-400" />
              {{ merchantsStore.currentMerchant.rating?.toFixed(1) || '5.0' }}
            </p>
          </div>
          <NuxtLink to="/wallet" class="h-9 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm">
            <Wallet class="w-3.5 h-3.5" />
            Dompet Toko
          </NuxtLink>
        </div>

        <!-- Save button -->
        <button 
          :disabled="saving" 
          class="w-full h-12 bg-primary text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all shadow-md shadow-primary/20 hover:bg-primary/95" 
          @click="handleSave"
        >
          <span v-if="saving" class="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <Save v-else class="w-4.5 h-4.5" />
          {{ saving ? 'Menyimpan Profil...' : 'Simpan Profil Toko' }}
        </button>
      </template>
    </div>

    <!-- Location Picker Modal -->
    <CommonLocationPickerModal 
      v-if="showLocationPicker" 
      title="Pilih Lokasi" 
      :initial-lat="latitude ?? -6.2088" 
      :initial-lng="longitude ?? 106.8456" 
      @close="showLocationPicker = false" 
      @select="onLocationSelected" 
    />

    <!-- Crop Modals Wajib -->
    <CommonImageCropper v-if="cropperOpen" :src="cropperSrc" :type="cropperType" @cropped="onCropped" @cancel="onCropCancel" />
  </div>
</template>
