<script setup lang="ts">
import { useSupportStore } from '~/stores/support'
import { useUserOrdersStore } from '~/stores/user-orders'
import { ArrowLeft, Search } from '@lucide/vue'

definePageMeta({ layout: 'user' })

const supportStore = useSupportStore()
const ordersStore = useUserOrdersStore()
const toastStore = useToastStore()
const router = useRouter()
const route = useRoute()

const category = ref('other')
const title = ref('')
const description = ref('')
const orderId = ref<string | undefined>(route.query.order_id as string | undefined)
const searchQuery = ref('')
const searchResults = ref<Array<Record<string, unknown>>>([])
const showFaq = ref(true)
const submitting = ref(false)

const categories = [
  { value: 'order_issue', label: 'Masalah Pesanan' },
  { value: 'payment', label: 'Pembayaran' },
  { value: 'account', label: 'Akun' },
  { value: 'merchant', label: 'Toko / Merchant' },
  { value: 'other', label: 'Lainnya' },
]

onMounted(async () => {
  await supportStore.fetchFaqs(true)
  if (route.query.order_id) {
    orderId.value = route.query.order_id as string
  }
  // Fetch orders for select
  try { await ordersStore.fetchMyOrders() } catch { /* noop */ }
})

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = await supportStore.fetchFaqs(true) as unknown as Array<Record<string, unknown>>
    return
  }
  const res = await supportStore.searchFaq(searchQuery.value, category.value)
  searchResults.value = res as unknown as Array<Record<string, unknown>>
}

async function handleSubmit() {
  if (!title.value.trim() || title.value.trim().length < 5) {
    toastStore.add('Judul minimal 5 karakter')
    return
  }
  if (!description.value.trim() || description.value.trim().length < 10) {
    toastStore.add('Deskripsi minimal 10 karakter')
    return
  }
  submitting.value = true
  try {
    const ticket = await supportStore.createTicket({
      title: title.value.trim(),
      description: description.value.trim(),
      category: category.value,
      order_id: orderId.value,
    })
    toastStore.add('Tiket berhasil dibuat! Menunggu CS.')
    router.push(`/support/${ticket?.id as string}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toastStore.add(err?.data?.message || 'Gagal membuat tiket')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50">
    <div class="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
    <div class="relative z-10 max-w-md mx-auto px-5 pt-5 pb-24 space-y-5">
      <div class="flex items-center gap-2">
        <button class="p-2 -ml-2 text-muted-foreground" @click="router.push('/support')"><ArrowLeft class="w-5 h-5" /></button>
        <div>
          <h1 class="text-base font-black text-slate-900">Buat Tiket Bantuan</h1>
          <p class="text-[11px] text-slate-500">Cari solusi atau hubungi CS</p>
        </div>
      </div>

      <!-- FAQ Search -->
      <div class="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-slate-700">Cari Solusi</h3>
          <button class="text-[10px] font-bold text-primary" @click="showFaq = !showFaq">{{ showFaq ? 'Sembunyikan' : 'Tampilkan' }}</button>
        </div>
        <div v-if="showFaq" class="space-y-3">
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input v-model="searchQuery" type="text" placeholder="Cari masalah..." class="w-full h-10 rounded-xl border border-slate-200 pl-10 pr-3 text-xs focus:outline-none focus:border-primary/50" @keyup.enter="handleSearch">
            </div>
            <button class="h-10 px-4 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold" @click="handleSearch">Cari</button>
          </div>
          <div class="max-h-[200px] overflow-y-auto space-y-2">
            <div v-for="faq in ((searchResults.length ? searchResults : supportStore.faqs) as Array<{ id: string; question: string; answer: string }>)" :key="faq.id" class="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p class="text-xs font-bold text-slate-800">{{ faq.question }}</p>
              <p class="text-[11px] text-slate-600 mt-1 line-clamp-3">{{ faq.answer }}</p>
            </div>
            <p v-if="supportStore.faqs.length === 0" class="text-[11px] text-slate-400 text-center py-2">Belum ada solusi, silakan buat tiket di bawah.</p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <h3 class="text-xs font-bold text-slate-700">Form Tiket</h3>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold text-slate-600">Kategori</label>
          <select v-model="category" class="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs bg-slate-50 focus:bg-white focus:outline-none">
            <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>

        <div v-if="orderId" class="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs">
          Terkait Order: <span class="font-bold">{{ orderId.slice(0,8).toUpperCase() }}</span>
          <button class="ml-2 text-[11px] text-primary font-bold" @click="orderId = undefined">Hapus</button>
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold text-slate-600">Judul</label>
          <input v-model="title" type="text" placeholder="Ringkasan masalah..." class="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs focus:outline-none focus:border-primary/50">
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold text-slate-600">Deskripsi</label>
          <textarea v-model="description" rows="4" placeholder="Jelaskan detail masalah..." class="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:border-primary/50 resize-none"/>
        </div>

        <button :disabled="submitting" class="w-full h-11 bg-primary text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-2" @click="handleSubmit">
          <span v-if="submitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ submitting ? 'Mengirim...' : 'Kirim Tiket' }}
        </button>
      </div>
    </div>
  </div>
</template>
