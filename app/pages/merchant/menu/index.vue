<script setup lang="ts">
import { Store, Plus, Edit, Trash2, Camera, RefreshCw, ToggleLeft, ToggleRight, Utensils, MapPin } from '@lucide/vue'
import { useMerchantsStore, type Menu } from '~/stores/merchants'

definePageMeta({
  layout: 'user',
})

const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const hasMerchant = ref(false)
const checkLoading = ref(true)
const actionLoading = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)

const storeForm = ref({
  is_open: true,
  auto_confirm: false,
  max_active_orders: 5,
})

const menuForm = ref({
  name: '',
  description: '',
  price: 0,
  image_url: '',
  is_available: true,
})

const editMenuId = ref('')
const selectedFile = ref<File | null>(null)
const uploadProgress = ref(false)

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
      storeForm.value.is_open = profile.is_open
      storeForm.value.auto_confirm = profile.auto_confirm
      storeForm.value.max_active_orders = profile.max_active_orders
      await merchantsStore.fetchMerchantMenu()
    } else {
      hasMerchant.value = false
    }
  } catch {
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

const toggleStoreOpen = async () => {
  try {
    await merchantsStore.updateMerchantStatus({
      is_open: storeForm.value.is_open,
      auto_confirm: storeForm.value.auto_confirm,
      max_active_orders: Number(storeForm.value.max_active_orders),
    })
    success(storeForm.value.is_open ? 'Toko sekarang BUKA.' : 'Toko sekarang TUTUP.')
  } catch {
    storeForm.value.is_open = !storeForm.value.is_open
    error('Gagal memperbarui status toko.')
  }
}

const toggleAutoConfirm = async () => {
  try {
    await merchantsStore.updateMerchantStatus({
      is_open: storeForm.value.is_open,
      auto_confirm: storeForm.value.auto_confirm,
      max_active_orders: Number(storeForm.value.max_active_orders),
    })
    success(storeForm.value.auto_confirm ? 'Auto Confirm diaktifkan.' : 'Auto Confirm dinonaktifkan.')
  } catch {
    storeForm.value.auto_confirm = !storeForm.value.auto_confirm
    error('Gagal memperbarui opsi Auto Confirm.')
  }
}

const updateQueueLimit = async () => {
  try {
    await merchantsStore.updateMerchantStatus({
      is_open: storeForm.value.is_open,
      auto_confirm: storeForm.value.auto_confirm,
      max_active_orders: Number(storeForm.value.max_active_orders),
    })
    success('Batas antrean maksimal berhasil diperbarui.')
  } catch {
    error('Gagal memperbarui batas antrean.')
  }
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (!file) return
    selectedFile.value = file
    uploadProgress.value = true
    try {
      const url = await merchantsStore.uploadMenuImage(file)
      menuForm.value.image_url = url
      success('Gambar menu berhasil diupload.')
    } catch {
      error('Gagal mengupload gambar menu.')
    } finally {
      uploadProgress.value = false
    }
  }
}

const openAddModal = () => {
  menuForm.value = {
    name: '',
    description: '',
    price: 0,
    image_url: '',
    is_available: true,
  }
  selectedFile.value = null
  showAddModal.value = true
}

const handleAddMenu = async () => {
  if (!menuForm.value.name) {
    error('Nama menu wajib diisi.')
    return
  }
  if (menuForm.value.price <= 0) {
    error('Harga menu harus lebih besar dari Rp 0.')
    return
  }

  actionLoading.value = true
  try {
    await merchantsStore.createMenuItem({
      name: menuForm.value.name,
      description: menuForm.value.description,
      price: Number(menuForm.value.price),
      image_url: menuForm.value.image_url,
      is_available: menuForm.value.is_available,
    })
    success('Menu baru berhasil ditambahkan.')
    showAddModal.value = false
  } catch {
    error('Gagal menambahkan menu.')
  } finally {
    actionLoading.value = false
  }
}

const openEditModal = (menu: Menu) => {
  editMenuId.value = menu.id
  menuForm.value = {
    name: menu.name,
    description: menu.description || '',
    price: menu.price,
    image_url: menu.image_url || '',
    is_available: menu.is_available,
  }
  selectedFile.value = null
  showEditModal.value = true
}

const handleEditMenu = async () => {
  if (!menuForm.value.name) {
    error('Nama menu wajib diisi.')
    return
  }
  if (menuForm.value.price <= 0) {
    error('Harga menu harus lebih besar dari Rp 0.')
    return
  }

  actionLoading.value = true
  try {
    await merchantsStore.updateMenuItem(editMenuId.value, {
      name: menuForm.value.name,
      description: menuForm.value.description,
      price: Number(menuForm.value.price),
      image_url: menuForm.value.image_url,
      is_available: menuForm.value.is_available,
    })
    success('Menu berhasil diperbarui.')
    showEditModal.value = false
  } catch {
    error('Gagal memperbarui menu.')
  } finally {
    actionLoading.value = false
  }
}

const handleDeleteMenu = async (id: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus menu ini?')) return

  try {
    await merchantsStore.deleteMenuItem(id)
    success('Menu berhasil dihapus.')
  } catch {
    error('Gagal menghapus menu.')
  }
}

const toggleMenuAvailable = async (menu: Menu) => {
  try {
    await merchantsStore.toggleMenuAvailability(menu.id, !menu.is_available)
    success(menu.is_available ? `Menu '${menu.name}' dinonaktifkan.` : `Menu '${menu.name}' diaktifkan.`)
  } catch {
    error('Gagal mengubah ketersediaan menu.')
  }
}

onMounted(() => {
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

        <form @submit.prevent="handleRegisterProfile" class="space-y-4">
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
                step="0.000000000000001"
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
                step="0.000000000000001"
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
      <!-- Store Header Card -->
      <div class="relative overflow-hidden bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-5">
        <!-- Top Gradient Decorator -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />
        
        <div class="flex justify-between items-start">
          <div class="space-y-1 max-w-[80%]">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-primary px-2.5 py-1 bg-primary/5 rounded-full border border-primary/10 uppercase tracking-widest">
              <span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              Mitra {{ merchantsStore.currentMerchant?.category }}
            </span>
            <h2 class="text-xl font-extrabold tracking-tight mt-2 text-slate-900 leading-tight">
              {{ merchantsStore.currentMerchant?.name }}
            </h2>
            <p class="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
              📍 {{ merchantsStore.currentMerchant?.address }}
            </p>
          </div>
          <div class="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 text-xs font-extrabold px-2.5 py-1.5 rounded-xl shadow-sm">
            ⭐ {{ merchantsStore.currentMerchant?.rating.toFixed(1) }}
          </div>
        </div>

        <hr class="border-slate-100">

        <!-- Quick Controls -->
        <div class="space-y-4">
          <!-- Toggle Open Status -->
          <div class="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl transition-all">
            <div class="flex items-center gap-3">
              <span class="relative flex h-3 w-3">
                <span v-if="storeForm.is_open" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3" :class="storeForm.is_open ? 'bg-emerald-500' : 'bg-rose-500'" />
              </span>
              <div class="space-y-0.5">
                <p class="text-xs font-bold text-slate-800">Status Operasional Toko</p>
                <p class="text-[10px] font-medium text-slate-400">
                  {{ storeForm.is_open ? 'Menerima orderan aktif' : 'Tutup / Libur sementara' }}
                </p>
              </div>
            </div>
            <button @click="storeForm.is_open = !storeForm.is_open; toggleStoreOpen()" class="focus:outline-none focus:scale-95 transition-transform">
              <ToggleRight v-if="storeForm.is_open" class="w-12 h-7 text-emerald-500" />
              <ToggleLeft v-else class="w-12 h-7 text-slate-300" />
            </button>
          </div>

          <!-- Toggle Auto Confirm -->
          <div class="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl transition-all">
            <div class="space-y-1 pr-4">
              <p class="text-xs font-bold text-slate-800">Konfirmasi Otomatis (Auto Confirm)</p>
              <p class="text-[10px] leading-normal text-slate-400 font-medium">Order langsung siap dimasak/diproses tanpa persetujuan manual.</p>
            </div>
            <button @click="storeForm.auto_confirm = !storeForm.auto_confirm; toggleAutoConfirm()" class="focus:outline-none focus:scale-95 transition-transform flex-shrink-0">
              <ToggleRight v-if="storeForm.auto_confirm" class="w-12 h-7 text-primary" />
              <ToggleLeft v-else class="w-12 h-7 text-slate-300" />
            </button>
          </div>

          <!-- Active Orders Queue Limit -->
          <div class="flex items-center justify-between gap-4 p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl transition-all">
            <div class="space-y-0.5">
              <p class="text-xs font-bold text-slate-800">Batas Antrean Maksimal</p>
              <p class="text-[10px] text-slate-400 font-medium">Maksimal pesanan aktif yang ditangani serentak.</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <input
                v-model="storeForm.max_active_orders"
                type="number"
                min="1"
                class="w-16 h-9 text-center text-sm font-extrabold border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                @change="updateQueueLimit"
              >
            </div>
          </div>
        </div>
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

      <!-- Action Navigation Cards -->
      <div class="space-y-3 pt-2">
        <NuxtLink 
          to="/merchant/orders" 
          class="flex items-center justify-between p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl shadow-[0_4px_20px_rgb(15,23,42,0.15)] hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShoppingBag class="w-5 h-5 text-white" />
            </div>
            <div class="space-y-0.5">
              <p class="text-xs font-black tracking-wide">Kelola Pesanan Masuk</p>
              <p class="text-[9px] text-slate-300 font-medium">Proses masakan & antrean order</p>
            </div>
          </div>
          <span class="inline-flex items-center justify-center px-2.5 py-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full" v-if="merchantsStore.merchantOrders.filter(o => o.status === 'pending').length > 0">
            {{ merchantsStore.merchantOrders.filter(o => o.status === 'pending').length }} Baru
          </span>
        </NuxtLink>

        <!-- Manage Catalog Trigger Card (Opens full modal or redirects) -->
        <button 
          @click="openAddModal"
          class="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl shadow-[0_4px_25px_rgb(0,0,0,0.015)] hover:border-slate-200 active:scale-[0.99] transition-all text-left"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center">
              <Plus class="w-5 h-5 text-primary" />
            </div>
            <div class="space-y-0.5">
              <p class="text-xs font-black text-slate-800 tracking-wide">Tambah Item Menu Baru</p>
              <p class="text-[9px] text-slate-400 font-medium">Tambah makanan, minuman & jasa laundry</p>
            </div>
          </div>
          <span class="text-primary font-bold text-xs pr-1">Tambah</span>
        </button>
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

    <!-- Add/Edit Menu Modal -->
    <UiModal v-model:open="showAddModal" title="Tambah Menu Baru">
      <div class="space-y-4 p-1">
        <!-- Name -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nama Makanan/Minuman</label>
          <input
            v-model="menuForm.name"
            type="text"
            placeholder="Nasi Goreng Spesial, Kopi Susu..."
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
          <textarea
            v-model="menuForm.description"
            placeholder="Bahan, pedas/tidak, kelengkapan item..."
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none min-h-[60px]"
          />
        </div>

        <!-- Price -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Harga (Rp)</label>
          <input
            v-model="menuForm.price"
            type="number"
            placeholder="15000"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Image Picker & Upload -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Gambar Produk</label>
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 rounded-xl border border-input bg-background overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                v-if="menuForm.image_url"
                :src="menuForm.image_url"
                alt="Upload Preview"
                class="w-full h-full object-cover"
              >
              <Camera v-else class="w-6 h-6 text-muted-foreground opacity-60" />
            </div>
            <label class="flex-1">
              <span class="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-xs font-bold cursor-pointer hover:bg-accent transition-all">
                {{ uploadProgress ? 'Mengunggah...' : 'Pilih Gambar Menu' }}
              </span>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="uploadProgress"
                @change="handleFileChange"
              >
            </label>
          </div>
        </div>

        <!-- Available status -->
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-700">Tersedia Langsung</p>
            <p class="text-[10px] text-muted-foreground">Aktifkan agar menu langsung dapat dibeli oleh pengguna.</p>
          </div>
          <input
            v-model="menuForm.is_available"
            type="checkbox"
            class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
          >
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-3">
          <UiButton variant="secondary" class="flex-1 h-9 rounded-lg text-xs" @click="showAddModal = false">Batal</UiButton>
          <UiButton class="flex-1 h-9 rounded-lg text-xs" :disabled="actionLoading || uploadProgress" @click="handleAddMenu">
            {{ actionLoading ? 'Menyimpan...' : 'Tambahkan' }}
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Edit Menu Modal -->
    <UiModal v-model:open="showEditModal" title="Edit Item Menu">
      <div class="space-y-4 p-1">
        <!-- Name -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nama Makanan/Minuman</label>
          <input
            v-model="menuForm.name"
            type="text"
            placeholder="Nasi Goreng Spesial, Kopi Susu..."
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
          <textarea
            v-model="menuForm.description"
            placeholder="Bahan, pedas/tidak, kelengkapan item..."
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none min-h-[60px]"
          />
        </div>

        <!-- Price -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Harga (Rp)</label>
          <input
            v-model="menuForm.price"
            type="number"
            placeholder="15000"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Image Picker & Upload -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Gambar Produk</label>
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 rounded-xl border border-input bg-background overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                v-if="menuForm.image_url"
                :src="menuForm.image_url"
                alt="Upload Preview"
                class="w-full h-full object-cover"
              >
              <Camera v-else class="w-6 h-6 text-muted-foreground opacity-60" />
            </div>
            <label class="flex-1">
              <span class="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-xs font-bold cursor-pointer hover:bg-accent transition-all">
                {{ uploadProgress ? 'Mengunggah...' : 'Ubah Gambar' }}
              </span>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="uploadProgress"
                @change="handleFileChange"
              >
            </label>
          </div>
        </div>

        <!-- Available status -->
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-700">Tersedia Langsung</p>
            <p class="text-[10px] text-muted-foreground">Aktifkan agar menu langsung dapat dibeli oleh pengguna.</p>
          </div>
          <input
            v-model="menuForm.is_available"
            type="checkbox"
            class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
          >
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-3">
          <UiButton variant="secondary" class="flex-1 h-9 rounded-lg text-xs" @click="showEditModal = false">Batal</UiButton>
          <UiButton class="flex-1 h-9 rounded-lg text-xs" :disabled="actionLoading || uploadProgress" @click="handleEditMenu">
            {{ actionLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </UiButton>
        </div>
      </div>
    </UiModal>

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
