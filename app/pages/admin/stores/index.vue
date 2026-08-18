<script setup lang="ts">
import { Plus, Edit2, Trash2, MapPin, ToggleLeft, ToggleRight, Store, X, Check, Loader2, Upload } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
})

const { request } = useApi()

interface StoreItem {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  description: string
  image_url: string
  is_active: boolean
  created_at: string
}

interface StoreForm {
  name: string
  address: string
  lat: string
  lng: string
  category: string
  description: string
  image_url: string
  is_active: boolean
}

const stores = ref<StoreItem[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref<string | null>(null)

// Batch upload state
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingBatch = ref(false)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleBatchUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target?.result as string)
      if (!Array.isArray(json)) {
        alert('File JSON harus bertipe array [] berisi daftar tokoh.')
        return
      }

      // Check format
      const valid = json.every(item => item && item.name && typeof item.lat === 'number' && typeof item.lng === 'number')
      if (!valid) {
        alert('Setiap item di file JSON wajib memiliki properti "name" (string), "lat" (number), dan "lng" (number).')
        return
      }

      const confirmMsg = `Ditemukan ${json.length} tokoh di file. Lanjutkan import batch ke database?`
      if (!confirm(confirmMsg)) return

      uploadingBatch.value = true
      const res = await request<{ data: { processed: number; inserted: number } }>('/admin/stores/batch', {
        method: 'POST',
        body: json.map(item => ({
          name: item.name,
          address: item.address || '',
          lat: item.lat,
          lng: item.lng,
          category: item.category || 'toko',
          description: item.description || '',
          image_url: item.image_url || '',
          is_active: true
        })) as any
      })

      if (res.data) {
        alert(`Berhasil import batch! ${res.data.inserted} dari ${res.data.processed} tokoh berhasil dimasukkan.`)
        await fetchStores()
      }
    } catch (err) {
      alert('Gagal membaca atau mengunggah file JSON. Pastikan format valid.')
      console.error(err)
    } finally {
      uploadingBatch.value = false
      if (fileInput.value) fileInput.value.value = ''
    }
  }
  reader.readAsText(file)
}

// Modal state
const showModal = ref(false)
const editingStore = ref<StoreItem | null>(null)
const form = ref<StoreForm>({
  name: '',
  address: '',
  lat: '',
  lng: '',
  category: '',
  description: '',
  image_url: '',
  is_active: true,
})
const formError = ref('')

// Map preview state inside modal
const showMapPreview = ref(false)

// Category options
const categoryOptions = [
  { value: '', label: 'Pilih Kategori' },
  { value: 'supermarket', label: 'Supermarket / Minimarket' },
  { value: 'pasar', label: 'Pasar Tradisional' },
  { value: 'mall', label: 'Mall / Pusat Perbelanjaan' },
  { value: 'toko', label: 'Toko Kelontong / Warung' },
  { value: 'apotek', label: 'Apotek / Klinik' },
  { value: 'restoran', label: 'Restoran / Rumah Makan' },
  { value: 'lainnya', label: 'Lainnya' },
]

const fetchStores = async () => {
  loading.value = true
  try {
    const res = await request<{ data: StoreItem[] }>('/admin/stores')
    if (res.data) {
      stores.value = res.data
    }
  } catch (err) {
    console.error('Gagal mengambil data tokoh:', err)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingStore.value = null
  form.value = {
    name: '',
    address: '',
    lat: '',
    lng: '',
    category: '',
    description: '',
    image_url: '',
    is_active: true,
  }
  formError.value = ''
  showModal.value = true
}

const openEditModal = (store: StoreItem) => {
  editingStore.value = store
  form.value = {
    name: store.name,
    address: store.address || '',
    lat: String(store.lat),
    lng: String(store.lng),
    category: store.category || '',
    description: store.description || '',
    image_url: store.image_url || '',
    is_active: store.is_active,
  }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingStore.value = null
  formError.value = ''
}

const validateForm = (): boolean => {
  if (!form.value.name.trim()) {
    formError.value = 'Nama tokoh wajib diisi.'
    return false
  }
  const lat = parseFloat(form.value.lat)
  const lng = parseFloat(form.value.lng)
  if (isNaN(lat) || lat < -90 || lat > 90) {
    formError.value = 'Latitude tidak valid (harus antara -90 dan 90).'
    return false
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    formError.value = 'Longitude tidak valid (harus antara -180 dan 180).'
    return false
  }
  formError.value = ''
  return true
}

const saveStore = async () => {
  if (!validateForm()) return

  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      address: form.value.address.trim(),
      lat: parseFloat(form.value.lat),
      lng: parseFloat(form.value.lng),
      category: form.value.category,
      description: form.value.description.trim(),
      image_url: form.value.image_url.trim(),
      is_active: form.value.is_active,
    }

    if (editingStore.value) {
      await request(`/admin/stores/${editingStore.value.id}`, {
        method: 'PUT',
        body: payload,
      })
    } else {
      await request('/admin/stores', {
        method: 'POST',
        body: payload,
      })
    }

    closeModal()
    await fetchStores()
  } catch (err) {
    formError.value = 'Terjadi kesalahan. Silakan coba lagi.'
    console.error(err)
  } finally {
    saving.value = false
  }
}

const deleteStore = async (id: string) => {
  if (!confirm('Yakin ingin menghapus tokoh ini? Tindakan ini tidak dapat dibatalkan.')) return

  deleting.value = id
  try {
    await request(`/admin/stores/${id}`, { method: 'DELETE' })
    await fetchStores()
  } catch (err) {
    console.error('Gagal menghapus tokoh:', err)
  } finally {
    deleting.value = null
  }
}

const openOnGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
}

const previewMapUrl = computed(() => {
  const lat = parseFloat(form.value.lat)
  const lng = parseFloat(form.value.lng)
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    return `/map/viewer?lat=${lat}&lng=${lng}`
  }
  return null
})

const getCategoryLabel = (value: string) => {
  return categoryOptions.find(c => c.value === value)?.label || value || '—'
}

onMounted(() => {
  fetchStores()
})
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Direktori Tokoh</h1>
        <p class="text-sm text-muted-foreground mt-0.5">Kelola daftar tokoh & toko untuk fitur Titip Beli</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Hidden file input for batch upload -->
        <input 
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleBatchUpload"
        >
        
        <button
          id="btn-import-stores"
          :disabled="uploadingBatch"
          class="flex items-center gap-2 bg-white border border-border/80 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          @click="triggerFileInput"
        >
          <Loader2 v-if="uploadingBatch" class="w-4 h-4 animate-spin" />
          <Upload v-else class="w-4 h-4" />
          Import JSON
        </button>

        <button
          id="btn-add-store"
          class="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-primary/90 transition-all"
          @click="openCreateModal"
        >
          <Plus class="w-4 h-4" />
          Tambah Tokoh
        </button>
      </div>
    </div>

    <!-- Stats Card -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white border border-border/40 rounded-2xl p-4 shadow-sm">
        <p class="text-xs text-muted-foreground font-medium">Total Tokoh</p>
        <p class="text-2xl font-bold text-foreground mt-1">{{ stores.length }}</p>
      </div>
      <div class="bg-white border border-border/40 rounded-2xl p-4 shadow-sm">
        <p class="text-xs text-muted-foreground font-medium">Aktif</p>
        <p class="text-2xl font-bold text-green-600 mt-1">{{ stores.filter(s => s.is_active).length }}</p>
      </div>
      <div class="bg-white border border-border/40 rounded-2xl p-4 shadow-sm">
        <p class="text-xs text-muted-foreground font-medium">Nonaktif</p>
        <p class="text-2xl font-bold text-slate-400 mt-1">{{ stores.filter(s => !s.is_active).length }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="bg-white border border-border/40 rounded-2xl p-4 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-slate-100" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-slate-100 rounded w-1/3" />
            <div class="h-3 bg-slate-50 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="stores.length === 0" class="bg-white border border-border/40 rounded-3xl p-12 text-center shadow-sm">
      <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Store class="w-8 h-8 text-primary" />
      </div>
      <h3 class="font-bold text-foreground">Belum ada tokoh</h3>
      <p class="text-sm text-muted-foreground mt-1 mb-4">Tambahkan tokoh pertama untuk fitur Titip Beli</p>
      <button
        class="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl"
        @click="openCreateModal"
      >
        Tambah Tokoh Pertama
      </button>
    </div>

    <!-- Stores Table -->
    <div v-else class="bg-white border border-border/40 rounded-2xl shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tokoh</th>
            <th class="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori</th>
            <th class="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Koordinat</th>
            <th class="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
            <th class="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr
            v-for="store in stores"
            :key="store.id"
            :class="['hover:bg-slate-50/50 transition-colors', !store.is_active ? 'opacity-60' : '']"
          >
            <!-- Tokoh Info -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Store class="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p class="font-semibold text-foreground text-sm">{{ store.name }}</p>
                  <p v-if="store.address" class="text-xs text-muted-foreground truncate max-w-[200px]">{{ store.address }}</p>
                </div>
              </div>
            </td>

            <!-- Category -->
            <td class="px-4 py-3">
              <span class="text-xs text-muted-foreground">{{ getCategoryLabel(store.category) }}</span>
            </td>

            <!-- Coordinates -->
            <td class="px-4 py-3">
              <button
                class="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                @click="openOnGoogleMaps(store.lat, store.lng)"
              >
                <MapPin class="w-3.5 h-3.5 shrink-0" />
                {{ store.lat.toFixed(5) }}, {{ store.lng.toFixed(5) }}
              </button>
            </td>

            <!-- Status -->
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold',
                  store.is_active
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                ]"
              >
                <span :class="['w-1.5 h-1.5 rounded-full', store.is_active ? 'bg-green-500' : 'bg-slate-400']" />
                {{ store.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2">
                <button
                  :id="`btn-edit-store-${store.id}`"
                  class="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Edit tokoh"
                  @click="openEditModal(store)"
                >
                  <Edit2 class="w-4 h-4" />
                </button>
                <button
                  :id="`btn-delete-store-${store.id}`"
                  :disabled="deleting === store.id"
                  class="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                  title="Hapus tokoh"
                  @click="deleteStore(store.id)"
                >
                  <Loader2 v-if="deleting === store.id" class="w-4 h-4 animate-spin" />
                  <Trash2 v-else class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store class="w-4 h-4 text-primary" />
              </div>
              <h2 class="text-base font-bold text-foreground">
                {{ editingStore ? 'Edit Tokoh' : 'Tambah Tokoh Baru' }}
              </h2>
            </div>
            <button class="p-1.5 rounded-full hover:bg-slate-100 transition-colors" @click="closeModal">
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="overflow-y-auto flex-1 px-6 py-5 space-y-4">

            <!-- Error Banner -->
            <div v-if="formError" class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <X class="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p class="text-xs text-red-700 font-medium">{{ formError }}</p>
            </div>

            <!-- Nama -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nama Tokoh *</label>
              <input
                id="input-store-name"
                v-model="form.name"
                type="text"
                placeholder="Contoh: Pasar Bersehati, Alfamart Kotamobagu"
                class="w-full text-sm p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 bg-slate-50/50"
              >
            </div>

            <!-- Alamat -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alamat</label>
              <input
                id="input-store-address"
                v-model="form.address"
                type="text"
                placeholder="Jalan, kelurahan, kecamatan..."
                class="w-full text-sm p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 bg-slate-50/50"
              >
            </div>

            <!-- Kategori -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori</label>
              <select
                id="input-store-category"
                v-model="form.category"
                class="w-full text-sm p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 bg-white appearance-none cursor-pointer"
              >
                <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Koordinat -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Koordinat GPS *</label>
                <p class="text-[10px] text-muted-foreground">Dapatkan dari Google Maps: klik kanan → Koordinat</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-[10px] text-muted-foreground mb-1 block">Latitude</label>
                  <input
                    id="input-store-lat"
                    v-model="form.lat"
                    type="text"
                    inputmode="decimal"
                    placeholder="0.881122"
                    class="w-full text-sm p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 bg-slate-50/50 font-mono"
                  >
                </div>
                <div>
                  <label class="text-[10px] text-muted-foreground mb-1 block">Longitude</label>
                  <input
                    id="input-store-lng"
                    v-model="form.lng"
                    type="text"
                    inputmode="decimal"
                    placeholder="124.014567"
                    class="w-full text-sm p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 bg-slate-50/50 font-mono"
                  >
                </div>
              </div>

              <!-- Preview Map Link -->
              <div v-if="previewMapUrl" class="flex items-center gap-2 pt-1">
                <MapPin class="w-3.5 h-3.5 text-primary shrink-0" />
                <a
                  :href="previewMapUrl"
                  target="_blank"
                  class="text-xs text-primary hover:underline font-medium"
                >
                  Preview lokasi di peta ↗
                </a>
              </div>
            </div>

            <!-- Deskripsi -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deskripsi (Opsional)</label>
              <textarea
                id="input-store-description"
                v-model="form.description"
                rows="2"
                placeholder="Catatan tambahan tentang tokoh ini..."
                class="w-full text-sm p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 bg-slate-50/50 resize-none"
              />
            </div>

            <!-- URL Gambar -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">URL Gambar (Opsional)</label>
              <input
                id="input-store-image"
                v-model="form.image_url"
                type="url"
                placeholder="https://..."
                class="w-full text-sm p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 bg-slate-50/50"
              >
            </div>

            <!-- Status Toggle -->
            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p class="text-sm font-semibold text-foreground">Status Aktif</p>
                <p class="text-xs text-muted-foreground mt-0.5">Tokoh nonaktif tidak akan muncul di pencarian</p>
              </div>
              <button
                :id="`toggle-store-active`"
                class="relative shrink-0 transition-all"
                @click="form.is_active = !form.is_active"
              >
                <ToggleRight v-if="form.is_active" class="w-10 h-10 text-green-500" />
                <ToggleLeft v-else class="w-10 h-10 text-slate-400" />
              </button>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
            <button
              class="flex-1 py-3 text-sm font-bold text-muted-foreground border border-border/60 rounded-2xl hover:bg-slate-50 transition-all"
              @click="closeModal"
            >
              Batal
            </button>
            <button
              id="btn-save-store"
              :disabled="saving"
              class="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-primary/10"
              @click="saveStore"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <Check v-else class="w-4 h-4" />
              {{ saving ? 'Menyimpan...' : (editingStore ? 'Simpan Perubahan' : 'Tambah Tokoh') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
