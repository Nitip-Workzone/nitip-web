<script setup lang="ts">
import { Image, Search, Plus, Trash2, Edit, RefreshCw, Upload, Eye, LayoutGrid, List } from '@lucide/vue'
import { useBannersStore, type Banner } from '~/stores/banners'
import { useMerchantsStore } from '~/stores/merchants'

definePageMeta({
  layout: 'admin',
})

const bannersStore = useBannersStore()
const { success, error } = useToast()

const searchQuery = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const actionLoading = ref(false)

const form = ref({
  title: '',
  image_url: '',
  redirect_url: '',
  is_active: true,
})

const editId = ref('')
const selectedFile = ref<File | null>(null)
const uploadMode = ref<'file' | 'url'>('file')

const merchantsStore = useMerchantsStore()
const selectedMerchantId = ref('')

watch(selectedMerchantId, (newVal) => {
  if (newVal) {
    form.value.redirect_url = `/food/${newVal}`
  }
})

const openAddModal = () => {
  form.value = {
    title: '',
    image_url: '',
    redirect_url: '',
    is_active: true,
  }
  selectedMerchantId.value = ''
  selectedFile.value = null
  uploadMode.value = 'file'
  showAddModal.value = true
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null
  }
}

const uploadAndSave = async () => {
  if (uploadMode.value === 'file' && selectedFile.value) {
    try {
      const url = await bannersStore.adminUploadBannerImage(selectedFile.value)
      if (url) {
        form.value.image_url = url
      }
    } catch {
      throw new Error('Gagal mengupload gambar ke Tencent COS.')
    }
  }
}

const handleAddBanner = async () => {
  if (!form.value.title) {
    error('Judul wajib diisi.')
    return
  }
  if (uploadMode.value === 'file' && !selectedFile.value) {
    error('Mohon pilih file gambar dari perangkat Anda terlebih dahulu.')
    return
  }
  if (uploadMode.value === 'url' && !form.value.image_url) {
    error('URL gambar wajib diisi.')
    return
  }

  actionLoading.value = true
  try {
    await uploadAndSave()
    await bannersStore.adminCreateBanner({
      title: form.value.title,
      image_url: form.value.image_url,
      redirect_url: form.value.redirect_url ? form.value.redirect_url : undefined,
      is_active: form.value.is_active,
    })
    success('Banner berhasil ditambahkan.')
    showAddModal.value = false
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal menambahkan banner.'
    error(errMsg)
  } finally {
    actionLoading.value = false
  }
}

const openEditModal = (banner: Banner) => {
  editId.value = banner.id
  form.value = {
    title: banner.title,
    image_url: banner.image_url,
    redirect_url: banner.redirect_url || '',
    is_active: banner.is_active,
  }
  if (banner.redirect_url && banner.redirect_url.startsWith('/food/')) {
    selectedMerchantId.value = banner.redirect_url.replace('/food/', '')
  } else {
    selectedMerchantId.value = ''
  }
  selectedFile.value = null
  uploadMode.value = 'url' // Default to show existing URL, can switch to file
  showEditModal.value = true
}

const handleEditBanner = async () => {
  if (!form.value.title) {
    error('Judul wajib diisi.')
    return
  }
  if (uploadMode.value === 'url' && !form.value.image_url) {
    error('URL gambar wajib diisi.')
    return
  }
  if (uploadMode.value === 'file' && !selectedFile.value) {
    error('Mohon pilih file gambar dari perangkat Anda terlebih dahulu.')
    return
  }

  actionLoading.value = true
  try {
    await uploadAndSave()
    await bannersStore.adminUpdateBanner(editId.value, {
      title: form.value.title,
      image_url: form.value.image_url,
      redirect_url: form.value.redirect_url ? form.value.redirect_url : undefined,
      is_active: form.value.is_active,
    })
    success('Banner berhasil diperbarui.')
    showEditModal.value = false
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal memperbarui banner.'
    error(errMsg)
  } finally {
    actionLoading.value = false
  }
}

const handleDeleteBanner = async (id: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus banner ini?')) return
  actionLoading.value = true
  try {
    await bannersStore.adminDeleteBanner(id)
    success('Banner berhasil dihapus.')
  } catch {
    error('Gagal menghapus banner.')
  } finally {
    actionLoading.value = false
  }
}

const handleToggleActive = async (banner: Banner) => {
  actionLoading.value = true
  try {
    await bannersStore.adminUpdateBanner(banner.id, {
      title: banner.title,
      image_url: banner.image_url,
      redirect_url: banner.redirect_url,
      is_active: !banner.is_active,
    })
    success(`Banner ${!banner.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`)
  } catch {
    error('Gagal memperbarui status banner.')
  } finally {
    actionLoading.value = false
  }
}

function getImageUrl(url: string | undefined) {
  if (!url) return ''
  if (url.startsWith('http://localhost:8000') || url.startsWith('http://nitip-core:8000')) {
    const relativePath = url.replace(/^http:\/\/[^/]+/, '')
    return relativePath
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('/uploads') || url.startsWith('uploads')) {
    return url.startsWith('/') ? url : `/${url}`
  }
  // If it's a relative path starting with 'banners/' etc., prepend '/uploads/'
  const cleanPath = url.startsWith('/') ? url : `/${url}`
  return `/uploads${cleanPath}`
}

onMounted(() => {
  bannersStore.adminFetchAllBanners()
  merchantsStore.adminFetchAllMerchants()
})

const showPreviewModal = ref(false)
const previewBanner = ref<Banner | null>(null)
const viewMode = ref<'grid' | 'list'>('grid')

const openPreviewModal = (banner: Banner) => {
  previewBanner.value = banner
  showPreviewModal.value = true
}

const displayedBanners = computed(() => {
  if (!searchQuery.value.trim()) return bannersStore.adminBanners
  const q = searchQuery.value.toLowerCase()
  return bannersStore.adminBanners.filter(
    (b) => b.title.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">Banner Management</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Kelola banner promosi dan iklan yang ditampilkan di dashboard pengguna.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UiButton
          variant="primary"
          size="sm"
          @click="openAddModal"
        >
          <Plus class="w-4 h-4 mr-2" />
          Tambah Banner
        </UiButton>
        <UiButton
          variant="secondary"
          size="sm"
          :loading="bannersStore.loading"
          @click="bannersStore.adminFetchAllBanners()"
        >
          <RefreshCw class="w-4 h-4 mr-2" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Toolbar: Search & View Switcher -->
    <div class="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border p-3 rounded-xl shadow-sm">
      <div class="relative flex-1 w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari judul banner..."
          class="h-9 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
        >
      </div>

      <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
        <button
          type="button"
          class="p-2 rounded-md border hover:bg-slate-50 transition-colors"
          :class="viewMode === 'grid' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-background border-input text-muted-foreground'"
          title="Grid View"
          @click="viewMode = 'grid'"
        >
          <LayoutGrid class="w-4.5 h-4.5" />
        </button>
        <button
          type="button"
          class="p-2 rounded-md border hover:bg-slate-50 transition-colors"
          :class="viewMode === 'list' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-background border-input text-muted-foreground'"
          title="List View"
          @click="viewMode = 'list'"
        >
          <List class="w-4.5 h-4.5" />
        </button>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="!bannersStore.loading && viewMode === 'grid' && displayedBanners.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="banner in displayedBanners"
        :key="banner.id"
        class="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-300 flex flex-col"
      >
        <!-- Banner Image Showcase -->
        <div class="relative aspect-[3/1] bg-slate-50 overflow-hidden border-b border-border">
          <img
            :src="getImageUrl(banner.image_url)"
            :alt="banner.title"
            class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          >
          <div class="absolute top-3 right-3">
            <button
              class="flex items-center gap-1.5 focus:outline-none"
              @click="handleToggleActive(banner)"
            >
              <UiBadge :variant="banner.is_active ? 'success' : 'secondary'">
                {{ banner.is_active ? 'Aktif' : 'Nonaktif' }}
              </UiBadge>
            </button>
          </div>
        </div>

        <!-- Banner Content -->
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div class="space-y-1">
            <h3 class="font-bold text-sm text-foreground leading-snug line-clamp-2" :title="banner.title">
              {{ banner.title }}
            </h3>
            <p class="text-[10px] text-muted-foreground font-mono truncate">ID: {{ banner.id }}</p>
          </div>

          <!-- Redirect Link info -->
          <div class="bg-slate-50 rounded-xl p-2 flex items-center justify-between gap-2 border border-slate-100">
            <div class="min-w-0">
              <p class="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Redirect Link</p>
              <p class="text-xs text-slate-700 truncate mt-0.5" :title="banner.redirect_url || 'Tidak ada'">
                {{ banner.redirect_url || '-' }}
              </p>
            </div>
            <span v-if="banner.redirect_url" class="text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">Mitra</span>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100/60">
            <!-- Showcase / Show off -->
            <button
              class="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/15 text-primary text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all active:scale-[0.98]"
              title="Showcase Tampilan Aplikasi"
              @click="openPreviewModal(banner)"
            >
              <Eye class="w-3.5 h-3.5" />
              Showcase
            </button>

            <!-- Edit & Delete -->
            <div class="flex items-center gap-1">
              <button
                class="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-slate-500 transition-colors"
                title="Edit banner"
                @click="openEditModal(banner)"
              >
                <Edit class="w-3.5 h-3.5" />
              </button>
              <button
                class="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors"
                title="Hapus banner"
                @click="handleDeleteBanner(banner.id)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table List View (Original redesigned) -->
    <div v-if="!bannersStore.loading && viewMode === 'list' && displayedBanners.length > 0" class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <UiTable>
        <UiTableHeader>
          <UiTableRow :header="true">
            <UiTableHead>Banner</UiTableHead>
            <UiTableHead>Redirect URL</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead class="text-right">Aksi</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow v-for="banner in displayedBanners" :key="banner.id">
            <!-- Banner Preview + Title -->
            <UiTableCell>
              <div class="flex items-center gap-3">
                <img
                  :src="getImageUrl(banner.image_url)"
                  :alt="banner.title"
                  class="w-16 h-9 rounded-lg object-cover bg-slate-100 border border-border flex-shrink-0"
                >
                <div class="min-w-0">
                  <p class="font-medium text-foreground text-[13px] leading-tight truncate">
                    {{ banner.title }}
                  </p>
                  <p class="text-[11px] text-muted-foreground truncate mt-1">
                    ID: {{ banner.id }}
                  </p>
                </div>
              </div>
            </UiTableCell>

            <!-- Redirect URL -->
            <UiTableCell>
              <span class="text-xs text-muted-foreground block max-w-xs truncate" :title="banner.redirect_url || '-'">
                {{ banner.redirect_url || '-' }}
              </span>
            </UiTableCell>

            <!-- Status (Active Toggle) -->
            <UiTableCell>
              <button
                class="flex items-center gap-1.5 focus:outline-none"
                @click="handleToggleActive(banner)"
              >
                <UiBadge :variant="banner.is_active ? 'success' : 'secondary'">
                  {{ banner.is_active ? 'Aktif' : 'Nonaktif' }}
                </UiBadge>
              </button>
            </UiTableCell>

            <!-- Actions -->
            <UiTableCell>
              <div class="flex items-center justify-end gap-1.5">
                <button
                  class="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-primary transition-colors"
                  title="Showcase Tampilan Aplikasi"
                  @click="openPreviewModal(banner)"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  class="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-slate-500"
                  title="Edit banner"
                  @click="openEditModal(banner)"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  class="h-8 w-8 rounded-md flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors"
                  title="Hapus banner"
                  @click="handleDeleteBanner(banner.id)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>

    <!-- Loading Skeleton (Universal) -->
    <div v-if="bannersStore.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 3" :key="i" class="bg-card border border-border rounded-2xl overflow-hidden p-4 space-y-4 animate-pulse">
        <div class="aspect-[3/1] rounded-xl bg-muted w-full" />
        <div class="space-y-2">
          <div class="h-4 bg-muted rounded w-2/3" />
          <div class="h-3 bg-muted/65 rounded w-1/3" />
        </div>
        <div class="h-8 bg-muted/50 rounded-xl w-full" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="displayedBanners.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center gap-3 bg-card border border-border rounded-2xl shadow-sm"
    >
      <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Image class="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p class="font-semibold text-foreground">Tidak ada banner ditemukan</p>
        <p class="text-sm text-muted-foreground mt-0.5">Buat banner baru untuk mulai menampilkan iklan</p>
      </div>
    </div>

    <!-- Add Banner Modal -->
    <UiModal v-model:open="showAddModal" title="Tambah Banner Promosi Baru">
      <div class="space-y-4 p-1">
        <!-- Title -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Judul Promosi</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Masukkan judul banner/promosi"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Image Selection Mode Toggle -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Sumber Gambar</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all"
              :class="uploadMode === 'file' ? 'bg-primary/10 text-primary border-primary' : 'bg-background border-input text-muted-foreground'"
              @click="uploadMode = 'file'"
            >
              Upload Gambar (Tencent COS)
            </button>
            <button
              type="button"
              class="flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all"
              :class="uploadMode === 'url' ? 'bg-primary/10 text-primary border-primary' : 'bg-background border-input text-muted-foreground'"
              @click="uploadMode = 'url'"
            >
              Input URL Gambar
            </button>
          </div>
        </div>

        <!-- Image File Upload -->
        <div v-if="uploadMode === 'file'" class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Pilih File Banner</label>
          <div class="flex items-center justify-center w-full">
            <label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-lg cursor-pointer bg-background hover:bg-muted/30 transition-all">
              <div class="flex flex-col items-center justify-center pt-3 pb-3">
                <Upload class="w-6 h-6 text-muted-foreground mb-1" />
                <p class="text-xs text-slate-500">
                  {{ selectedFile ? selectedFile.name : 'Klik untuk memilih gambar banner' }}
                </p>
                <p class="text-[9px] text-muted-foreground">Maksimal 5MB (JPG, JPEG, PNG)</p>
              </div>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileChange"
              >
            </label>
          </div>
        </div>

        <!-- Image URL -->
        <div v-else class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">URL Gambar Banner</label>
          <input
            v-model="form.image_url"
            type="text"
            placeholder="https://link-gambar.com/banner.jpg"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Tautkan ke Mitra (Merchant) -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Tautkan ke Mitra / Toko (Opsional)</label>
          <select
            v-model="selectedMerchantId"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer"
          >
            <option value="">-- Jangan Tautkan --</option>
            <option v-for="m in merchantsStore.adminMerchants" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.category }})
            </option>
          </select>
        </div>

        <!-- Redirect URL -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Redirect URL (Opsional)</label>
          <input
            v-model="form.redirect_url"
            type="text"
            placeholder="https://link-tujuan.com (jika diklik)"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Active Status Toggle -->
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-700">Aktifkan Langsung</p>
            <p class="text-[10px] text-muted-foreground">Aktifkan untuk langsung menampilkan banner ini ke pengguna.</p>
          </div>
          <input
            v-model="form.is_active"
            type="checkbox"
            class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
          >
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-3">
          <UiButton
            class="flex-1"
            variant="secondary"
            :disabled="actionLoading"
            @click="showAddModal = false"
          >
            Batal
          </UiButton>
          <UiButton
            class="flex-1"
            variant="primary"
            :loading="actionLoading"
            @click="handleAddBanner"
          >
            Simpan Banner
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Edit Banner Modal -->
    <UiModal v-model:open="showEditModal" title="Edit Banner Promosi">
      <div class="space-y-4 p-1">
        <!-- Title -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Judul Promosi</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Masukkan judul banner/promosi"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Image Selection Mode Toggle -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Sumber Gambar</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all"
              :class="uploadMode === 'file' ? 'bg-primary/10 text-primary border-primary' : 'bg-background border-input text-muted-foreground'"
              @click="uploadMode = 'file'"
            >
              Upload Gambar Baru
            </button>
            <button
              type="button"
              class="flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all"
              :class="uploadMode === 'url' ? 'bg-primary/10 text-primary border-primary' : 'bg-background border-input text-muted-foreground'"
              @click="uploadMode = 'url'"
            >
              Lihat/Ubah URL Gambar
            </button>
          </div>
        </div>

        <!-- Image File Upload -->
        <div v-if="uploadMode === 'file'" class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Pilih File Banner Baru</label>
          <div class="flex items-center justify-center w-full">
            <label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-lg cursor-pointer bg-background hover:bg-muted/30 transition-all">
              <div class="flex flex-col items-center justify-center pt-3 pb-3">
                <Upload class="w-6 h-6 text-muted-foreground mb-1" />
                <p class="text-xs text-slate-500">
                  {{ selectedFile ? selectedFile.name : 'Klik untuk memilih gambar banner baru' }}
                </p>
                <p class="text-[9px] text-muted-foreground">Maksimal 5MB (JPG, JPEG, PNG)</p>
              </div>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileChange"
              >
            </label>
          </div>
        </div>

        <!-- Image URL -->
        <div v-else class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">URL Gambar Banner</label>
          <input
            v-model="form.image_url"
            type="text"
            placeholder="https://link-gambar.com/banner.jpg"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Tautkan ke Mitra (Merchant) -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Tautkan ke Mitra / Toko (Opsional)</label>
          <select
            v-model="selectedMerchantId"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer"
          >
            <option value="">-- Jangan Tautkan --</option>
            <option v-for="m in merchantsStore.adminMerchants" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.category }})
            </option>
          </select>
        </div>

        <!-- Redirect URL -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Redirect URL (Opsional)</label>
          <input
            v-model="form.redirect_url"
            type="text"
            placeholder="https://link-tujuan.com (jika diklik)"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Active Status Toggle -->
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-700">Status Aktif</p>
            <p class="text-[10px] text-muted-foreground">Tampilkan banner ini ke pengguna.</p>
          </div>
          <input
            v-model="form.is_active"
            type="checkbox"
            class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
          >
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-3">
          <UiButton
            class="flex-1"
            variant="secondary"
            :disabled="actionLoading"
            @click="showEditModal = false"
          >
            Batal
          </UiButton>
          <UiButton
            class="flex-1"
            variant="primary"
            :loading="actionLoading"
            @click="handleEditBanner"
          >
            Perbarui Banner
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Showcase / Preview Modal -->
    <UiModal v-model:open="showPreviewModal" title="Showcase Tampilan Aplikasi">
      <div v-if="previewBanner" class="flex flex-col items-center justify-center p-4">
        <!-- Phone Frame Mockup -->
        <div class="relative w-64 h-[500px] bg-slate-950 rounded-[40px] p-2.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50 flex flex-col overflow-hidden">
          <!-- Notch -->
          <div class="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-800 mr-2" />
            <span class="w-8 h-1 bg-slate-800 rounded-full" />
          </div>
          
          <!-- Screen Content -->
          <div class="flex-1 rounded-[32px] bg-white overflow-hidden flex flex-col relative pt-8 font-sans text-slate-800">
            <!-- Simulated StatusBar -->
            <div class="absolute top-1 left-0 right-0 px-5 flex justify-between items-center text-[10px] font-bold text-slate-400 select-none z-10">
              <span>09:41</span>
              <div class="flex items-center gap-1">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            <!-- Simulated App Bar -->
            <div class="px-4 py-2 flex items-center justify-between border-b border-slate-50 shrink-0">
              <span class="text-xs font-black tracking-tight text-primary">NIHTIP</span>
              <div class="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px]">🔔</div>
            </div>

            <!-- Simulated Scrollable Area -->
            <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-none">
              <!-- Greet -->
              <div>
                <p class="text-[10px] text-slate-400">Selamat pagi,</p>
                <p class="text-xs font-bold text-slate-900 leading-tight">Halo, Penitip! 👋</p>
              </div>

              <!-- Carousel Showcase Banner -->
              <div class="relative aspect-[3/1] rounded-xl overflow-hidden shadow-md border border-slate-100/50 bg-slate-50 group">
                <img :src="getImageUrl(previewBanner.image_url)" :alt="previewBanner.title" class="w-full h-full object-cover">
                <!-- Clickable indicator if it has redirect_url -->
                <div v-if="previewBanner.redirect_url" class="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span class="bg-black/60 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">🔗 Clickable</span>
                </div>
              </div>

              <!-- Indicators mock -->
              <div class="flex justify-center gap-1 -mt-2">
                <span class="w-3 h-1 rounded-full bg-primary" />
                <span class="w-1 h-1 rounded-full bg-slate-200" />
                <span class="w-1 h-1 rounded-full bg-slate-200" />
              </div>

              <!-- Features mock -->
              <div class="grid grid-cols-4 gap-2">
                <div v-for="i in 4" :key="i" class="flex flex-col items-center gap-1 opacity-60">
                  <div class="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs">🍔</div>
                  <span class="text-[8px] font-semibold text-slate-500">Fitur {{ i }}</span>
                </div>
              </div>

              <!-- Simulated Activity -->
              <div class="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                <div class="h-2 bg-slate-200 rounded w-16" />
                <div class="h-3 bg-slate-100 rounded w-full" />
                <div class="h-2 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
            
            <!-- Bottom navigation indicator -->
            <div class="h-5 bg-white border-t border-slate-50 flex items-center justify-center shrink-0">
              <span class="w-20 h-1 bg-slate-200 rounded-full" />
            </div>
          </div>
        </div>

        <!-- Info Description -->
        <div class="mt-4 text-center space-y-1 max-w-[280px]">
          <h4 class="text-xs font-bold text-slate-800 leading-tight">{{ previewBanner.title }}</h4>
          <p class="text-[10px] text-muted-foreground break-all">
            Link: <span class="font-mono text-primary">{{ previewBanner.redirect_url || 'Tidak ada link' }}</span>
          </p>
        </div>
      </div>
    </UiModal>
  </div>
</template>
