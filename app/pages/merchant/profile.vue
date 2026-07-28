<script setup lang="ts">
import { useMerchantsStore } from '~/stores/merchants'
import { useToastStore } from '~/stores/toast'
import { Store, MapPin, Save, ArrowLeft, Clock } from '@lucide/vue'

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

const dayLabels: Record<string,string> = { monday:'Senin', tuesday:'Selasa', wednesday:'Rabu', thursday:'Kamis', friday:'Jumat', saturday:'Sabtu', sunday:'Minggu' }

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
        // merge
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
    <div class="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

    <div class="relative z-10 max-w-md mx-auto px-5 pt-5 pb-24 space-y-6">
      <div class="flex items-center gap-2">
        <button class="p-2 -ml-2 text-muted-foreground hover:text-foreground" @click="router.push('/merchant/menu')">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-lg font-black text-slate-900 tracking-tight">Profil Toko</h1>
          <p class="text-[11px] text-slate-500">Kelola identitas toko mitra Anda</p>
        </div>
      </div>

      <div v-if="loading" class="bg-white border border-slate-100 rounded-3xl p-6 animate-pulse space-y-4">
        <div class="h-4 bg-slate-100 rounded w-1/3" />
        <div class="h-10 bg-slate-100 rounded-xl" />
        <div class="h-10 bg-slate-100 rounded-xl" />
      </div>

      <template v-else>
        <div class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Informasi Toko</h3>
              <p class="text-[11px] text-slate-500">Data ini tampil di halaman pelanggan</p>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-600">Nama Toko</label>
            <input v-model="name" type="text" class="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs font-semibold focus:outline-none focus:border-primary/50 bg-slate-50/50 focus:bg-white transition-all" placeholder="Warung Budi">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-600">Deskripsi (Opsional)</label>
            <textarea v-model="description" rows="3" class="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-medium focus:outline-none focus:border-primary/50 bg-slate-50/50 focus:bg-white transition-all resize-none" placeholder="Makanan enak, harga terjangkau..."/>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-600">Kategori</label>
            <select v-model="category" class="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:outline-none focus:border-primary/50 transition-all">
              <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-600">Alamat Toko</label>
            <button type="button" class="w-full p-4 border border-slate-200 rounded-xl flex items-center gap-3 hover:bg-slate-50 transition-all text-left" @click="showLocationPicker = true">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin class="w-5 h-5 text-primary" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-bold text-muted-foreground uppercase">Lokasi Toko</p>
                <p :class="['text-xs mt-0.5 truncate', address ? 'font-semibold text-foreground' : 'text-muted-foreground']">{{ address || 'Pilih lokasi toko...' }}</p>
                <p v-if="latitude && longitude" class="text-[10px] text-slate-400 mt-0.5">{{ latitude.toFixed(6) }}, {{ longitude.toFixed(6) }}</p>
              </div>
            </button>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-600">URL Gambar Toko (Opsional)</label>
            <input v-model="imageUrl" type="url" class="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs font-medium focus:outline-none focus:border-primary/50 bg-slate-50/50 focus:bg-white transition-all" placeholder="https://.../toko.jpg">
          </div>
        </div>

        <!-- Opening Hours -->
        <div class="bg-white border border-border/30 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center">
              <Clock class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Jam Buka Toko</h3>
              <p class="text-[11px] text-slate-500">Atur jam operasional per hari</p>
            </div>
          </div>
          <div class="space-y-2">
            <div v-for="(label, k) in dayLabels" :key="k" class="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
              <span class="text-[11px] font-bold text-slate-700 w-[52px]">{{ label }}</span>
              <label class="flex items-center gap-1 text-[10px]">
                <input type="checkbox" :checked="!!openingHours[k]?.closed" @change="(e: Event)=>{ const _el = e.target as HTMLInputElement; openingHours[k] = openingHours[k] || {open:'08:00', close:'22:00'}; openingHours[k]!.closed = _el.checked }">
                <span>Tutup</span>
              </label>
              <template v-if="!openingHours[k]?.closed">
                <input v-model="openingHours[k]!.open" type="time" class="ml-auto w-[76px] h-7 text-[11px] rounded-lg border border-slate-200 px-1">
                <span class="text-[10px] text-slate-400">-</span>
                <input v-model="openingHours[k]!.close" type="time" class="w-[76px] h-7 text-[11px] rounded-lg border border-slate-200 px-1">
              </template>
              <span v-else class="ml-auto text-[10px] text-slate-400">Libur</span>
            </div>
          </div>
        </div>

        <button :disabled="saving" class="w-full h-12 bg-primary text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all shadow-md shadow-primary/20" @click="handleSave">
          <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <Save v-else class="w-4 h-4" />
          {{ saving ? 'Menyimpan...' : 'Simpan Profil Toko' }}
        </button>

        <div v-if="merchantsStore.currentMerchant" class="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold text-slate-600">Rating Toko</p>
            <p class="text-sm font-black text-slate-900 mt-0.5">⭐ {{ merchantsStore.currentMerchant.rating?.toFixed(1) || '5.0' }}</p>
          </div>
          <NuxtLink to="/wallet" class="text-[11px] font-bold text-primary hover:underline">Lihat Dompet →</NuxtLink>
        </div>
      </template>
    </div>

    <!-- Location Picker Modal -->
    <CommonLocationPickerModal v-if="showLocationPicker" title="Pilih Lokasi" :initial-lat="latitude ?? -6.2088" :initial-lng="longitude ?? 106.8456" @close="showLocationPicker = false" @select="onLocationSelected" />
  </div>
</template>
