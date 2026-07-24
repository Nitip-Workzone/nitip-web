<script setup lang="ts">
import { Store, Plus, Edit, Trash2, Camera, RefreshCw, ToggleLeft, ToggleRight, Utensils, ArrowLeft } from '@lucide/vue'
import { useMerchantsStore, type Menu } from '~/stores/merchants'

definePageMeta({
  layout: 'user',
})

const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const checkLoading = ref(true)
const actionLoading = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)

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

const fetchProfile = async () => {
  try {
    const profile = await merchantsStore.fetchMerchantProfile()
    if (profile) {
      await merchantsStore.fetchMerchantMenu()
    }
  } catch {
    error('Gagal mengambil data toko.')
  } finally {
    checkLoading.value = false
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
      <p class="text-sm">Memuat katalog menu...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Back Header -->
      <div class="flex items-center gap-3 pt-3">
        <NuxtLink to="/merchant/menu" class="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-slate-700 active:scale-95 transition-all">
          <ArrowLeft class="w-4 h-4" />
        </NuxtLink>
        <div>
          <h2 class="text-base font-extrabold text-slate-900 tracking-tight">Katalog Menu Toko</h2>
          <p class="text-[10px] text-slate-400 font-semibold">Kelola daftar makanan, minuman, dan jasa</p>
        </div>
      </div>

      <!-- Add Menu Card Shortcut -->
      <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex justify-between items-center">
        <div class="space-y-1">
          <p class="text-xs font-black text-slate-800">Punya produk baru?</p>
          <p class="text-[10px] text-slate-400 font-medium">Tambahkan item baru langsung ke menu Anda.</p>
        </div>
        <button 
          @click="openAddModal"
          class="flex items-center gap-1 h-9 px-4 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/10"
        >
          <Plus class="w-4 h-4" />
          Tambah Item
        </button>
      </div>

      <!-- Menus Grid / List -->
      <div v-if="merchantsStore.merchantMenus.length === 0" class="p-12 text-center bg-white border border-slate-100 rounded-3xl text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <div class="inline-flex p-4 bg-slate-50 text-slate-300 rounded-full mb-3 border border-slate-100">
          <Utensils class="w-8 h-8" />
        </div>
        <p class="text-sm font-semibold text-slate-800 mb-1">Belum Ada Menu Terdaftar</p>
        <p class="text-xs text-slate-400 max-w-xs mx-auto">Klik tombol "Tambah Item" untuk memasukkan produk pertamamu.</p>
      </div>
      <div v-else class="space-y-3.5">
        <!-- Menu Card -->
        <div
          v-for="menu in merchantsStore.merchantMenus"
          :key="menu.id"
          class="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 items-center justify-between shadow-[0_4px_20px_rgb(0,0,0,0.015)] hover:shadow-md hover:border-slate-200/60 transition-all duration-300"
          :class="{ 'opacity-60 bg-slate-50/50': !menu.is_available }"
        >
          <div class="flex items-center gap-4 min-w-0 flex-1">
            <!-- Menu Image -->
            <div class="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 flex-shrink-0 flex items-center justify-center">
              <img
                v-if="menu.image_url"
                :src="menu.image_url"
                alt="Menu"
                class="w-full h-full object-cover"
              >
              <Utensils v-else class="w-6 h-6 text-slate-300" />
            </div>

            <!-- Menu Info -->
            <div class="min-w-0 space-y-1">
              <h4 class="text-sm font-extrabold text-slate-800 truncate">{{ menu.name }}</h4>
              <p v-if="menu.description" class="text-[10px] text-slate-400 font-medium truncate leading-relaxed max-w-[220px]">
                {{ menu.description }}
              </p>
              <p class="text-sm font-black text-primary mt-1">Rp {{ menu.price.toLocaleString('id-ID') }}</p>
            </div>
          </div>

          <!-- Availability & Actions -->
          <div class="flex flex-col items-end gap-3 flex-shrink-0 pl-2 border-l border-slate-100">
            <button
              class="px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition-all"
              :class="menu.is_available ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'"
              @click="toggleMenuAvailable(menu)"
            >
              {{ menu.is_available ? 'Tersedia' : 'Habis' }}
            </button>
            <div class="flex gap-1.5">
              <button
                class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 active:scale-95 transition-all"
                @click="openEditModal(menu)"
              >
                <Edit class="w-4 h-4" />
              </button>
              <button
                class="w-8 h-8 rounded-lg border border-rose-100 flex items-center justify-center hover:bg-rose-50 text-rose-500 active:scale-95 transition-all"
                @click="handleDeleteMenu(menu.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
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
            class="h-10 w-full rounded-xl border border-slate-200 bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
          <textarea
            v-model="menuForm.description"
            placeholder="Bahan, pedas/tidak, kelengkapan item..."
            class="w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm focus-visible:outline-none min-h-[60px]"
          />
        </div>

        <!-- Price -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Harga (Rp)</label>
          <input
            v-model="menuForm.price"
            type="number"
            placeholder="15000"
            class="h-10 w-full rounded-xl border border-slate-200 bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Image Picker & Upload -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Gambar Produk</label>
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 rounded-xl border border-slate-200 bg-background overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                v-if="menuForm.image_url"
                :src="menuForm.image_url"
                alt="Upload Preview"
                class="w-full h-full object-cover"
              >
              <Camera v-else class="w-6 h-6 text-muted-foreground opacity-60" />
            </div>
            <label class="flex-1">
              <span class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-background px-4 text-xs font-bold cursor-pointer hover:bg-accent transition-all">
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
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
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
          <UiButton variant="secondary" class="flex-1 h-10 rounded-xl text-xs" @click="showAddModal = false">Batal</UiButton>
          <UiButton class="flex-1 h-10 rounded-xl text-xs" :disabled="actionLoading || uploadProgress" @click="handleAddMenu">
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
            class="h-10 w-full rounded-xl border border-slate-200 bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
          <textarea
            v-model="menuForm.description"
            placeholder="Bahan, pedas/tidak, kelengkapan item..."
            class="w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm focus-visible:outline-none min-h-[60px]"
          />
        </div>

        <!-- Price -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Harga (Rp)</label>
          <input
            v-model="menuForm.price"
            type="number"
            placeholder="15000"
            class="h-10 w-full rounded-xl border border-slate-200 bg-background px-3 text-sm focus-visible:outline-none"
          >
        </div>

        <!-- Image Picker & Upload -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Gambar Produk</label>
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 rounded-xl border border-slate-200 bg-background overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                v-if="menuForm.image_url"
                :src="menuForm.image_url"
                alt="Upload Preview"
                class="w-full h-full object-cover"
              >
              <Camera v-else class="w-6 h-6 text-muted-foreground opacity-60" />
            </div>
            <label class="flex-1">
              <span class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-background px-4 text-xs font-bold cursor-pointer hover:bg-accent transition-all">
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
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
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
          <UiButton variant="secondary" class="flex-1 h-10 rounded-xl text-xs" @click="showEditModal = false">Batal</UiButton>
          <UiButton class="flex-1 h-10 rounded-xl text-xs" :disabled="actionLoading || uploadProgress" @click="handleEditMenu">
            {{ actionLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
