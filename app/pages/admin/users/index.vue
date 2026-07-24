<script setup lang="ts">
import { Users, Search, ShieldCheck, ShieldX, ShieldAlert, Star, Eye, RefreshCw, Plus } from '@lucide/vue'
import type { AdminUser } from '~/stores/users'

definePageMeta({
  layout: 'admin',
})

const usersStore = useUsersStore()
const { success, error } = useToast()

const searchQuery = ref('')
const selectedUser = ref<AdminUser | null>(null)
const showDetail = ref(false)
const showAddModal = ref(false)

const addForm = ref({
  name: '',
  email: '',
  whatsapp_number: '',
  role: ROLE_REQUESTER,
  password: '',
  is_verified: false,
  admin_password: '',
})

const openAddModal = () => {
  addForm.value = {
    name: '',
    email: '',
    whatsapp_number: '',
    role: ROLE_REQUESTER,
    password: '',
    is_verified: false,
    admin_password: '',
  }
  showAddModal.value = true
}

const handleAddUser = async () => {
  if (!addForm.value.name || !addForm.value.email || !addForm.value.whatsapp_number || !addForm.value.password || !addForm.value.admin_password) {
    error('Semua data dan password konfirmasi admin wajib diisi.')
    return
  }
  try {
    const ok = await usersStore.createUser(addForm.value)
    if (ok) {
      success(`User ${addForm.value.name} berhasil ditambahkan.`)
      showAddModal.value = false
    }
  } catch (err) {
    const errorObj = err as { data?: { message?: string } }
    const msg = errorObj?.data?.message || 'Gagal menambahkan user. Pastikan data benar dan password admin valid.'
    error(msg)
    showAddModal.value = false
  }
}

onMounted(() => {
  usersStore.fetchUsers()
})

const roleOptions = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: ROLE_ADMIN },
  { label: 'Runner', value: ROLE_RUNNER },
  { label: 'Requester', value: ROLE_REQUESTER },
  { label: 'Merchant', value: ROLE_MERCHANT },
]

const verifiedOptions = [
  { label: 'All Status', value: '' },
  { label: 'Verified', value: 'true' },
  { label: 'Unverified', value: 'false' },
]

const displayedUsers = computed(() => {
  if (!searchQuery.value.trim()) return usersStore.users
  const q = searchQuery.value.toLowerCase()
  return usersStore.users.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  )
})

const openDetail = (user: AdminUser) => {
  selectedUser.value = user
  showDetail.value = true
}

const handleQuickVerify = async (user: AdminUser) => {
  const newVal = !user.is_verified
  const ok = await usersStore.verifyUser(user.id, newVal)
  if (ok) {
    success(`${user.name} ${newVal ? 'verified' : 'unverified'}`)
  }
}

const roleVariant = (role: string) => {
  if (role === ROLE_ADMIN) return 'destructive'
  if (role === ROLE_RUNNER) return 'info'
  if (role === ROLE_MERCHANT) return 'default'
  return 'secondary'
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">User Management</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Manage and moderate all user accounts on the platform.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UiButton
          variant="primary"
          size="sm"
          @click="openAddModal"
        >
          <Plus class="w-4 h-4 mr-2" />
          Tambah Pengguna
        </UiButton>
        <UiButton
          variant="secondary"
          size="sm"
          :loading="usersStore.loading"
          @click="usersStore.fetchUsers()"
        >
          <RefreshCw class="w-4 h-4 mr-2" />
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Toolbar: Search + Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Search -->
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search name or email…"
          class="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
        >
      </div>

      <!-- Filters -->
      <div class="flex gap-2 flex-wrap">
        <select
          :value="usersStore.filters.role"
          class="h-10 rounded-md border border-input bg-background/50 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer"
          @change="usersStore.setFilter('role', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <select
          :value="usersStore.filters.is_verified"
          class="h-10 rounded-md border border-input bg-background/50 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer"
          @change="usersStore.setFilter('is_verified', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in verifiedOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Table Card -->
    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <!-- Loading Skeleton -->
      <div v-if="usersStore.loading" class="divide-y divide-border/50 bg-card">
        <div class="flex items-center gap-4 px-5 py-3 bg-muted/40">
          <div class="h-3 bg-muted rounded w-20" />
          <div class="h-3 bg-muted rounded w-24 ml-auto hidden md:block" />
          <div class="h-3 bg-muted rounded w-16 hidden lg:block" />
          <div class="h-3 bg-muted rounded w-12 hidden lg:block" />
          <div class="h-3 bg-muted rounded w-14 hidden xl:block" />
          <div class="h-3 bg-muted rounded w-16" />
        </div>
        <div v-for="i in 6" :key="i" class="flex items-center gap-4 px-5 py-4 animate-pulse">
          <div class="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
          <div class="flex-1 space-y-1.5 min-w-0">
            <div class="h-3 bg-muted rounded w-32" />
            <div class="h-2.5 bg-muted/60 rounded w-48" />
          </div>
          <div class="h-5 bg-muted rounded-full w-16 hidden md:block" />
          <div class="h-5 bg-muted rounded-full w-14 hidden lg:block" />
          <div class="h-4 bg-muted rounded w-8 hidden lg:block" />
          <div class="flex gap-2 ml-auto">
            <div class="h-8 bg-muted rounded w-8" />
            <div class="h-8 bg-muted rounded w-16" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="displayedUsers.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center gap-3"
      >
        <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Users class="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p class="font-semibold text-foreground">No users found</p>
          <p class="text-sm text-muted-foreground mt-0.5">Try adjusting your search or filters</p>
        </div>
      </div>

      <!-- Data Table -->
      <template v-else>
        <UiTable>
          <UiTableHeader>
            <UiTableRow :header="true">
              <UiTableHead>User</UiTableHead>
              <UiTableHead class="hidden md:table-cell">Role</UiTableHead>
              <UiTableHead class="hidden lg:table-cell">Status</UiTableHead>
              <UiTableHead class="hidden lg:table-cell">Trust Score</UiTableHead>
              <UiTableHead class="hidden xl:table-cell">Joined</UiTableHead>
              <UiTableHead class="text-right">Actions</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="user in displayedUsers" :key="user.id" :class="{'bg-destructive/5': user.is_suspended}">
              <!-- User -->
              <UiTableCell>
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20"
                  >
                    {{ user.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="font-medium text-foreground text-[13px] leading-tight truncate">
                        {{ user.name }}
                      </p>
                      <ShieldAlert v-if="user.is_suspended" class="w-3.5 h-3.5 text-destructive" title="User is suspended" />
                    </div>
                    <p class="text-xs text-muted-foreground truncate mt-0.5">
                      {{ user.email }}
                    </p>
                  </div>
                </div>
              </UiTableCell>

              <!-- Role -->
              <UiTableCell class="hidden md:table-cell">
                <UiBadge :variant="roleVariant(user.role)">{{ user.role }}</UiBadge>
              </UiTableCell>

              <!-- Status -->
              <UiTableCell class="hidden lg:table-cell">
                <div class="flex flex-col gap-1">
                  <UiBadge :variant="user.is_verified ? 'success' : 'warning'">
                    {{ user.is_verified ? 'Verified' : 'Unverified' }}
                  </UiBadge>
                  <UiBadge v-if="user.is_suspended" variant="destructive" class="w-fit text-[10px] py-0 px-1">
                    Suspended
                  </UiBadge>
                </div>
              </UiTableCell>

              <!-- Trust Score -->
              <UiTableCell class="hidden lg:table-cell">
                <div class="flex items-center gap-1.5">
                  <Star class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span class="font-semibold text-[13px]">{{ user.trust_score }}</span>
                </div>
              </UiTableCell>

              <!-- Joined -->
              <UiTableCell class="hidden xl:table-cell">
                <span class="text-xs text-muted-foreground">{{ formatDate(user.created_at) }}</span>
              </UiTableCell>

              <!-- Actions -->
              <UiTableCell>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    class="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                    :title="user.is_verified ? 'Unverify user' : 'Verify user'"
                    :disabled="usersStore.actionLoading"
                    @click="handleQuickVerify(user)"
                  >
                    <ShieldCheck v-if="user.is_verified" class="w-4 h-4 text-emerald-500" />
                    <ShieldX v-else class="w-4 h-4 text-muted-foreground" />
                  </button>
                  <UiButton variant="secondary" size="sm" @click="openDetail(user)">
                    <Eye class="w-3.5 h-3.5 mr-1.5" />
                    Detail
                  </UiButton>
                </div>
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>

        <!-- Table Footer -->
        <div class="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
          <p class="text-xs text-muted-foreground">
            Showing
            <span class="font-semibold text-foreground">{{ displayedUsers.length }}</span>
            of
            <span class="font-semibold text-foreground">{{ usersStore.users.length }}</span>
            users
          </p>
        </div>
      </template>
    </div>


    <!-- User Detail Modal -->
    <AdminUserDetailModal
      v-model:open="showDetail"
      :user="selectedUser"
      @updated="usersStore.fetchUsers()"
    />

    <!-- Add User Modal -->
    <UiModal v-model:open="showAddModal" title="Tambah Pengguna Baru">
      <div class="space-y-4 p-1 max-h-[75vh] overflow-y-auto">
        <!-- Name -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nama Lengkap</label>
          <input
            v-model="addForm.name"
            type="text"
            placeholder="Masukkan nama lengkap"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Email -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Email</label>
          <input
            v-model="addForm.email"
            type="email"
            placeholder="nama@email.com"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- WhatsApp -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Nomor WhatsApp</label>
          <input
            v-model="addForm.whatsapp_number"
            type="text"
            placeholder="628123456789"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Role -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Role / Hak Akses</label>
          <select
            v-model="addForm.role"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer"
          >
            <option :value="ROLE_REQUESTER">Requester (Penitip)</option>
            <option :value="ROLE_RUNNER">Runner (Jasa Titip)</option>
            <option :value="ROLE_ADMIN">Admin (Pengelola)</option>
            <option :value="ROLE_MERCHANT">Merchant (Mitra Toko)</option>
          </select>
        </div>

        <!-- Password -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold text-muted-foreground uppercase">Password Pengguna Baru</label>
          <input
            v-model="addForm.password"
            type="password"
            placeholder="Minimal 8 karakter"
            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
          >
        </div>

        <!-- Is Verified Toggle -->
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div class="space-y-0.5">
            <p class="text-xs font-bold text-slate-700">Verifikasi Langsung</p>
            <p class="text-[10px] text-muted-foreground">Aktifkan untuk langsung memverifikasi akun ini.</p>
          </div>
          <input
            v-model="addForm.is_verified"
            type="checkbox"
            class="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
          >
        </div>

        <!-- Admin Password (Authorization) -->
        <div class="space-y-1 border-t border-slate-100 pt-3">
          <label class="text-[10px] font-bold text-destructive uppercase">Konfirmasi Password Admin Anda</label>
          <input
            v-model="addForm.admin_password"
            type="password"
            placeholder="Masukkan password admin Anda"
            class="h-9 w-full rounded-md border border-destructive bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive transition-all"
          >
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-3">
          <UiButton
            class="flex-1"
            variant="secondary"
            :disabled="usersStore.actionLoading"
            @click="showAddModal = false"
          >
            Batal
          </UiButton>
          <UiButton
            class="flex-1"
            variant="primary"
            :loading="usersStore.actionLoading"
            @click="handleAddUser"
          >
            Tambah Pengguna
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
