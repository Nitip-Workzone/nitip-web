<script setup lang="ts">
import { TicketPercent, Search, Plus, RefreshCw, Edit, Trash2, Eye, ShieldAlert } from '@lucide/vue'
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

const actionLoading = ref(false)
const editId = ref('')
const previewLoading = ref(false)
const autoCalculate = ref(true) // Nilai diskon otomatis dari budget & kuota sesuai request

const form = ref({
  title: '',
  description: '',
  code: '',
  merchant_id: '' as string | null,
  discount_type: 'flat' as 'flat' | 'percent',
  discount_value: 0, // akan otomatis dari budget/max_uses
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

function computeAutoDiscountFromBudget() {
  if (!form.value.budget_total || !form.value.max_uses) return
  const flat = form.value.budget_total / form.value.max_uses
  if (form.value.discount_type === 'flat') {
    form.value.discount_value = Math.round(flat)
  }
  // Untuk percent, percent_est akan diisi dari preview API (butuh avg), tapi sementara flat dulu
  // Persen akan di-overwrite setelah preview API return percent_est
}

watch(() => [form.value.budget_total, form.value.max_uses, form.value.discount_type, form.value.merchant_id] as const, ([budget, uses, type, mid]) => {
  if (autoCalculate.value && budget && uses) {
    computeAutoDiscountFromBudget()
    // trigger preview API yang akan kasih percent_est akurat
    triggerPreview()
  }
})

watch(() => promotionsStore.preview, (newVal) => {
  if (autoCalculate.value && newVal) {
    if (form.value.discount_type === 'flat') {
      form.value.discount_value = Math.round(newVal.flat_per_order)
    } else {
      // percent type: otomatis dari budget & avg merchant
      form.value.discount_value = Math.round(newVal.percent_est * 10) / 10 // 1 decimal
      if (form.value.discount_value > 90) form.value.discount_value = 90
      if (form.value.discount_value < 1) form.value.discount_value = 1
    }
  }
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

    <!-- Add Modal - Desktop lebar, nilai diskon otomatis dari budget & kuota -->
    <UiModal v-model:open="showAddModal" max-width="max-w-[1100px]">
      <template #title>
        <div class="flex items-center gap-2">
          <span>Buat Promo Diskon Baru - ex Merdeka81</span>
          <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] border border-amber-200">Desktop Lebar</span>
        </div>
      </template>
      <div class="space-y-5 max-h-[85vh] overflow-y-auto pr-2">
        <!-- Top info auto -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="autoCalculate" class="w-4 h-4" />
            <label class="text-xs font-bold text-blue-800">Otomatis hitung nilai diskon dari Budget & Kuota (sesuai story: budget 100rb / 15 order = 20%)</label>
          </div>
          <span v-if="autoCalculate" class="text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white font-bold">AUTO ON - Nilai diskon terkunci otomatis</span>
          <span v-else class="text-[10px] px-2 py-1 rounded-full bg-slate-200 text-slate-600">Manual</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-3">
            <label class="text-sm font-medium">Judul Promo *</label>
            <UiInput v-model="form.title" placeholder="Promo Merdeka - Diskon Kemerdekaan 81" class="mt-1" />
          </div>
          <div class="md:col-span-3">
            <label class="text-sm font-medium">Deskripsi</label>
            <textarea v-model="form.description" placeholder="Terbatas, khusus 15 order pertama - budget 100rb dibagi rata otomatis jadi discount persen" class="mt-1 w-full rounded-md border border-input p-2.5 text-sm min-h-[70px]" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-medium">Kode Voucher Custom * (ex Merdeka81) - kosongkan untuk Auto</label>
            <UiInput v-model="form.code" placeholder="Merdeka81" class="mt-1 font-mono" />
            <p class="text-[10px] text-muted-foreground mt-1">3-50 karakter A-Z a-z 0-9 _ - , case-insensitive unik. Contoh: Merdeka81, NITIP20, HUTRI81_2026</p>
          </div>
          <div class="flex flex-col justify-end">
            <label class="text-sm font-medium flex items-center gap-2"><input type="checkbox" v-model="form.auto_apply" class="w-4 h-4" /> Auto Apply First-N (tanpa kode)</label>
            <p class="text-[10px] text-muted-foreground mt-1">Jika centang, kode wajib kosong dan promo otomatis untuk N order pertama, banner info akan tampil otomatis.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="text-sm font-medium">Merchant (opsional) - untuk hitung avg order</label>
            <select v-model="form.merchant_id" class="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm">
              <option :value="null">Global - semua merchant (avg fallback 25k)</option>
              <option v-for="m in merchantsStore.adminMerchants" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <p class="text-[10px] text-slate-500 mt-1">Pilih merchant agar % otomatis = flat / avg_harga_merchant *100</p>
          </div>
          <div>
            <label class="text-sm font-medium">Scope Diskon</label>
            <select v-model="form.discount_scope" class="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm">
              <option value="item">Item Only (makanan saja)</option>
              <option value="delivery">Delivery Only (ongkir)</option>
              <option value="total">Total (item+ongkir)</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium">Tipe Diskon *</label>
            <select v-model="form.discount_type" class="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm">
              <option value="flat">Flat Rupiah (Rp) - otomatis flat = budget/kuota</option>
              <option value="percent">Persentase (%) - otomatis % dari avg merchant</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="text-sm font-medium flex items-center gap-2">
              Budget Total (Audit) *
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Input Utama</span>
            </label>
            <UiInput v-model.number="form.budget_total" type="number" placeholder="100000" class="mt-1 font-bold" />
            <p class="text-[10px] text-amber-700 mt-1">Budget dibagi rata. Contoh 100rb untuk 15 order.</p>
          </div>
          <div>
            <label class="text-sm font-medium flex items-center gap-2">
              Max Uses (kuota) *
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Input Utama</span>
            </label>
            <UiInput v-model.number="form.max_uses" type="number" placeholder="15" class="mt-1 font-bold" />
            <p class="text-[10px] text-slate-500 mt-1">15 order pertama dengan kode voucher</p>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-medium flex items-center gap-2">
              Nilai Diskon *
              <span v-if="autoCalculate" class="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">Otomatis dari Budget & Kuota</span>
              <span v-else class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Manual</span>
            </label>
            <div class="relative mt-1">
              <UiInput v-model.number="form.discount_value" type="number" :placeholder="form.discount_type==='flat' ? 'Otomatis 6666 dari 100000/15' : 'Otomatis 20% dari flat/avg'" :disabled="autoCalculate" :class="autoCalculate ? 'bg-blue-50 border-blue-300 font-bold' : ''" />
              <span v-if="autoCalculate" class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">AUTO</span>
            </div>
            <p class="text-[10px] text-muted-foreground mt-1">
              <span v-if="form.discount_type==='flat'">Rp per order = Budget / Kuota. Contoh 100rb/15 = Rp6.666/order</span>
              <span v-else>% = Flat / AvgHargaMerchant *100. Contoh 6.666/33.000 = 20%. Edit Budget & Kuota, % otomatis menyesuaikan.</span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="text-sm font-medium">Per User Limit</label>
            <UiInput v-model.number="form.per_user_limit" type="number" placeholder="1" class="mt-1" />
          </div>
          <div class="flex flex-col justify-end">
            <label class="text-sm font-medium flex items-center gap-2"><input type="checkbox" v-model="form.first_purchase_only" class="w-4 h-4" /> Hanya Pembelian Pertama</label>
            <p class="text-[10px] text-muted-foreground mt-1">Voucher hanya untuk user belum pernah completed order.</p>
          </div>
          <div>
            <label class="text-sm font-medium">Min Order (opsional)</label>
            <UiInput v-model.number="form.min_order_amount" type="number" placeholder="0" class="mt-1" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs font-medium">Valid From</label>
              <UiInput v-model="form.valid_from" type="datetime-local" class="mt-1" />
            </div>
            <div>
              <label class="text-xs font-medium">Valid Until</label>
              <UiInput v-model="form.valid_until" type="datetime-local" class="mt-1" />
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p class="text-sm font-bold text-blue-800 flex items-center gap-2">Preview Kalkulasi Bagi Rata <span class="text-[10px] font-normal bg-blue-600 text-white px-2 py-0.5 rounded-full">Otomatis</span></p>
          <div v-if="previewLoading" class="text-xs text-blue-600 mt-2 flex items-center gap-2"><div class="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>Menghitung dari backend...</div>
          <div v-else-if="promotionsStore.preview" class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-800">
            <div class="bg-white rounded-lg p-3 border border-blue-100">
              <p class="text-[10px] text-slate-500 uppercase font-bold">Flat per order</p>
              <p class="text-base font-black mt-1">{{ formatRp(promotionsStore.preview.flat_per_order) }}</p>
              <p class="text-[10px] mt-1">Budget {{ formatRp(form.budget_total) }} / {{ form.max_uses }} order</p>
            </div>
            <div class="bg-white rounded-lg p-3 border border-blue-100">
              <p class="text-[10px] text-slate-500 uppercase font-bold">Avg merchant</p>
              <p class="text-base font-black mt-1">{{ formatRp(promotionsStore.preview.avg_order_value) }}</p>
              <p class="text-[10px] mt-1">Dari survey atau 30 order terakhir, fallback 25k</p>
            </div>
            <div class="bg-white rounded-lg p-3 border border-blue-200 bg-blue-50">
              <p class="text-[10px] text-blue-600 uppercase font-bold">Estimasi persen untuk banner</p>
              <p class="text-2xl font-black mt-1">{{ promotionsStore.preview.percent_est.toFixed(1) }}%</p>
              <p class="text-[10px] mt-1">Gunakan untuk iklan: Diskon {{ promotionsStore.preview.percent_est.toFixed(0) }}% di {{ form.merchant_id ? (merchantsStore.adminMerchants.find(m=>m.id===form.merchant_id)?.name || 'merchant') : 'semua merchant' }}</p>
            </div>
            <div class="md:col-span-3 text-[11px] italic bg-white rounded-lg p-2 border border-blue-100">{{ promotionsStore.preview.message }}</div>
          </div>
          <p v-else class="text-xs text-blue-600 mt-2">Isi Budget & Kuota & Merchant untuk preview otomatis. Nilai diskon akan otomatis menyesuaikan: Flat = Budget/Kuota, % = Flat/AvgMerchant*100</p>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p class="text-xs font-bold text-amber-800">Settlement Info</p>
          <p class="text-xs text-amber-700 mt-1">Merchant tetap dapat full estimated_cost - commission. Selisih diskon (budget_used) adalah liability platform ke merchant. Sampaikan % yang otomatis dihitung (contoh 20%) ke merchant untuk dibuat banner iklan.</p>
        </div>

        <!-- Secure verify -->
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p class="text-sm font-bold text-red-800 flex items-center gap-2"><ShieldAlert class="w-4 h-4" /> Verifikasi Keamanan Admin (Wajib) <span class="text-[10px] font-normal bg-red-600 text-white px-2 py-0.5 rounded-full">Password + TOTP</span></p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium">Password Admin *</label>
              <UiInput v-model="secureForm.admin_password" type="password" placeholder="Password admin" class="mt-1" />
            </div>
            <div>
              <label class="text-xs font-medium">TOTP 6 digit *</label>
              <input v-model="secureForm.totp_code" inputmode="numeric" maxlength="6" placeholder="000000" class="mt-1 w-full h-10 text-center font-mono tracking-widest rounded-md border border-input font-bold" />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t">
          <UiButton variant="secondary" size="lg" @click="showAddModal=false">Batal</UiButton>
          <UiButton variant="primary" size="lg" :disabled="actionLoading" @click="handleCreate">{{ actionLoading ? 'Memproses...' : `Buat Promo - Diskon ${promotionsStore.preview ? promotionsStore.preview.percent_est.toFixed(0)+'%' : ''} Otomatis` }}</UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Edit Modal - Desktop lebar + auto discount -->
    <UiModal v-model:open="showEditModal" max-width="max-w-[1100px]">
      <template #title>
        <div class="flex items-center gap-2">
          <span>Edit Promo - Nilai Diskon Otomatis dari Budget & Kuota</span>
          <span v-if="autoCalculate" class="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">AUTO ON</span>
        </div>
      </template>
      <div class="space-y-5 max-h-[85vh] overflow-y-auto pr-2">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="autoCalculate" class="w-4 h-4" />
            <label class="text-xs font-bold text-blue-800">Otomatis hitung nilai diskon dari Budget & Kuota</label>
          </div>
          <span class="text-[10px] text-blue-700">Flat = Budget/Kuota, % = Flat/AvgMerchant*100</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-3">
            <label class="text-sm font-medium">Judul Promo *</label>
            <UiInput v-model="form.title" placeholder="Diskon Kemerdekaan - 81" class="mt-1" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-medium">Kode Custom ex Merdeka81</label>
            <UiInput v-model="form.code" placeholder="Merdeka81" class="mt-1 font-mono" />
          </div>
          <div class="flex flex-col justify-end">
            <label class="text-sm font-medium flex items-center gap-2"><input type="checkbox" v-model="form.auto_apply" class="w-4 h-4" /> Auto Apply First-N (tanpa kode)</label>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="text-sm font-medium">Merchant (untuk hitung avg)</label>
            <select v-model="form.merchant_id" class="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm">
              <option :value="null">Global - fallback 25k</option>
              <option v-for="m in merchantsStore.adminMerchants" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium">Tipe Diskon</label>
            <select v-model="form.discount_type" class="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm">
              <option value="flat">Flat Rupiah - otomatis flat = budget/kuota</option>
              <option value="percent">Persentase - otomatis % = flat/avg*100</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium flex items-center gap-2">Nilai Diskon <span v-if="autoCalculate" class="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">Otomatis {{ form.discount_type==='flat' ? 'Rp'+Math.round(form.budget_total/form.max_uses).toLocaleString('id-ID') : (promotionsStore.preview ? promotionsStore.preview.percent_est.toFixed(1)+'%' : 'hitung...') }}</span></label>
            <UiInput v-model.number="form.discount_value" type="number" :disabled="autoCalculate" :class="autoCalculate ? 'bg-blue-50 border-blue-300 font-bold mt-1' : 'mt-1'" placeholder="Otomatis dari budget & kuota" />
            <p class="text-[10px] text-slate-500 mt-1">Jika AUTO ON, nilai diskon otomatis menyesuaikan Budget & Kuota: {{ form.budget_total }}/{{ form.max_uses }} = {{ Math.round(form.budget_total/form.max_uses).toLocaleString('id-ID') }} per order</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="text-sm font-medium">Budget Total *</label>
            <UiInput v-model.number="form.budget_total" type="number" class="mt-1 font-bold" placeholder="100000" />
          </div>
          <div>
            <label class="text-sm font-medium">Max Uses (kuota) *</label>
            <UiInput v-model.number="form.max_uses" type="number" class="mt-1 font-bold" placeholder="10" />
          </div>
          <div>
            <label class="text-sm font-medium">Per User Limit</label>
            <UiInput v-model.number="form.per_user_limit" type="number" class="mt-1" />
          </div>
          <div class="flex flex-col justify-end">
            <label class="text-sm font-medium flex items-center gap-2"><input type="checkbox" v-model="form.first_purchase_only" class="w-4 h-4" /> Hanya Pembelian Pertama</label>
          </div>
        </div>

        <div v-if="promotionsStore.preview" class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
          <p class="font-bold">Preview Otomatis: Flat {{ formatRp(promotionsStore.preview.flat_per_order) }} / order → {{ promotionsStore.preview.percent_est.toFixed(1) }}% dari avg {{ formatRp(promotionsStore.preview.avg_order_value) }} - Gunakan {{ promotionsStore.preview.percent_est.toFixed(0) }}% untuk banner iklan merchant</p>
          <p class="mt-1 italic text-[11px]">{{ promotionsStore.preview.message }}</p>
        </div>

        <div class="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <p class="text-sm font-bold text-red-800 flex items-center gap-2">Verifikasi Admin (Wajib) <span class="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full">Password + TOTP</span></p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UiInput v-model="secureForm.admin_password" type="password" placeholder="Password admin" />
            <input v-model="secureForm.totp_code" maxlength="6" placeholder="000000" class="h-10 text-center font-mono tracking-widest border rounded-md font-bold" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t">
          <UiButton variant="secondary" size="lg" @click="showEditModal=false">Batal</UiButton>
          <UiButton variant="primary" size="lg" :disabled="actionLoading" @click="handleUpdate">{{ actionLoading ? 'Memproses...' : 'Update Promo - Otomatis' }}</UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Usages Modal -->
    <UiModal v-model:open="showUsagesModal" max-width="max-w-3xl">
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
