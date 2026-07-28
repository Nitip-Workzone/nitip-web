<script setup lang="ts">
import { Store, RefreshCw, Utensils, MapPin, ShoppingBag } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'

definePageMeta({
  layout: 'user',
  ssr: false,
})

const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const hasMerchant = ref(false)
const checkLoading = ref(true)
const actionLoading = ref(false)

const registrationForm = ref({
  name: '',
  description: '',
  address: '',
  latitude: -6.2088,
  longitude: 106.8456,
  category: 'food',
})

const showMapPicker = ref(false)

const onLocationSelected = (payload: { lat: number; lng: number; address: string }) => {
  registrationForm.value.latitude = payload.lat
  registrationForm.value.longitude = payload.lng
  registrationForm.value.address = payload.address
  showMapPicker.value = false
}

const fetchProfile = async () => {
  try {
    const profile = await merchantsStore.fetchMerchantProfile()
    if (profile) {
      hasMerchant.value = true
      try {
        await merchantsStore.fetchMerchantMenu()
      } catch (e) {
        // Menu fetch jangan bikin 500 halaman, cukup warning
        console.warn('[MerchantMenu] fetchMerchantMenu failed (non-fatal):', e)
      }
    } else {
      hasMerchant.value = false
    }
  } catch (e) {
    console.warn('[MerchantMenu] fetchMerchantProfile failed — show registration form instead of 500:', e)
    hasMerchant.value = false
  } finally {
    checkLoading.value = false
  }
}

const handleRegisterProfile = async () => {
  if (!registrationForm.value.name.trim()) {
    error('Nama merchant wajib diisi.')
    return
  }
  if (!registrationForm.value.address.trim()) {
    error('Alamat lengkap merchant wajib diisi.')
    return
  }

  actionLoading.value = true
  try {
    await merchantsStore.createMerchantProfile({
      name: registrationForm.value.name.trim(),
      description: registrationForm.value.description.trim(),
      address: registrationForm.value.address.trim(),
      latitude: Number(registrationForm.value.latitude),
      longitude: Number(registrationForm.value.longitude),
      category: registrationForm.value.category,
    })
    success('Profil merchant berhasil dilengkapi!')
    await fetchProfile()
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal melengkapi profil merchant.'
    error(errMsg)
  } finally {
    actionLoading.value = false
  }
}



const isWebView = ref(false)

onMounted(() => {
  if (import.meta.client && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || ''
    // Support: old wv detection + NitipMerchant/NitipApp custom UA from Flutter prod (2026-07-28 fix)
    isWebView.value = /wv|NitipMerchant|NitipApp|WebView/i.test(ua) || (ua.includes('Android') && ua.includes('Version/'))
  }
  fetchProfile()
})
</script>

<template>
  <div class="px-4 pb-24">
    <!-- Loading State -->
    <div v-if="checkLoading" class="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
      <RefreshCw class="w-8 h-8 animate-spin text-primary mb-3" />
      <p class="text-sm">Memeriksa akun merchant Anda...</p>
    </div>

    <!-- Registration State: Profile not found -->
    <div v-else-if="!hasMerchant" class="max-w-xl mx-auto py-8">
      <div class="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
        <div class="text-center space-y-2">
          <div class="inline-flex p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <Store class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">Lengkapi Profil Merchant</h2>
          <p class="text-xs text-muted-foreground max-w-sm mx-auto">
            Lengkapi data restoran, laundry, atau toko Anda untuk mulai mengelola katalog menu dan pesanan.
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="handleRegisterProfile">
          <!-- Store Name -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nama Merchant/Toko</label>
            <input
              v-model="registrationForm.name"
              type="text"
              placeholder="Contoh: Nasi Goreng Berkah, Laundry Express..."
              class="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all"
              required
            >
          </div>

          <!-- Category -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Kategori Layanan</label>
            <select
              v-model="registrationForm.category"
              class="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all"
            >
              <option value="food">Makanan / Food</option>
              <option value="laundry">Laundry</option>
              <option value="mart">Belanja / Mart</option>
            </select>
          </div>

          <!-- Description -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deskripsi singkat</label>
            <textarea
              v-model="registrationForm.description"
              placeholder="Ceritakan singkat tentang spesialisasi menu atau layanan toko Anda..."
              class="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all min-h-[80px]"
            />
          </div>

          <!-- Address -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center">
              <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alamat Lengkap Toko</label>
              <button
                type="button"
                class="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline focus:outline-none"
                @click="showMapPicker = true"
              >
                <MapPin class="w-3.5 h-3.5" />
                Pilih dari Peta
              </button>
            </div>
            <textarea
              v-model="registrationForm.address"
              placeholder="Nama jalan, nomor, blok, atau patokan lokasi..."
              class="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all min-h-[80px]"
              required
            />
          </div>

          <!-- Coordinates -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latitude</label>
              <input
                v-model="registrationForm.latitude"
                type="number"
                step="any"
                placeholder="-6.2088"
                class="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all"
                required
              >
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Longitude</label>
              <input
                v-model="registrationForm.longitude"
                type="number"
                step="any"
                placeholder="106.8456"
                class="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all"
                required
              >
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3 pt-4">
            <NuxtLink to="/dashboard" class="flex-1">
              <UiButton variant="secondary" type="button" class="w-full h-10 rounded-xl">
                Batal
              </UiButton>
            </NuxtLink>
            <UiButton
              class="flex-1 h-10 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all bg-primary text-primary-foreground font-semibold"
              type="submit"
              :disabled="actionLoading"
            >
              <RefreshCw v-if="actionLoading" class="w-4 h-4 animate-spin mr-2" />
              Simpan & Buka Toko
            </UiButton>
          </div>
        </form>
      </div>
    </div>

    <!-- Merchant Dashboard View -->
    <div v-else class="space-y-6 pt-3">
      <!-- Browser Notification Warning -->
      <div v-if="!isWebView" class="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-3.5 text-xs text-amber-800 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="space-y-1">
          <p class="font-extrabold text-amber-900">Notifikasi Pesanan Dinonaktifkan di Browser</p>
          <p class="leading-relaxed opacity-90">Sesi web aktif ini telah menghapus token Firebase perangkat mobile Anda. Anda tidak akan menerima notifikasi pesanan masuk pada HP Anda sampai masuk kembali di aplikasi mobile.</p>
        </div>
      </div>

      <!-- Store Header Title -->
      <div class="px-1 flex justify-between items-center">
        <div class="space-y-0.5">
          <p class="text-[10px] font-extrabold text-primary uppercase tracking-widest">Dashboard Mitra</p>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">{{ merchantsStore.currentMerchant?.name }}</h2>
          <NuxtLink to="/merchant/profile" class="text-[11px] font-bold text-primary hover:underline">Edit Profil Toko →</NuxtLink>
        </div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-bold">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {{ merchantsStore.currentMerchant?.is_open ? 'Buka' : 'Tutup' }}
        </span>
      </div>

      <!-- Quick Statistics Grid -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Metric 1: Total Menu -->
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between h-28">
          <div class="flex justify-between items-center text-slate-400">
            <span class="text-[10px] font-extrabold uppercase tracking-wider">Total Menu</span>
            <Utensils class="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 class="text-2xl font-black text-slate-800">{{ merchantsStore.merchantMenus.length }}</h4>
            <p class="text-[9px] font-medium text-slate-400 mt-1">Item aktif terdaftar</p>
          </div>
        </div>

        <!-- Metric 2: Active Orders -->
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col justify-between h-28">
          <div class="flex justify-between items-center text-slate-400">
            <span class="text-[10px] font-extrabold uppercase tracking-wider">Order Aktif</span>
            <ShoppingBag class="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h4 class="text-2xl font-black text-slate-800">
              {{ merchantsStore.merchantOrders.filter(o => o.status === 'pending' || o.status === 'cooking').length }}
            </h4>
            <p class="text-[9px] font-medium text-slate-400 mt-1">Pesanan sedang diproses</p>
          </div>
        </div>
      </div>

      <!-- Quick Catalog Shortcut Info -->
      <div class="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-4">
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Katalog Cepat</span>
          <span class="text-[10px] font-bold text-primary">{{ merchantsStore.merchantMenus.length }} menu aktif</span>
        </div>
        <div class="space-y-2.5">
          <div 
            v-for="menu in merchantsStore.merchantMenus.slice(0, 3)" 
            :key="menu.id" 
            class="flex items-center justify-between p-2.5 bg-white border border-slate-50 rounded-2xl text-xs"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-slate-50 overflow-hidden border border-slate-100 shrink-0 flex items-center justify-center">
                <img v-if="menu.image_url" :src="menu.image_url" class="w-full h-full object-cover">
                <Utensils v-else class="w-4 h-4 text-slate-300" />
              </div>
              <span class="font-bold text-slate-700 truncate max-w-[150px]">{{ menu.name }}</span>
            </div>
            <span class="font-extrabold text-slate-800 flex-shrink-0">Rp {{ menu.price.toLocaleString('id-ID') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Location Picker Modal for Merchant Onboarding -->
    <CommonLocationPickerModal
      v-if="showMapPicker"
      title="Pilih Lokasi Merchant"
      :initial-lat="registrationForm.latitude ?? -6.2088"
      :initial-lng="registrationForm.longitude ?? 106.8456"
      @close="showMapPicker = false"
      @select="onLocationSelected"
    />
  </div>
</template>
