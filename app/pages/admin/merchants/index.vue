<script setup lang="ts">
import { Store, Search, Plus, Trash2, Edit, RefreshCw } from '@lucide/vue'
import { useMerchantsStore, type Merchant } from '~/stores/merchants'
import { useUsersStore } from '~/stores/users'

definePageMeta({
  layout: 'admin',
})

const merchantsStore = useMerchantsStore()
const usersStore = useUsersStore()
const { success, error } = useToast()

const searchQuery = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const actionLoading = ref(false)

const form = ref({
  owner_id: '',
  name: '',
  description: '',
  address: '',
  latitude: 0,
  longitude: 0,
  category: 'food',
  auto_confirm: false,
  max_active_orders: 5,
})

const editId = ref('')

const openAddModal = async () => {
  form.value = {
    owner_id: '',
    name: '',
    description: '',
    address: '',
    latitude: -6.2088, // Default Jakarta coordinates
    longitude: 106.8456,
    category: 'food',
    auto_confirm: false,
    max_active_orders: 5,
  }
  showAddModal.value = true
  
  // Load users for owner selection
  if (usersStore.users.length === 0) {
    await usersStore.fetchUsers()
  }
}

const handleAddMerchant = async () => {
  if (!form.value.owner_id) {
    error('Pemilik Toko (Owner) wajib dipilih.')
    return
  }
  if (!form.value.name) {
    error('Nama merchant wajib diisi.')
    return
  }
  if (!form.value.latitude || !form.value.longitude) {
    error('Latitude dan Longitude wajib diisi.')
    return
  }

  actionLoading.value = true
  try {
    await merchantsStore.adminCreateMerchant({
      owner_id: form.value.owner_id,
      name: form.value.name,
      description: form.value.description,
      address: form.value.address,
      latitude: Number(form.value.latitude),
      longitude: Number(form.value.longitude),
      category: form.value.category,
      auto_confirm: form.value.auto_confirm,
      max_active_orders: Number(form.value.max_active_orders),
    })
    success('Merchant berhasil didaftarkan.')
    showAddModal.value = false
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal menambahkan merchant.'
    error(errMsg)
  } finally {
    actionLoading.value = false
  }
}

const openEditModal = (merchant: Merchant) => {
  editId.value = merchant.id
  form.value = {
    owner_id: merchant.owner_id,
    name: merchant.name,
    description: merchant.description || '',
    address: merchant.address || '',
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    category: merchant.category,
    auto_confirm: merchant.auto_confirm,
    max_active_orders: merchant.max_active_orders,
  }
  showEditModal.value = true
}

const handleEditMerchant = async () => {
  if (!form.value.name) {
    error('Nama merchant wajib diisi.')
    return
  }

  actionLoading.value = true
  try {
    await merchantsStore.adminUpdateMerchant(editId.value, {
      name: form.value.name,
      description: form.value.description,
      address: form.value.address,
      latitude: Number(form.value.latitude),
      longitude: Number(form.value.longitude),
      category: form.value.category,
      max_active_orders: Number(form.value.max_active_orders),
    })
    success('Merchant berhasil diperbarui.')
    showEditModal.value = false
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal memperbarui merchant.'
    error(errMsg)
  } finally {
    actionLoading.value = false
  }
}

const handleDeleteMerchant = async (id: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus merchant ini?')) return

  try {
    await merchantsStore.adminDeleteMerchant(id)
    success('Merchant berhasil dihapus.')
  } catch (err) {
    const errMsg = (err as { message?: string })?.message || 'Gagal menghapus merchant.'
    error(errMsg)
  }
}

const getOwnerName = (ownerId: string) => {
  const user = usersStore.users.find((u) => u.id === ownerId)
  return user ? user.name : 'Unknown User'
}

const getOwnerEmail = (ownerId: string) => {
  const user = usersStore.users.find((u) => u.id === ownerId)
  return user ? user.email : ''
}

const filteredMerchants = computed(() => {
  if (!searchQuery.value) return merchantsStore.adminMerchants
  const q = searchQuery.value.toLowerCase()
  return merchantsStore.adminMerchants.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      m.category.toLowerCase().includes(q)
  )
})

const refresh = async () => {
  await merchantsStore.adminFetchAllMerchants()
  await usersStore.fetchUsers()
}

onMounted(async () => {
  await merchantsStore.adminFetchAllMerchants()
  await usersStore.fetchUsers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Manajemen Merchant</h1>
        <p class="text-sm text-muted-foreground">Kelola pendaftaran merchant mitra kuliner dan lainnya secara manual.</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="h-9 w-9 rounded-md border border-input flex items-center justify-center hover:bg-accent transition-colors"
          @click="refresh"
        >
          <RefreshCw class="w-4 h-4 text-muted-foreground" :class="{ 'animate-spin': merchantsStore.loading }" />
        </button>
        <UiButton class="flex items-center gap-2" @click="openAddModal">
          <Plus class="w-4 h-4" />
          Tambah Merchant
        </UiButton>
      </div>
    </div>

    <!-- Search / Filter Card -->
    <div class="bg-card border border-border/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div class="relative w-full md:w-80">
        <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari merchant..."
          class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
        >
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-card border border-border/50 rounded-xl overflow-hidden">
      <div v-if="merchantsStore.loading && merchantsStore.adminMerchants.length === 0" class="p-8 text-center text-muted-foreground">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2" />
        Sedang memuat data merchant...
      </div>
      <div v-else-if="filteredMerchants.length === 0" class="p-8 text-center text-muted-foreground">
        <Store class="w-8 h-8 mx-auto mb-2 text-slate-400" />
        Belum ada merchant terdaftar. Klik "Tambah Merchant" untuk memulai.
      </div>
      <template v-else>
        <UiTable>
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead>Nama Toko</UiTableHead>
              <UiTableHead>Pemilik (User)</UiTableHead>
              <UiTableHead>Kategori</UiTableHead>
              <UiTableHead>Status Buka</UiTableHead>
              <UiTableHead>Auto Confirm</UiTableHead>
              <UiTableHead>Maks Antrean</UiTableHead>
              <UiTableHead>Rating</UiTableHead>
              <UiTableHead class="text-right">Aksi</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="merchant in filteredMerchants" :key="merchant.id">
              <UiTableCell class="font-semibold">{{ merchant.name }}</UiTableCell>
              <UiTableCell>
                <div>
                  <p class="font-medium text-xs">{{ getOwnerName(merchant.owner_id) }}</p>
                  <p class="text-[10px] text-muted-foreground">{{ getOwnerEmail(merchant.owner_id) }}</p>
                </div>
              </UiTableCell>
              <UiTableCell>
                <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-primary/10 text-primary border border-primary/20">
                  {{ merchant.category }}
                </span>
              </UiTableCell>
              <UiTableCell>
                <span
                  class="px-2 py-0.5 text-[10px] font-bold rounded"
                  :class="merchant.is_open ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
                >
                  {{ merchant.is_open ? 'BUKA' : 'TUTUP' }}
                </span>
              </UiTableCell>
              <UiTableCell>
                <span class="text-xs font-semibold">
                  {{ merchant.auto_confirm ? 'Ya' : 'Tidak' }}
                </span>
              </UiTableCell>
              <UiTableCell class="text-center font-bold">{{ merchant.max_active_orders }}</UiTableCell>
              <UiTableCell>⭐ {{ merchant.rating.toFixed(1) }}</UiTableCell>
              <UiTableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    class="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit merchant"
                    @click="openEditModal(merchant)"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    class="h-8 w-8 rounded-md flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors"
                    title="Hapus merchant"
                    @click="handleDeleteMerchant(merchant.id)"
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

    <!-- Add Merchant Modal -->
    <UiModal v-model:open="showAddModal" title="Tambah Merchant Baru">
      <div class="space-y-4 p-1">
        <!-- Owner User -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Pemilik Toko (User)</label>
          <select
            v-model="form.owner_id"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
            <option value="" disabled>Pilih User Pemilik</option>
            <option v-for="user in usersStore.users" :key="user.id" :value="user.id">
              {{ user.name }} ({{ user.email }} - Role: {{ user.role }})
            </option>
          </select>
          <p class="text-[9px] text-muted-foreground">Catatan: User yang terpilih akan dipromosikan perannya menjadi 'merchant' secara otomatis.</p>
        </div>

        <!-- Store Name -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nama Merchant/Toko</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Masukkan nama restoran/toko"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi singkat</label>
          <textarea
            v-model="form.description"
            placeholder="Deskripsi spesialisasi kuliner/layanan..."
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all min-h-[60px]"
          />
        </div>

        <!-- Address -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Alamat Lengkap Toko</label>
          <textarea
            v-model="form.address"
            placeholder="Jalan, Blok, Detail Gedung..."
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all min-h-[60px]"
          />
        </div>

        <!-- Coordinates -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Latitude</label>
            <input
              v-model="form.latitude"
              type="number"
              step="0.000000000000001"
              placeholder="-6.2088"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Longitude</label>
            <input
              v-model="form.longitude"
              type="number"
              step="0.000000000000001"
              placeholder="106.8456"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>
        </div>

        <!-- Category & Queue Limit -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Kategori</label>
            <select
              v-model="form.category"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
              <option value="food">Makanan / Food</option>
              <option value="laundry">Laundry</option>
              <option value="mart">Belanja / Mart</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Maksimal Antrean Aktif</label>
            <input
              v-model="form.max_active_orders"
              type="number"
              placeholder="5"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>
        </div>

        <!-- Auto Confirm Toggle -->
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-700">Auto Confirm Pesanan</p>
            <p class="text-[10px] text-muted-foreground">Aktifkan agar setiap pesanan masuk langsung berstatus COOKING otomatis.</p>
          </div>
          <input
            v-model="form.auto_confirm"
            type="checkbox"
            class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
          >
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-3">
          <UiButton
            variant="secondary"
            class="flex-1"
            :disabled="actionLoading"
            @click="showAddModal = false"
          >
            Batal
          </UiButton>
          <UiButton
            class="flex-1"
            :disabled="actionLoading"
            @click="handleAddMerchant"
          >
            {{ actionLoading ? 'Menyimpan...' : 'Daftarkan Merchant' }}
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Edit Merchant Modal -->
    <UiModal v-model:open="showEditModal" title="Edit Detail Merchant">
      <div class="space-y-4 p-1">
        <!-- Store Name -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nama Merchant/Toko</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Masukkan nama restoran/toko"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi singkat</label>
          <textarea
            v-model="form.description"
            placeholder="Deskripsi spesialisasi kuliner/layanan..."
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all min-h-[60px]"
          />
        </div>

        <!-- Address -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Alamat Lengkap Toko</label>
          <textarea
            v-model="form.address"
            placeholder="Jalan, Blok, Detail Gedung..."
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all min-h-[60px]"
          />
        </div>

        <!-- Coordinates -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Latitude</label>
            <input
              v-model="form.latitude"
              type="number"
              step="0.000000000000001"
              placeholder="-6.2088"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Longitude</label>
            <input
              v-model="form.longitude"
              type="number"
              step="0.000000000000001"
              placeholder="106.8456"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>
        </div>

        <!-- Category & Queue Limit -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Kategori</label>
            <select
              v-model="form.category"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
              <option value="food">Makanan / Food</option>
              <option value="laundry">Laundry</option>
              <option value="mart">Belanja / Mart</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Maksimal Antrean Aktif</label>
            <input
              v-model="form.max_active_orders"
              type="number"
              placeholder="5"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-3">
          <UiButton
            variant="secondary"
            class="flex-1"
            :disabled="actionLoading"
            @click="showEditModal = false"
          >
            Batal
          </UiButton>
          <UiButton
            class="flex-1"
            :disabled="actionLoading"
            @click="handleEditMerchant"
          >
            {{ actionLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
