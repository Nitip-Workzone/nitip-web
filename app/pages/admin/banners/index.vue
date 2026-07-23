<script setup lang="ts">
import { Image, Search, Plus, Trash2, Edit, RefreshCw, Upload } from '@lucide/vue'
import { useBannersStore, type Banner } from '~/stores/banners'

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

const openAddModal = () => {
  form.value = {
    title: '',
    image_url: '',
    redirect_url: '',
    is_active: true,
  }
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
    error('Silakan pilih file gambar untuk diupload.')
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
    error('Silakan pilih file gambar untuk diupload.')
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

onMounted(() => {
  bannersStore.adminFetchAllBanners()
})

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

    <!-- Toolbar: Search -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari judul banner..."
          class="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
        >
      </div>
    </div>

    <!-- Table Card -->
    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <!-- Loading Skeleton -->
      <div v-if="bannersStore.loading" class="divide-y divide-border/50 bg-card">
        <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-5 py-4 animate-pulse">
          <div class="w-16 h-10 rounded-lg bg-muted flex-shrink-0" />
          <div class="flex-1 space-y-1.5 min-w-0">
            <div class="h-3 bg-muted rounded w-32" />
            <div class="h-2.5 bg-muted/60 rounded w-48" />
          </div>
          <div class="h-5 bg-muted rounded-full w-16" />
          <div class="flex gap-2 ml-auto">
            <div class="h-8 bg-muted rounded w-8" />
            <div class="h-8 bg-muted rounded w-8" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="displayedBanners.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center gap-3"
      >
        <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Image class="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p class="font-semibold text-foreground">Tidak ada banner ditemukan</p>
          <p class="text-sm text-muted-foreground mt-0.5">Buat banner baru untuk mulai menampilkan iklan</p>
        </div>
      </div>

      <!-- Data Table -->
      <template v-else>
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
                    :src="banner.image_url"
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
      </template>
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
  </div>
</template>
