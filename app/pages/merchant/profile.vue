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
const loading = ref(true)
const saving = ref(false)
const showLocationPicker = ref(false)

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
      const oh = (m as { opening_hours?: Record<string, unknown> }).opening_hours
      if (oh && typeof oh === 'object' && Object.keys(oh).length > 0) {
        for (const k of Object.keys(oh)) {
          if (dayLabels[k]) (openingHours.value as Record<string, DayHours>)[k] = { open: (oh[k] as DayHours).open, close: (oh[k] as DayHours).close, closed: (oh[k] as DayHours).closed }
        }
      }
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
    await merchantsStore.updateMerchantProfile({
      name: name.value.trim(),
      description: description.value.trim(),
      address: address.value.trim(),
      latitude: latitude.value,
      longitude: longitude.value,
      category: category.value,
      image_url: imageUrl.value.trim() || undefined,
      opening_hours: openingHours.value,
    } as unknown as { name: string; description: string; address: string; latitude: number; longitude: number; category: string; image_url?: string; opening_hours: Record<string, unknown> })
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
        <!-- Store Shop Cover Photo / Avatar Mockup -->
        <div class="relative h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-soft overflow-hidden">
          <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-lg" />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Store class="w-6 h-6" />
            </div>
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

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL Gambar Toko (Opsional)</label>
            <input 
              v-model="imageUrl" 
              type="url" 
              class="w-full h-11 rounded-2xl border border-slate-200 px-4 text-xs font-semibold focus:outline-none focus:border-primary bg-slate-50/50 focus:bg-white transition-all" 
              placeholder="https://.../toko.jpg"
            >
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
  </div>
</template>
