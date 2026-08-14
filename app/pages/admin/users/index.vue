<script setup lang="ts">
import { Users, Search, ShieldCheck, ShieldX, ShieldAlert, Star, Eye, RefreshCw, Plus, Copy, AlertCircle } from '@lucide/vue'
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
const activeSection = ref('all') // 'all', 'product', 'admin'

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
    error('Mohon lengkapi seluruh kolom profil beserta kata sandi Admin Anda.')
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

// Invite Partner States & Actions
const showInviteModal = ref(false)
const inviteForm = ref({
  phone_number: '',
  role: ROLE_RUNNER,
})
const generatedLink = ref<string | null>(null)
const isGenerating = ref(false)
const inviteErrorMsg = ref('')

const openInviteModal = () => {
  inviteForm.value = {
    phone_number: '',
    role: ROLE_RUNNER,
  }
  generatedLink.value = null
  inviteErrorMsg.value = ''
  showInviteModal.value = true
}

const handleGenerateInvite = async () => {
  if (!inviteForm.value.phone_number) {
    inviteErrorMsg.value = 'Mohon masukkan nomor WhatsApp penerima.'
    return
  }
  isGenerating.value = true
  inviteErrorMsg.value = ''
  try {
    const res = await usersStore.createInvitation(inviteForm.value)
    if (res && res.token) {
      // Menentukan base URL website profile
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://nihtip.com'
      generatedLink.value = `${baseUrl}/join/${inviteForm.value.role}?token=${res.token}`
      success('Link undangan pendaftaran berhasil dibuat!')
    } else {
      inviteErrorMsg.value = 'Gagal membuat undangan pendaftaran.'
    }
  } catch (err: any) {
    inviteErrorMsg.value = err.data?.message || 'Gagal membuat undangan pendaftaran.'
  } finally {
    isGenerating.value = false
  }
}

const copyInviteLink = () => {
  if (generatedLink.value) {
    navigator.clipboard.writeText(generatedLink.value)
    success('Tautan undangan berhasil disalin!')
  }
}

const getInvitationMessage = () => {
  const roleName = inviteForm.value.role === ROLE_RUNNER ? 'Runner (Jasa Titip / Driver)' : 'Merchant (Mitra Toko / Warung)'
  return `Halo! Anda diundang untuk bergabung sebagai ${roleName} di Nitip. Silakan melakukan pendaftaran melalui tautan resmi berikut:\n\n${generatedLink.value}`
}

const getWhatsAppShareLink = () => {
  if (!generatedLink.value) return '#'
  let phone = inviteForm.value.phone_number.replace(/\D/g, '')
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1)
  }
  const text = encodeURIComponent(getInvitationMessage())
  return `https://wa.me/${phone}?text=${text}`
}

const copyFullMessage = () => {
  const msg = getInvitationMessage()
  navigator.clipboard.writeText(msg)
  success('Pesan undangan berhasil disalin!')
}

onMounted(() => {
  usersStore.fetchUsers()
})

const roleOptions = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: ROLE_ADMIN },
  { label: 'CS (Customer Support)', value: ROLE_CS },
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
  let list = usersStore.users

  // Section Tabs Filter
  if (activeSection.value === 'product') {
    list = list.filter(u => [ROLE_REQUESTER, ROLE_RUNNER, ROLE_MERCHANT].includes(u.role))
  } else if (activeSection.value === 'admin') {
    list = list.filter(u => [ROLE_ADMIN, ROLE_CS].includes(u.role))
  }

  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(
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
    success(`Status verifikasi ${user.name} berhasil diperbarui.`)
  }
}

const roleVariant = (role: string) => {
  if (role === ROLE_ADMIN) return 'destructive'
  if (role === ROLE_CS) return 'warning'
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
          variant="secondary"
          size="sm"
          @click="openInviteModal"
        >
          <Plus class="w-4 h-4 mr-2" />
          Undang Partner
        </UiButton>
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

    <!-- Segmented Tabs for Section Separation -->
    <div class="flex p-1 bg-slate-100 rounded-xl max-w-md">
      <button
        type="button"
        class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
        :class="activeSection === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
        @click="activeSection = 'all'"
      >
        Semua Pengguna
      </button>
      <button
        type="button"
        class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
        :class="activeSection === 'product' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
        @click="activeSection = 'product'"
      >
        Pengguna Produk
      </button>
      <button
        type="button"
        class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
        :class="activeSection === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
        @click="activeSection = 'admin'"
      >
        Staf Administratif
      </button>
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
            <option :value="ROLE_CS">CS (Customer Service)</option>
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

    <!-- Invite Partner Modal -->
    <UiModal v-model:open="showInviteModal" title="Undang Mitra Baru (Runner/Merchant)">
      <div class="space-y-4 p-1">
        
        <template v-if="generatedLink">
          <div class="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3">
            <p class="text-xs font-semibold text-emerald-800 leading-relaxed">
              Tautan undangan pendaftaran berhasil dibuat! Tautan ini bersifat rahasia, sekali pakai, dan kedaluwarsa dalam 7 hari.
            </p>
            
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">Tautan Pendaftaran</label>
              <div class="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg p-2.5">
                <span class="text-xs font-mono text-slate-600 truncate flex-1">{{ generatedLink }}</span>
                <button 
                  type="button" 
                  @click="copyInviteLink"
                  class="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition"
                  title="Salin tautan"
                >
                  <Copy class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="space-y-1 pt-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">Pesan Undangan WhatsApp</label>
              <div class="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                {{ getInvitationMessage() }}
              </div>
            </div>
            
            <div class="flex gap-2 pt-2">
              <a 
                :href="getWhatsAppShareLink()" 
                target="_blank"
                class="flex-1 h-10 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
              >
                <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-2.281c1.554.92 2.85 1.403 4.693 1.404 5.334 0 9.674-4.34 9.678-9.686.002-2.589-1.01-5.021-2.853-6.865C16.524 4.727 14.093 3.71 11.5 3.71c-5.341 0-9.681 4.34-9.685 9.686-.001 1.83.493 3.226 1.439 4.7l-.988 3.604 3.791-.989zM15.82 17.5c-.279-.139-1.65-.815-1.905-.907-.256-.092-.442-.139-.628.139-.186.279-.722.907-.885 1.093-.163.186-.326.209-.605.07-1.121-.56-2.01-.986-2.754-2.281-.19-.331-.383-.663-.047-.969.301-.274.605-.628.756-.837.151-.209.201-.349.302-.558.101-.209.05-.395-.025-.535-.075-.14-0.628-1.512-.86-2.07-.224-.544-.451-.471-.628-.48-.163-.008-.349-.01-.535-.01-.186 0-.489.07-.745.349-.256.279-.977.953-.977 2.325s.999 2.697 1.139 2.883c.14.186 1.968 3.005 4.767 4.21 2.05.883 2.946.993 4.029.832.612-.092 1.65-.674 1.882-1.325.233-.651.233-1.209.163-1.325-.07-.116-.256-.209-.535-.349z"/>
                </svg>
                Kirim via WhatsApp
              </a>
              <button 
                type="button" 
                @click="copyFullMessage"
                class="flex-1 h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Copy class="w-4 h-4" />
                Salin Pesan
              </button>
            </div>
            
            <p class="text-[10px] text-emerald-600/80">
              * Tautan pendaftaran secara otomatis mengunci nomor WhatsApp tujuan.
            </p>
          </div>

          <div class="pt-2">
            <UiButton
              class="w-full"
              variant="secondary"
              @click="showInviteModal = false"
            >
              Tutup
            </UiButton>
          </div>
        </template>

        <template v-else>
          <!-- Local Error Message -->
          <div v-if="inviteErrorMsg" class="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 text-xs mb-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ inviteErrorMsg }}</span>
          </div>

          <!-- WhatsApp -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Nomor WhatsApp Tujuan</label>
            <input
              v-model="inviteForm.phone_number"
              type="text"
              placeholder="Contoh: 0881088xxx atau 6281088xxx"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
            >
          </div>

          <!-- Role -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Peran (Role) Kemitraan</label>
            <select
              v-model="inviteForm.role"
              class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all cursor-pointer"
            >
              <option :value="ROLE_RUNNER">Runner (Jasa Titip / Driver)</option>
              <option :value="ROLE_MERCHANT">Merchant (Mitra Toko / Warung)</option>
            </select>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3 pt-3">
            <UiButton
              class="flex-1"
              variant="secondary"
              :disabled="isGenerating"
              @click="showInviteModal = false"
            >
              Batal
            </UiButton>
            <UiButton
              class="flex-1"
              variant="primary"
              :loading="isGenerating"
              @click="handleGenerateInvite"
            >
              Generate Link Undangan
            </UiButton>
          </div>
        </template>

      </div>
    </UiModal>
  </div>
</template>
