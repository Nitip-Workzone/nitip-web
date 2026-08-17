<script setup lang="ts">
import { Plus, Edit, Trash2, RefreshCw, Utensils, ArrowLeft, Camera } from '@lucide/vue'
import { useMerchantsStore, type Menu } from '~/stores/merchants'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'user',
  ssr: false,
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
const previewUrl = ref('')
const uploadProgress = ref(false)
const togglingMenuId = ref('')

// Crop wajib state – product ratio 1:1 tetap
const cropperOpen = ref(false)
const cropperSrc = ref('')
const cropperPendingFile = ref<File | null>(null)
const croppedBlob = ref<Blob | null>(null)

const fetchProfile = async () => {
  try {
    const profile = await merchantsStore.fetchMerchantProfile()
    if (profile) {
      try {
        await merchantsStore.fetchMerchantMenu()
      } catch (e) {
        console.warn('[Catalog] fetchMerchantMenu failed non-fatal:', e)
      }
    } else {
      await navigateTo('/merchant/menu')
      return
    }
  } catch (e) {
    console.warn('[Catalog] fetchMerchantProfile failed:', e)
    error('Gagal memuat profil toko. Silakan muat ulang (refresh) halaman ini.')
  } finally {
    checkLoading.value = false
  }
}

// Shared file input refs agar bisa dipicu tanpa bergantung pada <label> di dalam UiModal
const addFileInputRef = ref<HTMLInputElement | null>(null)
const editFileInputRef = ref<HTMLInputElement | null>(null)

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error('File harus berupa gambar JPEG/PNG/WEBP')
    target.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error('Ukuran gambar maksimal 10MB')
    target.value = ''
    return
  }
  // Otomatis masuk crop setelah pilih - sesuai request
  cropperPendingFile.value = file
  if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)
  cropperSrc.value = URL.createObjectURL(file)
  // Delay sedikit agar modal UiModal tidak menutupi, lalu buka cropper full screen z-9999
  await nextTick()
  cropperOpen.value = true
  target.value = ''
}

const onCropped = (payload: { blob: Blob; url: string; file: File }) => {
  croppedBlob.value = payload.blob
  selectedFile.value = payload.file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = payload.url
  if (cropperSrc.value) {
    // jangan revoke cropperSrc yang sama dengan payload.url? payload.url dari blob baru, jadi aman revoke src lama
    URL.revokeObjectURL(cropperSrc.value)
    cropperSrc.value = ''
  }
  cropperOpen.value = false
  cropperPendingFile.value = null
}

const onCropCancel = () => {
  if (cropperSrc.value) {
    URL.revokeObjectURL(cropperSrc.value)
    cropperSrc.value = ''
  }
  cropperOpen.value = false
  cropperPendingFile.value = null
  // Tetap wajib crop, clear preview file jika cancel
  if (!previewUrl.value) {
    selectedFile.value = null
    croppedBlob.value = null
  }
}

const triggerAddFile = () => {
  addFileInputRef.value?.click()
}
const triggerEditFile = () => {
  editFileInputRef.value?.click()
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
  previewUrl.value = ''
  croppedBlob.value = null
  if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value='' }
  cropperOpen.value = false
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
  // Crop wajib jika ada file dipilih
  if (selectedFile.value && !croppedBlob.value) {
    error('Foto wajib di-crop dulu dengan rasio 1:1 agar konsisten.')
    if (cropperSrc.value) cropperOpen.value = true
    return
  }

  actionLoading.value = true
  
  let finalImageUrl = menuForm.value.image_url
  if (selectedFile.value) {
    uploadProgress.value = true
    try {
      finalImageUrl = await merchantsStore.uploadMenuImage(selectedFile.value)
    } catch {
      error('Gagal mengupload gambar menu.')
      actionLoading.value = false
      uploadProgress.value = false
      return
    } finally {
      uploadProgress.value = false
    }
  }

  try {
    await merchantsStore.createMenuItem({
      name: menuForm.value.name,
      description: menuForm.value.description,
      price: Number(menuForm.value.price),
      image_url: finalImageUrl,
      is_available: menuForm.value.is_available,
    })
    success('Menu baru berhasil ditambahkan.')
    showAddModal.value = false
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ''
    }
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
  previewUrl.value = ''
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
  if (selectedFile.value && !croppedBlob.value) {
    error('Foto wajib di-crop dulu dengan rasio 1:1 agar konsisten.')
    if (cropperSrc.value) cropperOpen.value = true
    return
  }

  actionLoading.value = true
  
  let finalImageUrl = menuForm.value.image_url
  if (selectedFile.value) {
    uploadProgress.value = true
    try {
      finalImageUrl = await merchantsStore.uploadMenuImage(selectedFile.value)
    } catch {
      error('Gagal mengupload gambar menu.')
      actionLoading.value = false
      uploadProgress.value = false
      return
    } finally {
      uploadProgress.value = false
    }
  }

  try {
    await merchantsStore.updateMenuItem(editMenuId.value, {
      name: menuForm.value.name,
      description: menuForm.value.description,
      price: Number(menuForm.value.price),
      image_url: finalImageUrl,
      is_available: menuForm.value.is_available,
    })
    success('Menu berhasil diperbarui.')
    showEditModal.value = false
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ''
    }
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
  togglingMenuId.value = menu.id
  try {
    await merchantsStore.toggleMenuAvailability(menu.id, !menu.is_available)
    success(menu.is_available ? `Menu '${menu.name}' dinonaktifkan.` : `Menu '${menu.name}' diaktifkan.`)
  } catch {
    error('Gagal mengubah ketersediaan menu.')
  } finally {
    togglingMenuId.value = ''
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="px-4 pb-24 space-y-5">
    <!-- Loading State -->
    <div v-if="checkLoading" class="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
      <RefreshCw class="w-9 h-9 animate-spin text-primary mb-3" />
      <p class="text-sm font-semibold">Memuat katalog menu...</p>
    </div>

    <div v-else class="space-y-5">
      <!-- Back Header -->
      <div class="flex items-center justify-between pt-2">
        <div class="flex items-center gap-3">
          <NuxtLink to="/merchant/menu" class="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 text-slate-700 active:scale-95 transition-all">
            <ArrowLeft class="w-4 h-4" />
          </NuxtLink>
          <div>
            <h2 class="text-lg font-black text-slate-900 tracking-tight">Katalog Menu Toko</h2>
            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Kelola daftar makanan, minuman, dan jasa</p>
          </div>
        </div>
        
        <!-- Add Menu Button Header Shortcut -->
        <button 
          class="flex items-center gap-1 h-9 px-3.5 rounded-xl text-xs font-black bg-primary text-white hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/10"
          @click="openAddModal"
        >
          <Plus class="w-4 h-4" />
          Tambah
        </button>
      </div>

      <!-- Menus Grid / List -->
      <div v-if="merchantsStore.merchantMenus.length === 0" class="p-12 text-center bg-white border border-slate-100 rounded-3xl text-slate-400 shadow-soft">
        <div class="inline-flex p-4 bg-slate-50 text-slate-300 rounded-full mb-3 border border-slate-100">
          <Utensils class="w-8 h-8" />
        </div>
        <p class="text-sm font-bold text-slate-800 mb-1">Belum Ada Menu Terdaftar</p>
        <p class="text-xs text-slate-400 max-w-xs mx-auto mb-4">Klik tombol di bawah ini atau tombol tambah di atas untuk memasukkan produk pertamamu.</p>
        <button 
          class="inline-flex items-center gap-1.5 h-10 px-5 rounded-2xl text-xs font-black bg-primary text-white hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/10"
          @click="openAddModal"
        >
          <Plus class="w-4.5 h-4.5" />
          Tambah Item Pertama
        </button>
      </div>
      
      <div v-else class="space-y-3.5">
        <!-- Menu Card -->
        <div
          v-for="menu in merchantsStore.merchantMenus"
          :key="menu.id"
          class="bg-white border border-slate-100 rounded-3xl p-4 flex gap-4 items-center justify-between shadow-soft hover:border-slate-200/60 transition-all duration-300"
          :class="{ 'opacity-60 bg-slate-50/50': !menu.is_available }"
        >
          <div class="flex items-center gap-3.5 min-w-0 flex-1">
            <!-- Menu Image -->
            <div class="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
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
              <h4 class="text-xs font-black text-slate-800 truncate leading-none">{{ menu.name }}</h4>
              <p v-if="menu.description" class="text-[10px] text-slate-400 font-semibold truncate leading-relaxed max-w-[220px]">
                {{ menu.description }}
              </p>
              <p class="text-xs font-black text-primary mt-1">Rp {{ menu.price.toLocaleString('id-ID') }}</p>
            </div>
          </div>

          <!-- Availability & Actions -->
          <div class="flex flex-col items-end gap-3 flex-shrink-0 pl-3.5 border-l border-slate-100">
            <!-- Availability toggle button -->
            <button
              class="h-7 px-3 text-[10px] font-black rounded-xl border transition-all active:scale-95 flex items-center gap-1"
              :class="
                menu.is_available 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                  : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100'
              "
              :disabled="togglingMenuId === menu.id"
              @click="toggleMenuAvailable(menu)"
            >
              <RefreshCw v-if="togglingMenuId === menu.id" class="w-3.5 h-3.5 animate-spin" />
              <template v-else>
                <span class="w-1.5 h-1.5 rounded-full" :class="menu.is_available ? 'bg-emerald-500' : 'bg-rose-500'" />
                {{ menu.is_available ? 'Tersedia' : 'Habis' }}
              </template>
            </button>
            
            <div class="flex gap-1.5">
              <button
                class="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 active:scale-95 transition-all shadow-sm"
                @click="openEditModal(menu)"
              >
                <Edit class="w-4 h-4" />
              </button>
              <button
                class="w-8 h-8 rounded-xl border border-rose-100 flex items-center justify-center hover:bg-rose-50 text-rose-500 active:scale-95 transition-all shadow-sm"
                @click="handleDeleteMenu(menu.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Menu Modal -->
    <UiModal v-model:open="showAddModal" title="Tambah Menu Baru">
      <div class="space-y-4 p-1">
        <!-- Name -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nama Makanan/Minuman</label>
          <input
            v-model="menuForm.name"
            type="text"
            placeholder="Nasi Goreng Spesial, Kopi Susu..."
            class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus-visible:outline-none focus:border-primary transition-all"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
          <textarea
            v-model="menuForm.description"
            placeholder="Bahan, pedas/tidak, kelengkapan item..."
            class="w-full rounded-2xl border border-slate-200 bg-background px-4 py-3 text-xs font-semibold focus-visible:outline-none focus:border-primary transition-all min-h-[60px]"
          />
        </div>

        <!-- Price -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Harga (Rp)</label>
          <input
            v-model="menuForm.price"
            type="number"
            placeholder="15000"
            class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus-visible:outline-none focus:border-primary transition-all"
          >
        </div>

        <!-- Image Picker Wajib Crop 1:1 - Otomatis masuk crop setelah pilih -->
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">Gambar Produk <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px]">Wajib Crop 1:1 • 1200×1200</span></label>
          <div class="flex items-center gap-3.5">
            <div class="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center flex-shrink-0">
              <img v-if="previewUrl" :src="previewUrl" alt="Cropped Preview" class="w-full h-full object-cover" />
              <Camera v-else class="w-6 h-6 text-amber-400" />
            </div>
            <div class="flex-1 space-y-1.5">
              <button type="button" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold hover:bg-slate-100 transition-all active:scale-95" :disabled="uploadProgress" @click="triggerAddFile">
                {{ uploadProgress ? 'Mengunggah...' : (previewUrl ? 'Ganti & Crop Otomatis 1:1' : 'Pilih Gambar → Otomatis Crop 1:1') }}
              </button>
              <input ref="addFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleFileChange" />
              <p class="text-[10px] text-slate-500">Setelah pilih foto, editor crop otomatis terbuka. Geser/zoom agar produk di tengah.</p>
              <p v-if="selectedFile && !croppedBlob" class="text-[10px] text-rose-600 font-bold animate-pulse">⚠️ Foto belum di-crop! Editor otomatis akan terbuka, atau klik pilih lagi.</p>
              <p v-if="croppedBlob" class="text-[10px] text-emerald-600 font-bold">✓ Sudah di-crop wajib 1200×1200 siap disimpan</p>
            </div>
          </div>
        </div>

        <!-- Available status -->
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-800">Tersedia Langsung</p>
            <p class="text-[10px] text-muted-foreground font-semibold">Aktifkan agar menu langsung dapat dibeli oleh pengguna.</p>
          </div>
          <!-- custom checkbox -->
          <input
            v-model="menuForm.is_available"
            type="checkbox"
            class="w-4.5 h-4.5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary focus:ring-1"
          >
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-3">
          <UiButton variant="secondary" class="flex-1 h-11 rounded-2xl text-xs font-bold" @click="showAddModal = false">Batal</UiButton>
          <UiButton class="flex-1 h-11 rounded-2xl text-xs font-bold bg-primary text-white" :disabled="actionLoading || uploadProgress" @click="handleAddMenu">
            {{ actionLoading ? 'Menyimpan...' : 'Tambahkan' }}
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Edit Menu Modal -->
    <UiModal v-model:open="showEditModal" title="Edit Item Menu">
      <div class="space-y-4 p-1">
        <!-- Name -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nama Makanan/Minuman</label>
          <input
            v-model="menuForm.name"
            type="text"
            placeholder="Nasi Goreng Spesial, Kopi Susu..."
            class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus-visible:outline-none focus:border-primary transition-all"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
          <textarea
            v-model="menuForm.description"
            placeholder="Bahan, pedas/tidak, kelengkapan item..."
            class="w-full rounded-2xl border border-slate-200 bg-background px-4 py-3 text-xs font-semibold focus-visible:outline-none focus:border-primary transition-all min-h-[60px]"
          />
        </div>

        <!-- Price -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Harga (Rp)</label>
          <input
            v-model="menuForm.price"
            type="number"
            placeholder="15000"
            class="h-11 w-full rounded-2xl border border-slate-200 bg-background px-4 text-xs font-semibold focus-visible:outline-none focus:border-primary transition-all"
          >
        </div>

        <!-- Image Picker Wajib Crop 1:1 - Edit -->
        <div class="space-y-2">
          <label class="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">Gambar Produk <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px]">Wajib Crop 1:1 • 1200×1200</span></label>
          <div class="flex items-center gap-3.5">
            <div class="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center flex-shrink-0">
              <img v-if="previewUrl" :src="previewUrl" alt="Cropped Preview" class="w-full h-full object-cover" />
              <img v-else-if="menuForm.image_url" :src="menuForm.image_url" :alt="menuForm.name" class="w-full h-full object-cover opacity-60" />
              <Camera v-else class="w-6 h-6 text-amber-400" />
            </div>
            <div class="flex-1 space-y-1.5">
              <button type="button" class="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold hover:bg-slate-100 transition-all active:scale-95" :disabled="uploadProgress" @click="triggerEditFile">
                {{ uploadProgress ? 'Mengunggah...' : (previewUrl ? 'Ganti & Crop Ulang 1:1' : 'Pilih & Crop Wajib 1:1') }}
              </button>
              <input ref="editFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleFileChange" />
              <p class="text-[10px] text-slate-500">Pilih foto → otomatis crop editor terbuka. Wajib crop agar tidak gepeng.</p>
              <p v-if="selectedFile && !croppedBlob" class="text-[10px] text-rose-600 font-bold animate-pulse">⚠️ Belum di-crop! Pilih ulang.</p>
              <p v-if="croppedBlob" class="text-[10px] text-emerald-600 font-bold">✓ Sudah di-crop</p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-800">Tersedia Langsung</p>
            <p class="text-[10px] text-muted-foreground font-semibold">Aktifkan agar menu langsung dapat dibeli.</p>
          </div>
          <input v-model="menuForm.is_available" type="checkbox" class="w-4.5 h-4.5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary focus:ring-1" />
        </div>

        <div class="flex gap-3 pt-3">
          <UiButton variant="secondary" class="flex-1 h-11 rounded-2xl text-xs font-bold" @click="showEditModal = false">Batal</UiButton>
          <UiButton class="flex-1 h-11 rounded-2xl text-xs font-bold bg-primary text-white" :disabled="actionLoading || uploadProgress" @click="handleEditMenu">
            {{ actionLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Wajib Crop Modals -->
    <CommonImageCropper v-if="cropperOpen" :src="cropperSrc" type="product" @cropped="onCropped" @cancel="onCropCancel" />
  </div>
</template>
