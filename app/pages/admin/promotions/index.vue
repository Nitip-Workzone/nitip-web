<script setup lang="ts">
import { TicketPercent, Search, Plus, RefreshCw, Edit, Trash2, Eye, ShieldAlert, Store } from '@lucide/vue'
import { usePromotionsStore, type Promotion } from '~/stores/promotions'
import { useMerchantsStore } from '~/stores/merchants'

definePageMeta({ layout: 'admin' })

const promotionsStore = usePromotionsStore()
const merchantsStore = useMerchantsStore()
const { success, error: toastError } = useToast()

const searchQuery = ref('')
const filterMerchant = ref('')
const filterActive = ref(true) // show active by default
const filterFirstPurchase = ref(false)

const showAddModal = ref(false)
const showEditModal = ref(false)
const showUsagesModal = ref(false)
const showSecureModal = ref(false)
const secureAction = ref<'create' | 'update' | 'delete'>('create')
const secureLoading = ref(false)

const actionLoading = ref(false)
const editId = ref('')
const previewLoading = ref(false)

const form = ref({
  title: '',
  description: '',
  code: '',
  merchant_id: '' as string | null,
  discount_type: 'flat' as 'flat' | 'percent',
  discount_value: 5000,
  budget_total: 100000,
  max_uses: 15,
  per_user_limit: 1,
  first_purchase_only: false,
  discount_scope: 'item' as 'item' | 'delivery' | 'total',
  min_order_amount: 0,
  auto_apply: false,
  valid_from: '' as string | null,
  valid_until: '' as string | null,
})

const secureForm = ref({
  admin_password: '',
  totp_code: '',
})

const usagesPromotionId = ref('')

const filteredPromotions = computed(() => {
  let list = promotionsStore.promotions
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => (p.title?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q) || p.merchant_name?.toLowerCase().includes(q)))
  }
  return list
})

const totalLiability = computed(() => promotionsStore.settlements?.total_liability ?? 0)

onMounted(async () => {
  await Promise.all([
    promotionsStore.fetchAdminPromotions({ is_active: filterActive.value ? true : undefined, limit: 50 }),
    merchantsStore.adminFetchAllMerchants(),
    promotionsStore.fetchSettlements(),
  ])
})

async function refresh() {
  await promotionsStore.fetchAdminPromotions({
    merchant_id: filterMerchant.value || undefined,
    is_active: filterActive.value ? true : undefined,
    search: searchQuery.value || undefined,
    first_purchase_only: filterFirstPurchase.value ? true : undefined,
    limit: 50,
  })
  await promotionsStore.fetchSettlements()
}

function openAdd() {
  form.value = {
    title: '',
    description: '',
    code: '',
    merchant_id: null,
    discount_type: 'flat',
    discount_value: 5000,
    budget_total: 100000,
    max_uses: 15,
    per_user_limit: 1,
    first_purchase_only: false,
    discount_scope: 'item',
    min_order_amount: 0,
    auto_apply: false,
    valid_from: null,
    valid_until: null,
  }
  secureForm.value = { admin_password: '', totp_code: '' }
  showAddModal.value = true
  triggerPreview()
}

function openEdit(p: Promotion) {
  editId.value = p.id
  form.value = {
    title: p.title,
    description: p.description || '',
    code: p.code || '',
    merchant_id: p.merchant_id || null,
    discount_type: p.discount_type,
    discount_value: p.discount_value,
    budget_total: p.budget_total,
    max_uses: p.max_uses,
    per_user_limit: p.per_user_limit,
    first_purchase_only: p.first_purchase_only,
    discount_scope: p.discount_scope as any,
    min_order_amount: p.min_order_amount,
    auto_apply: p.auto_apply,
    valid_from: p.valid_from ? p.valid_from.slice(0,16) : null,
    valid_until: p.valid_until ? p.valid_until.slice(0,16) : null,
  }
  secureForm.value = { admin_password: '', totp_code: '' }
  showEditModal.value = true
  triggerPreview()
}

watch(() => form.value.merchant_id, () => triggerPreview())
watch(() => form.value.budget_total, () => triggerPreview())
watch(() => form.value.max_uses, () => triggerPreview())
watch(() => form.value.discount_type, () => triggerPreview())
watch(() => form.value.discount_value, () => triggerPreview())

async function triggerPreview() {
  if (!form.value.budget_total || !form.value.max_uses) return
  previewLoading.value = true
  try {
    await promotionsStore.calculatePreview({
      budget_total: Number(form.value.budget_total),
      max_uses: Number(form.value.max_uses),
      merchant_id: form.value.merchant_id || null,
      discount_type: form.value.discount_type,
      discount_value: Number(form.value.discount_value),
    })
  } catch {}
  finally { previewLoading.value = false }
}

function validateCodeFormat(code: string): boolean {
  if (!code) return true // optional for auto
  return /^[A-Za-z0-9_-]{3,50}$/.test(code)
}

async function handleCreate() {
  if (!form.value.title || form.value.title.length < 3) {
    toastError('Judul minimal 3 karakter')
    return
  }
  if (form.value.code && !validateCodeFormat(form.value.code)) {
    toastError('Format kode tidak valid: 3-50 huruf angka - _ contoh Merdeka81')
    return
  }
  if (form.value.code && form.value.auto_apply) {
    toastError('Auto promo tidak boleh memiliki kode voucher')
    return
  }
  if (!form.value.code && !form.value.auto_apply) {
    toastError('Harus isi kode voucher (ex Merdeka81) atau aktifkan Auto first-N')
    return
  }
  if (!secureForm.value.admin_password || !/^\d{6}$/.test(secureForm.value.totp_code)) {
    toastError('Password admin dan TOTP 6 digit wajib')
    return
  }
  actionLoading.value = true
  try {
    await promotionsStore.createPromotion({
      title: form.value.title,
      description: form.value.description || undefined,
      code: form.value.code ? form.value.code.trim() : null,
      merchant_id: form.value.merchant_id || null,
      discount_type: form.value.discount_type,
      discount_value: Number(form.value.discount_value),
      budget_total: Number(form.value.budget_total),
      max_uses: Number(form.value.max_uses),
      per_user_limit: Number(form.value.per_user_limit) || 1,
      first_purchase_only: form.value.first_purchase_only,
      discount_scope: form.value.discount_scope,
      min_order_amount: Number(form.value.min_order_amount) || 0,
      auto_apply: form.value.auto_apply,
      valid_from: form.value.valid_from ? new Date(form.value.valid_from).toISOString() : null,
      valid_until: form.value.valid_until ? new Date(form.value.valid_until).toISOString() : null,
      admin_password: secureForm.value.admin_password,
      totp_code: secureForm.value.totp_code,
    })
    success('Promo berhasil dibuat')
    showAddModal.value = false
  } catch (e: any) {
    toastError(e?.data?.message || e?.message || 'Gagal membuat promo')
  } finally { actionLoading.value = false }
}

async function handleUpdate() {
  if (!secureForm.value.admin_password || !/^\d{6}$/.test(secureForm.value.totp_code)) {
    toastError('Password admin dan TOTP wajib')
    return
  }
  actionLoading.value = true
  try {
    await promotionsStore.updatePromotion(editId.value, {
      title: form.value.title,
      description: form.value.description || undefined,
      code: form.value.code ? form.value.code.trim() : null,
      merchant_id: form.value.merchant_id || null,
      discount_type: form.value.discount_type,
      discount_value: Number(form.value.discount_value),
      budget_total: Number(form.value.budget_total),
      max_uses: Number(form.value.max_uses),
      per_user_limit: Number(form.value.per_user_limit),
      first_purchase_only: form.value.first_purchase_only,
      discount_scope: form.value.discount_scope,
      min_order_amount: Number(form.value.min_order_amount) || 0,
      auto_apply: form.value.auto_apply,
      valid_from: form.value.valid_from ? new Date(form.value.valid_from).toISOString() : null,
      valid_until: form.value.valid_until ? new Date(form.value.valid_until).toISOString() : null,
      admin_password: secureForm.value.admin_password,
      totp_code: secureForm.value.totp_code,
    })
    success('Promo berhasil diperbarui')
    showEditModal.value = false
  } catch (e: any) {
    toastError(e?.data?.message || e?.message || 'Gagal update promo')
  } finally { actionLoading.value = false }
}

async function handleDelete(p: Promotion) {
  if (!confirm(`Hapus promo ${p.title} (${p.code || 'AUTO'})? Jika sudah dipakai akan dinonaktifkan.`)) return
  const admin_password = prompt('Password admin:')
  const totp_code = prompt('Kode TOTP 6 digit:')
  if (!admin_password || !totp_code) return
  actionLoading.value = true
  try {
    await promotionsStore.deletePromotion(p.id, { admin_password, totp_code })
    success('Promo dihapus/nonaktifkan')
  } catch (e: any) {
    toastError(e?.data?.message || e?.message || 'Gagal hapus')
  } finally { actionLoading.value = false }
}

async function openUsages(p: Promotion) {
  usagesPromotionId.value = p.id
  await promotionsStore.fetchUsages(p.id, 0, 20)
  showUsagesModal.value = true
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function badgeDiscount(p: Promotion) {
  if (p.discount_type === 'flat') return formatRp(p.discount_value)
  return `${p.discount_value}% OFF`
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <TicketPercent class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold">Promosi / Diskon</h1>
          <p class="text-sm text-muted-foreground">Kelola kode voucher custom ex Merdeka81, auto first-N, flat/persen, first purchase only, audit settlement ke merchant</p>
        </div>
      </div>
      <div class="flex gap-2">
        <UiButton variant="secondary" @click="refresh"><RefreshCw class="w-4 h-4 mr-2" />Refresh</UiButton>
        <UiButton variant="primary" @click="openAdd"><Plus class="w-4 h-4 mr-2" />Buat Promo</UiButton>
      </div>
    </div>

    <!-- Settlement summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UiCard class="p-4">
        <p class="text-xs text-muted-foreground">Total Liability Platform ke Merchant</p>
        <p class="text-lg font-bold">{{ formatRp(totalLiability) }}</p>
        <p class="text-xs text-muted-foreground mt-1">{{ promotionsStore.settlements?.total_orders ?? 0 }} order berdiskon (completed)</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-xs text-muted-foreground">Per Merchant</p>
        <div class="mt-2 space-y-1 max-h-24 overflow-y-auto">
          <div v-for="it in promotionsStore.settlements?.items || []" :key="it.merchant_id || 'global'" class="flex justify-between text-sm">
            <span class="truncate">{{ it.merchant_name || 'Global' }}</span>
            <span class="font-medium">{{ formatRp(it.total_liability) }} ({{ it.order_count }})</span>
          </div>
          <p v-if="!(promotionsStore.settlements?.items?.length)" class="text-xs text-muted-foreground">Belum ada settlement</p>
        </div>
      </UiCard>
      <UiCard class="p-4 bg-amber-50 border-amber-200">
        <p class="text-xs font-medium text-amber-800">Info Budget</p>
        <p class="text-xs text-amber-700 mt-1">Budget hanya audit & batas maksimal, tidak potong saldo sistem. Merchant tetap dapat full. Admin wajib bayar liability ke merchant sesuai settlement.</p>
      </UiCard>
    </div>

    <!-- Filters -->
    <UiCard class="p-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-[200px]">
          <label class="text-xs font-medium">Search kode/title ex Merdeka81</label>
          <div class="relative mt-1">
            <Search class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input v-model="searchQuery" placeholder="Cari kode atau judul..." class="w-full h-9 pl-9 pr-3 rounded-md border border-input text-sm" @keyup.enter="refresh" />
          </div>
        </div>
        <div class="min-w-[200px]">
          <label class="text-xs font-medium">Merchant</label>
          <select v-model="filterMerchant" class="mt-1 w-full h-9 rounded-md border border-input px-3 text-sm">
            <option value="">Semua merchant</option>
            <option v-for="m in merchantsStore.adminMerchants" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs flex items-center gap-1"><input type="checkbox" v-model="filterActive" /> Aktif saja</label>
          <label class="text-xs flex items-center gap-1"><input type="checkbox" v-model="filterFirstPurchase" /> First Purchase Only</label>
        </div>
        <UiButton size="sm" @click="refresh">Filter</UiButton>
      </div>
    </UiCard>

    <!-- Table -->
    <UiCard class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 text-xs">
            <tr>
              <th class="px-3 py-2 text-left">Kode / Auto</th>
              <th class="px-3 py-2 text-left">Merchant</th>
              <th class="px-3 py-2 text-left">Judul</th>
              <th class="px-3 py-2 text-left">Type</th>
              <th class="px-3 py-2 text-left">Budget</th>
              <th class="px-3 py-2 text-left">Kuota</th>
              <th class="px-3 py-2 text-left">Flags</th>
              <th class="px-3 py-2 text-left">Valid</th>
              <th class="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredPromotions" :key="p.id" class="border-t">
              <td class="px-3 py-2">
                <span v-if="p.code" class="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-mono font-bold">{{ p.code }}</span>
                <span v-else class="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">AUTO</span>
              </td>
              <td class="px-3 py-2 truncate max-w-[120px]">{{ p.merchant_name || (p.merchant_id ? p.merchant_id.slice(0,6) : 'Global') }}</td>
              <td class="px-3 py-2 truncate max-w-[140px]">{{ p.title }}</td>
              <td class="px-3 py-2">
                <span class="text-xs font-medium">{{ badgeDiscount(p) }}</span>
                <span class="text-[10px] text-muted-foreground ml-1">({{ p.discount_scope }})</span>
              </td>
              <td class="px-3 py-2">
                <div class="text-xs">{{ formatRp(p.budget_used) }} / {{ formatRp(p.budget_total) }}</div>
                <div class="w-full h-1.5 bg-gray-200 rounded mt-1"><div class="h-1.5 bg-amber-500 rounded" :style="{ width: Math.min(100, (p.budget_used/p.budget_total)*100).toFixed(0)+'%' }"></div></div>
              </td>
              <td class="px-3 py-2 text-xs">{{ p.used_count }} / {{ p.max_uses }}</td>
              <td class="px-3 py-2 text-[10px]">
                <span v-if="p.first_purchase_only" class="inline-flex px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 mr-1">First Buy</span>
                <span v-if="p.auto_apply" class="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-700">Auto</span>
                <span v-if="!p.is_active" class="inline-flex px-1.5 py-0.5 rounded bg-red-100 text-red-700">Off</span>
              </td>
              <td class="px-3 py-2 text-[10px]">{{ p.valid_from ? new Date(p.valid_from).toLocaleDateString('id-ID') : '-' }} - {{ p.valid_until ? new Date(p.valid_until).toLocaleDateString('id-ID') : '∞' }}</td>
              <td class="px-3 py-2 text-right">
                <div class="flex gap-1 justify-end">
                  <UiButton size="sm" variant="secondary" @click="openUsages(p)"><Eye class="w-3 h-3" /></UiButton>
                  <UiButton size="sm" variant="secondary" @click="openEdit(p)"><Edit class="w-3 h-3" /></UiButton>
                  <UiButton size="sm" variant="destructive" @click="handleDelete(p)"><Trash2 class="w-3 h-3" /></UiButton>
                </div>
              </td>
            </tr>
            <tr v-if="filteredPromotions.length===0"><td colspan="9" class="text-center py-8 text-muted-foreground text-sm">Tidak ada promo</td></tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <!-- Add Modal -->
    <UiModal v-model:open="showAddModal" size="xl">
      <template #title>Buat Promo Diskon Baru - ex Merdeka81</template>
      <div class="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="text-sm font-medium">Judul Promo *</label>
            <UiInput v-model="form.title" placeholder="Promo Merdeka - Diskon Kemerdekaan 81" class="mt-1" />
          </div>
          <div class="col-span-2">
            <label class="text-sm font-medium">Deskripsi</label>
            <textarea v-model="form.description" placeholder="Khusus 15 order pertama di merchant..." class="mt-1 w-full rounded-md border border-input p-2 text-sm min-h-[60px]" />
          </div>
          <div>
            <label class="text-sm font-medium">Kode Voucher Custom * (ex Merdeka81) - kosongkan untuk Auto</label>
            <UiInput v-model="form.code" placeholder="Merdeka81" class="mt-1 font-mono" />
            <p class="text-[10px] text-muted-foreground mt-1">3-50 karakter A-Z a-z 0-9 _ - , case-insensitive unik, tampil sesuai ketikan. Contoh: Merdeka81, NITIP20, HUTRI81_2026</p>
          </div>
          <div class="flex flex-col justify-end">
            <label class="text-sm font-medium flex items-center gap-2"><input type="checkbox" v-model="form.auto_apply" /> Auto Apply First-N (tanpa kode)</label>
            <p class="text-[10px] text-muted-foreground">Jika centang, kode wajib kosong dan promo otomatis untuk N order pertama.</p>
          </div>
          <div>
            <label class="text-sm font-medium">Merchant (opsional)</label>
            <select v-model="form.merchant_id" class="mt-1 w-full h-9 rounded-md border border-input px-3 text-sm">
              <option :value="null">Global - semua merchant</option>
              <option v-for="m in merchantsStore.adminMerchants" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium">Scope Diskon</label>
            <select v-model="form.discount_scope" class="mt-1 w-full h-9 rounded-md border border-input px-3 text-sm">
              <option value="item">Item Only (makanan saja)</option>
              <option value="delivery">Delivery Only (ongkir)</option>
              <option value="total">Total (item+ongkir)</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium">Tipe Diskon *</label>
            <select v-model="form.discount_type" class="mt-1 w-full h-9 rounded-md border border-input px-3 text-sm">
              <option value="flat">Flat Rupiah (Rp)</option>
              <option value="percent">Persentase (%)</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium">Nilai Diskon *</label>
            <UiInput v-model.number="form.discount_value" type="number" :placeholder="form.discount_type==='flat' ? '5000' : '20'" class="mt-1" />
            <p class="text-[10px] text-muted-foreground mt-1">{{ form.discount_type==='flat' ? 'Rp per order' : 'Persen 1-90%' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium">Budget Total (Audit) *</label>
            <UiInput v-model.number="form.budget_total" type="number" placeholder="100000" class="mt-1" />
            <p class="text-[10px] text-amber-700 mt-1">Budget hanya audit & batas, tidak potong saldo sistem. Contoh 100rb untuk 15 order.</p>
          </div>
          <div>
            <label class="text-sm font-medium">Max Uses (kuota) *</label>
            <UiInput v-model.number="form.max_uses" type="number" placeholder="15" class="mt-1" />
          </div>
          <div>
            <label class="text-sm font-medium">Per User Limit</label>
            <UiInput v-model.number="form.per_user_limit" type="number" placeholder="1" class="mt-1" />
          </div>
          <div class="flex flex-col">
            <label class="text-sm font-medium flex items-center gap-2"><input type="checkbox" v-model="form.first_purchase_only" /> Hanya Pembelian Pertama</label>
            <p class="text-[10px] text-muted-foreground">Jika aktif, voucher hanya untuk user yang belum pernah completed order (count=0). Cocok untuk akuisisi.</p>
          </div>
          <div>
            <label class="text-sm font-medium">Min Order Amount (opsional)</label>
            <UiInput v-model.number="form.min_order_amount" type="number" placeholder="0" class="mt-1" />
          </div>
          <div>
            <label class="text-sm font-medium">Valid From</label>
            <UiInput v-model="form.valid_from" type="datetime-local" class="mt-1" />
          </div>
          <div>
            <label class="text-sm font-medium">Valid Until</label>
            <UiInput v-model="form.valid_until" type="datetime-local" class="mt-1" />
          </div>
        </div>

        <!-- Preview -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs font-semibold text-blue-800">Preview Kalkulasi Bagi Rata</p>
          <div v-if="previewLoading" class="text-xs text-blue-600 mt-1">Menghitung...</div>
          <div v-else-if="promotionsStore.preview" class="text-xs text-blue-700 mt-1">
            <p>Flat per order: <b>{{ formatRp(promotionsStore.preview.flat_per_order) }}</b></p>
            <p>Avg merchant: {{ formatRp(promotionsStore.preview.avg_order_value) }}</p>
            <p>Estimasi persen: <b>{{ promotionsStore.preview.percent_est.toFixed(1) }}%</b></p>
            <p class="mt-1 italic">{{ promotionsStore.preview.message }}</p>
          </div>
          <p v-else class="text-xs text-blue-600 mt-1">Isi budget & kuota & merchant untuk preview</p>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p class="text-xs font-medium text-amber-800">Settlement Info</p>
          <p class="text-xs text-amber-700 mt-1">Merchant tetap dapat full estimated_cost - commission. Selisih diskon (budget_used) adalah liability platform ke merchant. Admin wajib bayar sesuai settlement.</p>
        </div>

        <!-- Secure verify -->
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
          <p class="text-xs font-semibold text-red-800 flex items-center gap-1"><ShieldAlert class="w-4 h-4" /> Verifikasi Keamanan Admin (Wajib)</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs">Password Admin *</label>
              <UiInput v-model="secureForm.admin_password" type="password" placeholder="Password admin" class="mt-1" />
            </div>
            <div>
              <label class="text-xs">TOTP 6 digit *</label>
              <input v-model="secureForm.totp_code" inputmode="numeric" maxlength="6" placeholder="000000" class="mt-1 w-full h-9 text-center font-mono tracking-widest rounded-md border border-input" />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UiButton variant="secondary" @click="showAddModal=false">Batal</UiButton>
          <UiButton variant="primary" :disabled="actionLoading" @click="handleCreate">{{ actionLoading ? 'Memproses...' : 'Buat Promo' }}</UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Edit Modal similar -->
    <UiModal v-model:open="showEditModal" size="xl">
      <template #title>Edit Promo</template>
      <div class="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="text-sm font-medium">Judul *</label>
            <UiInput v-model="form.title" class="mt-1" />
          </div>
          <div>
            <label class="text-sm font-medium">Kode Custom ex Merdeka81</label>
            <UiInput v-model="form.code" placeholder="Merdeka81" class="mt-1 font-mono" />
          </div>
          <div class="flex flex-col justify-end"><label class="text-sm flex items-center gap-2"><input type="checkbox" v-model="form.auto_apply" /> Auto</label></div>
          <div>
            <label class="text-sm">Merchant</label>
            <select v-model="form.merchant_id" class="mt-1 w-full h-9 rounded-md border border-input px-3 text-sm">
              <option :value="null">Global</option>
              <option v-for="m in merchantsStore.adminMerchants" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm">Tipe</label>
            <select v-model="form.discount_type" class="mt-1 w-full h-9 rounded-md border border-input px-3 text-sm"><option value="flat">Flat Rp</option><option value="percent">Percent %</option></select>
          </div>
          <div>
            <label class="text-sm">Nilai</label>
            <UiInput v-model.number="form.discount_value" type="number" class="mt-1" />
          </div>
          <div>
            <label class="text-sm">Budget Total</label>
            <UiInput v-model.number="form.budget_total" type="number" class="mt-1" />
          </div>
          <div>
            <label class="text-sm">Max Uses</label>
            <UiInput v-model.number="form.max_uses" type="number" class="mt-1" />
          </div>
          <div>
            <label class="text-sm">Per User Limit</label>
            <UiInput v-model.number="form.per_user_limit" type="number" class="mt-1" />
          </div>
          <div class="flex flex-col"><label class="text-sm flex items-center gap-2"><input type="checkbox" v-model="form.first_purchase_only" /> First Purchase Only</label></div>
        </div>

        <div class="bg-red-50 border border-red-200 rounded p-3 space-y-2">
          <p class="text-xs font-semibold text-red-800">Verifikasi Admin</p>
          <div class="grid grid-cols-2 gap-2">
            <UiInput v-model="secureForm.admin_password" type="password" placeholder="Password admin" />
            <input v-model="secureForm.totp_code" maxlength="6" placeholder="000000" class="h-9 text-center font-mono border rounded-md" />
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UiButton variant="secondary" @click="showEditModal=false">Batal</UiButton>
          <UiButton variant="primary" :disabled="actionLoading" @click="handleUpdate">Update</UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Usages Modal -->
    <UiModal v-model:open="showUsagesModal" size="lg">
      <template #title>Penggunaan Promo - {{ usagesPromotionId.slice(0,8) }}</template>
      <div class="space-y-3">
        <div class="text-xs">Total: {{ promotionsStore.usagesTotal }} penggunaan</div>
        <div class="overflow-x-auto max-h-96">
          <table class="w-full text-xs">
            <thead class="bg-muted/50"><tr><th class="px-2 py-1 text-left">Order</th><th class="px-2 py-1">User</th><th class="px-2 py-1">Diskon</th><th class="px-2 py-1">Tgl</th></tr></thead>
            <tbody>
              <tr v-for="u in promotionsStore.usages" :key="u.id" class="border-t"><td class="px-2 py-1 font-mono">{{ u.order_id.slice(0,8) }}</td><td class="px-2 py-1 font-mono">{{ u.user_id.slice(0,8) }}</td><td class="px-2 py-1">{{ formatRp(u.discount_amount) }}</td><td class="px-2 py-1">{{ new Date(u.created_at).toLocaleDateString('id-ID') }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </UiModal>
  </div>
</template>
