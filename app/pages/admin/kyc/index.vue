<script setup lang="ts">
import { ShieldCheck, Eye, RefreshCw, X, Check } from 'lucide-vue-next'
import { useKycStore, type KycSubmission } from '~/stores/kyc'
import { useUsersStore } from '~/stores/users'
import { useToast } from '~/stores/toast'

definePageMeta({
  layout: 'admin',
})

const kycStore = useKycStore()
const usersStore = useUsersStore()
const { success, error } = useToast()

const selectedSubmission = ref<KycSubmission | null>(null)
const showReviewModal = ref(false)
const approvedDecision = ref(true)
const reviewNote = ref('')

const fetchAllData = async () => {
  await Promise.all([
    kycStore.fetchPendingKyc(),
    usersStore.fetchUsers()
  ])
}

onMounted(() => {
  fetchAllData()
})

const getUserDetails = (userId: string) => {
  const u = usersStore.users.find((user) => user.id === userId)
  return u ? { name: u.name, email: u.email } : { name: 'Runner Baru', email: 'N/A' }
}

const openReview = (sub: KycSubmission) => {
  selectedSubmission.value = sub
  approvedDecision.value = true
  reviewNote.value = ''
  showReviewModal.value = true
}

const handleReviewSubmit = async () => {
  if (!selectedSubmission.value) return
  const ok = await kycStore.reviewKyc(selectedSubmission.value.id, approvedDecision.value, reviewNote.value)
  if (ok) {
    success(approvedDecision.value ? 'Pengajuan KYC disetujui!' : 'Pengajuan KYC ditolak.')
    showReviewModal.value = false
    selectedSubmission.value = null
  } else {
    error('Gagal mengirim ulasan KYC. Silakan coba lagi.')
  }
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">KYC Submissions</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Tinjau dokumen KTP dan foto selfie untuk menyetujui akun Runner.
        </p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="kycStore.loading"
        @click="fetchAllData"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </UiButton>
    </div>

    <!-- Data Table Card -->
    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <!-- Loading Skeleton -->
      <div v-if="kycStore.loading" class="divide-y divide-border/50 bg-card p-4 space-y-4">
        <div v-for="i in 3" :key="i" class="h-12 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      <!-- Empty State -->
      <div
        v-else-if="kycStore.submissions.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center gap-3"
      >
        <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <ShieldCheck class="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p class="font-semibold text-foreground">Tidak ada antrean KYC pending</p>
          <p class="text-sm text-muted-foreground mt-0.5">Semua pengajuan telah diproses.</p>
        </div>
      </div>

      <!-- Submissions Table -->
      <template v-else>
        <UiTable>
          <UiTableHeader>
            <UiTableRow :header="true">
              <UiTableHead>Nama Runner</UiTableHead>
              <UiTableHead>Nomor KTP</UiTableHead>
              <UiTableHead>Tanggal Pengajuan</UiTableHead>
              <UiTableHead class="text-right">Aksi</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow v-for="sub in kycStore.submissions" :key="sub.id">
              <UiTableCell>
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {{ getUserDetails(sub.user_id).name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-medium text-foreground text-[13px] leading-tight">
                      {{ getUserDetails(sub.user_id).name }}
                    </p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {{ getUserDetails(sub.user_id).email }}
                    </p>
                  </div>
                </div>
              </UiTableCell>
              <UiTableCell class="font-mono text-xs font-semibold">
                {{ sub.id_card_number }}
              </UiTableCell>
              <UiTableCell class="text-xs text-muted-foreground">
                {{ formatDate(sub.created_at) }}
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center justify-end">
                  <UiButton variant="primary" size="sm" @click="openReview(sub)">
                    <Eye class="w-3.5 h-3.5 mr-1.5" />
                    Tinjau Dokumen
                  </UiButton>
                </div>
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>
      </template>
    </div>

    <!-- Review Modal -->
    <UiModal v-model:open="showReviewModal" title="Tinjau Berkas KYC Runner">
      <div v-if="selectedSubmission" class="space-y-6 p-1 max-h-[70vh] overflow-y-auto">
        <!-- Runner details -->
        <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p class="font-bold text-muted-foreground uppercase text-[10px]">Nama Lengkap</p>
            <p class="font-semibold text-slate-800 text-[13px] mt-0.5">{{ getUserDetails(selectedSubmission.user_id).name }}</p>
          </div>
          <div>
            <p class="font-bold text-muted-foreground uppercase text-[10px]">Nomor KTP</p>
            <p class="font-mono font-semibold text-slate-800 text-[13px] mt-0.5">{{ selectedSubmission.id_card_number }}</p>
          </div>
        </div>

        <!-- Image Previews -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Foto KTP</label>
            <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 h-52 flex items-center justify-center">
              <img 
                :src="selectedSubmission.id_card_image_url" 
                alt="ID Card" 
                class="w-full h-full object-contain"
              >
            </div>
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Foto Selfie</label>
            <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 h-52 flex items-center justify-center">
              <img 
                :src="selectedSubmission.selfie_image_url" 
                alt="Selfie" 
                class="w-full h-full object-contain"
              >
            </div>
          </div>
        </div>

        <!-- Review Decision -->
        <div class="space-y-4 border-t border-slate-100 pt-5">
          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Keputusan Admin</label>
            <div class="grid grid-cols-2 gap-3">
              <button 
                :class="[
                  'py-3 border rounded-xl text-center transition-all flex items-center justify-center gap-2 font-bold text-xs',
                  approvedDecision ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border/60 text-muted-foreground'
                ]"
                @click="approvedDecision = true"
              >
                <Check class="w-4 h-4" />
                Setujui Dokumen
              </button>

              <button 
                :class="[
                  'py-3 border rounded-xl text-center transition-all flex items-center justify-center gap-2 font-bold text-xs',
                  !approvedDecision ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border/60 text-muted-foreground'
                ]"
                @click="approvedDecision = false"
              >
                <X class="w-4 h-4" />
                Tolak Dokumen
              </button>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[10px] font-bold text-muted-foreground uppercase">Catatan / Alasan Penolakan</label>
            <textarea
              v-model="reviewNote"
              rows="3"
              placeholder="Berikan keterangan atau alasan jika dokumen ditolak..."
              class="w-full text-xs p-3 border border-input rounded-2xl bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <!-- Submit actions -->
        <div class="flex items-center gap-3 pt-3">
          <UiButton
            class="flex-1"
            variant="secondary"
            @click="showReviewModal = false"
          >
            Batal
          </UiButton>
          <UiButton
            class="flex-1"
            variant="primary"
            :loading="kycStore.actionLoading"
            @click="handleReviewSubmit"
          >
            Kirim Keputusan
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
