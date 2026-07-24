<script setup lang="ts">
import { ChevronLeft, Star, MapPin, Clock, Plus, Minus, ShoppingCart, ShoppingBag, X, FileText, CheckCircle, Flame, UtensilsCrossed, Package } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'
import { useCartStore } from '~/stores/cart'

definePageMeta({
  layout: 'user',
})

const route = useRoute()
const router = useRouter()
const merchantsStore = useMerchantsStore()
const cartStore = useCartStore()
const { success, error } = useToast()
const { request } = useApi()

const merchantId = route.params.id as string
const showCartDrawer = ref(false)
const showClearCartConfirm = ref(false)
const checkoutLoading = ref(false)
const pendingItem = ref<any>(null)

const merchant = computed(() =>
  merchantsStore.merchants.find(m => m.id === merchantId) || merchantsStore.currentMerchant
)

onMounted(async () => {
  if (merchantsStore.merchants.length === 0) {
    await merchantsStore.fetchNearbyMerchants(0.876031736523683, 124.0118274994378, 15.0)
  }
  await merchantsStore.fetchMerchantMenuPublic(merchantId)
})

const handleAdd = (menuItem: any) => {
  try {
    cartStore.addToCart(
      { id: menuItem.id, name: menuItem.name, price: menuItem.price, image_url: menuItem.image_url || '' },
      { id: merchant.value?.id || merchantId, name: merchant.value?.name || 'Toko' }
    )
    success(`'${menuItem.name}' ditambahkan!`)
  } catch (err: any) {
    if (err.message === 'DIFFERENT_MERCHANT') {
      pendingItem.value = menuItem
      showClearCartConfirm.value = true
    } else if (err.message === 'MAX_ITEMS_LIMIT') {
      error('Batas maksimal 10 item per pesanan.')
    }
  }
}

const confirmClearCart = () => {
  cartStore.clearCart()
  showClearCartConfirm.value = false
  if (pendingItem.value) {
    handleAdd(pendingItem.value)
    pendingItem.value = null
  }
}

const getItemQty = (itemId: string) => {
  const item = cartStore.items.find(i => i.id === itemId)
  return item ? item.quantity : 0
}

const handleIncrement = (itemId: string) => {
  try {
    cartStore.updateQuantity(itemId, getItemQty(itemId) + 1)
  } catch (err: any) {
    if (err.message === 'MAX_ITEMS_LIMIT') {
      error('Batas maksimal 10 item per pesanan.')
    }
  }
}

const handleDecrement = (itemId: string) => {
  cartStore.updateQuantity(itemId, getItemQty(itemId) - 1)
}

const handleCheckout = async () => {
  if (cartStore.items.length === 0) return
  checkoutLoading.value = true
  const itemsPayload = cartStore.items.map(i => ({ menu_id: i.id, quantity: i.quantity, notes: i.notes }))
  const itemDetailsString = cartStore.items.map(i => `${i.name} (${i.quantity}x)`).join(', ')

  try {
    const res = await request<{ data: { id: string } }>('/orders', {
      method: 'POST',
      body: {
        item_details: `Nitip Food: ${itemDetailsString}`,
        service_category: 'beli',
        estimated_cost: cartStore.subtotal,
        pickup_lat: merchant.value?.latitude || 0,
        pickup_lng: merchant.value?.longitude || 0,
        pickup_address: merchant.value?.address || '',
        pickup_name: merchant.value?.name || '',
        delivery_address: 'Alamat Pengantaran Default',
        delivery_lat: 0.8760,
        delivery_lng: 124.0118,
        payment_method: 'escrow',
        payment_source: 'wallet',
        weight_kg: 0.5,
        volume_liters: 1.0,
        merchant_id: merchant.value?.id,
        items: itemsPayload,
      }
    })
    if (res.data) {
      success('Pesanan berhasil dibuat!')
      cartStore.clearCart()
      showCartDrawer.value = false
      router.push(`/orders/${res.data.id}`)
    }
  } catch (err: any) {
    error(err?.data?.message || 'Gagal mengirimkan pesanan.')
  } finally {
    checkoutLoading.value = false
  }
}

// Available menus (only show is_available items in cart, but show all with indicator)
const availableMenus = computed(() => merchantsStore.merchantMenus.filter(m => m.is_available))
const unavailableMenus = computed(() => merchantsStore.merchantMenus.filter(m => !m.is_available))

const cartItemCount = computed(() =>
  cartStore.merchantId === merchantId ? cartStore.totalItems : 0
)
const cartSubtotal = computed(() =>
  cartStore.merchantId === merchantId ? cartStore.subtotal : 0
)
</script>

<template>
  <div class="min-h-screen bg-slate-50/60 pb-36">

    <!-- ── STICKY HEADER ── -->
    <div class="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 pt-4 pb-3">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/food"
          class="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft class="w-4 h-4" />
        </NuxtLink>
        <div class="flex-1 min-w-0">
          <h1 class="text-sm font-black text-slate-900 truncate">{{ merchant?.name || 'Katalog Toko' }}</h1>
          <p class="text-[9px] text-slate-400 font-medium mt-0.5">Detail menu &amp; harga</p>
        </div>

        <!-- Cart bubble in header -->
        <button
          v-if="cartItemCount > 0"
          @click="showCartDrawer = true"
          class="relative w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm shadow-primary/30 active:scale-95 transition-all"
        >
          <ShoppingCart class="w-4 h-4" />
          <span class="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[8px] font-black rounded-full flex items-center justify-center border border-white shadow-sm">
            {{ cartItemCount }}
          </span>
        </button>
      </div>
    </div>

    <div class="px-4 pt-4 space-y-4">

      <!-- ── MERCHANT HERO CARD ── -->
      <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <!-- Gradient banner -->
        <div
          class="h-16 flex items-center justify-center text-4xl relative"
          :class="merchant?.is_open
            ? 'bg-gradient-to-br from-primary/10 via-indigo-50 to-violet-50'
            : 'bg-slate-50'"
        >
          🍽️
          <div class="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
        </div>

        <div class="px-4 pb-4 -mt-2">
          <!-- Name & rating -->
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-base font-black text-slate-900 leading-tight">{{ merchant?.name || 'Memuat...' }}</h2>
            <div class="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-xl shrink-0 border border-amber-100">
              <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span class="text-xs font-black text-amber-700">{{ merchant?.rating?.toFixed(1) || '5.0' }}</span>
            </div>
          </div>

          <p class="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
            {{ merchant?.description || 'Toko mitra terpercaya di Nitip.' }}
          </p>

          <!-- Info row -->
          <div class="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border"
              :class="merchant?.is_open
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="merchant?.is_open ? 'bg-emerald-500' : 'bg-slate-300'" />
              {{ merchant?.is_open ? 'Sedang Buka' : 'Sedang Tutup' }}
            </span>

            <span v-if="merchant?.auto_confirm && merchant?.is_open" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-primary bg-primary/8 border border-primary/15">
              <Flame class="w-3 h-3" />
              Konfirmasi Instan
            </span>

            <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1 ml-auto">
              <MapPin class="w-3 h-3 shrink-0" />
              <span class="truncate max-w-[130px]">{{ merchant?.address?.split(',')[0] || 'Alamat Toko' }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ── MENU LIST ── -->
      <div class="space-y-3">
        <div class="flex items-center justify-between px-0.5">
          <h3 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Daftar Menu</h3>
          <span v-if="!merchantsStore.loading" class="text-[10px] font-bold text-primary">
            {{ availableMenus.length }} tersedia
          </span>
        </div>

        <!-- Loading skeleton -->
        <div v-if="merchantsStore.loading" class="space-y-2.5">
          <div v-for="i in 4" :key="i" class="bg-white rounded-2xl p-4 flex gap-3 animate-pulse border border-slate-100">
            <div class="w-16 h-16 bg-slate-100 rounded-2xl shrink-0" />
            <div class="flex-1 space-y-2 pt-0.5">
              <div class="h-3.5 bg-slate-100 rounded-lg w-2/5" />
              <div class="h-2.5 bg-slate-100 rounded-lg w-4/5" />
              <div class="h-3 bg-slate-100 rounded-lg w-1/4 mt-1" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="merchantsStore.merchantMenus.length === 0"
          class="bg-white border border-dashed border-slate-200 rounded-3xl py-14 px-6 text-center"
        >
          <UtensilsCrossed class="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p class="text-xs font-bold text-slate-500">Belum ada menu</p>
          <p class="text-[10px] text-slate-400 mt-0.5">Toko ini belum menambahkan menu.</p>
        </div>

        <!-- Available menu items -->
        <div v-else class="space-y-2.5">
          <!-- Available items -->
          <div
            v-for="item in availableMenus"
            :key="item.id"
            class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex gap-0"
          >
            <!-- Image -->
            <div class="w-[76px] h-[76px] shrink-0 relative overflow-hidden">
              <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                class="w-full h-full object-cover"
              >
              <div v-else class="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-2xl">
                🍴
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">
              <div>
                <h4 class="text-[13px] font-black text-slate-900 leading-tight truncate">{{ item.name }}</h4>
                <p class="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-normal">{{ item.description || '–' }}</p>
              </div>
              <div class="flex items-center justify-between mt-2">
                <span class="text-[13px] font-black text-primary">Rp {{ item.price.toLocaleString('id-ID') }}</span>

                <!-- Add button or qty counter -->
                <div v-if="getItemQty(item.id) === 0">
                  <button
                    @click="handleAdd(item)"
                    :disabled="!merchant?.is_open"
                    class="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-[11px] font-black rounded-xl active:scale-95 transition-all shadow-sm shadow-primary/25 disabled:opacity-40"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </div>
                <div v-else class="flex items-center bg-primary rounded-xl overflow-hidden shadow-sm">
                  <button @click="handleDecrement(item.id)" class="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-primary-dark active:scale-90 transition-all">
                    <Minus class="w-3.5 h-3.5" />
                  </button>
                  <span class="text-xs font-black text-white px-1 min-w-[20px] text-center">{{ getItemQty(item.id) }}</span>
                  <button @click="handleIncrement(item.id)" class="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all">
                    <Plus class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Unavailable divider -->
          <div v-if="unavailableMenus.length > 0" class="pt-2">
            <p class="text-[9px] font-extrabold text-slate-300 uppercase tracking-widest px-0.5 mb-2">Sedang Habis</p>
            <div
              v-for="item in unavailableMenus"
              :key="item.id"
              class="bg-white/60 rounded-2xl border border-slate-100 overflow-hidden flex gap-0 opacity-55"
            >
              <div class="w-[76px] h-[76px] shrink-0 relative overflow-hidden">
                <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="w-full h-full object-cover grayscale" >
                <div v-else class="w-full h-full bg-slate-50 flex items-center justify-center text-2xl grayscale">🍴</div>
                <div class="absolute inset-0 bg-white/40" />
              </div>
              <div class="flex-1 px-3 py-2.5">
                <h4 class="text-[13px] font-black text-slate-400 leading-tight truncate">{{ item.name }}</h4>
                <span class="text-[9px] font-extrabold text-slate-300 mt-0.5 uppercase">Habis / Tidak Tersedia</span>
                <p class="text-[13px] font-black text-slate-300 mt-1.5">Rp {{ item.price.toLocaleString('id-ID') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── FLOATING CART BAR ── -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="cartItemCount > 0 && cartStore.merchantId === merchantId"
        class="fixed bottom-20 left-0 right-0 z-40 max-w-md mx-auto px-4"
      >
        <button
          @click="showCartDrawer = true"
          class="w-full bg-primary text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl shadow-primary/30 active:scale-[0.99] transition-all"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center relative">
              <ShoppingCart class="w-4 h-4" />
              <span class="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-rose-500 text-[8px] font-black rounded-full flex items-center justify-center border-2 border-primary">
                {{ cartItemCount }}
              </span>
            </div>
            <div class="text-left">
              <p class="text-[9px] font-bold text-white/70">{{ cartItemCount }} item dipilih</p>
              <p class="text-xs font-black">Rp {{ cartSubtotal.toLocaleString('id-ID') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 bg-white text-primary text-[11px] font-black px-3.5 py-2 rounded-xl">
            Lihat Keranjang
          </div>
        </button>
      </div>
    </Transition>

    <!-- ── CLEAR CART CONFIRM MODAL ── -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showClearCartConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/55 backdrop-blur-sm">
        <div class="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl space-y-4 text-center">
          <div class="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-2xl">🔄</div>
          <div>
            <h4 class="text-sm font-black text-slate-900">Ganti Toko Mitra?</h4>
            <p class="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              Keranjang dari <span class="font-bold text-slate-600">{{ cartStore.merchantName }}</span> akan dihapus dan diganti dengan toko ini.
            </p>
          </div>
          <div class="flex gap-2.5">
            <button @click="showClearCartConfirm = false" class="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-all">
              Batal
            </button>
            <button @click="confirmClearCart" class="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all">
              Ganti Toko
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── CART BOTTOM SHEET ── -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="showCartDrawer"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
        @click.self="showCartDrawer = false"
      >
        <div class="bg-white rounded-t-[2rem] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <!-- Handle + Header -->
          <div class="px-6 pt-4 pb-3 border-b border-slate-100 shrink-0">
            <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag class="w-4 h-4 text-primary" />
                  Keranjang Belanja
                </h3>
                <p class="text-[10px] text-slate-400 mt-0.5">
                  {{ cartStore.merchantName }} · {{ cartItemCount }}/10 item
                </p>
              </div>
              <button @click="showCartDrawer = false" class="w-8 h-8 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all">
                <X class="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            <!-- Progress bar item limit -->
            <div class="mt-3">
              <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="cartItemCount >= 8 ? 'bg-rose-400' : cartItemCount >= 5 ? 'bg-amber-400' : 'bg-emerald-400'"
                  :style="{ width: (cartItemCount / 10 * 100) + '%' }"
                />
              </div>
              <p class="text-[9px] font-bold mt-1" :class="cartItemCount >= 8 ? 'text-rose-500' : 'text-slate-400'">
                {{ cartItemCount }}/10 item — {{ 10 - cartItemCount }} slot tersisa
              </p>
            </div>
          </div>

          <!-- Cart items -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div
              v-for="item in cartStore.items"
              :key="item.id"
              class="flex gap-3 items-start"
            >
              <div class="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 text-xl">
                🍴
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <h5 class="text-xs font-bold text-slate-800 truncate">{{ item.name }}</h5>
                    <p class="text-[10px] text-slate-400 mt-0.5">
                      Rp {{ item.price.toLocaleString('id-ID') }} × {{ item.quantity }} =
                      <span class="font-bold text-slate-600">Rp {{ (item.price * item.quantity).toLocaleString('id-ID') }}</span>
                    </p>
                  </div>
                  <!-- Qty -->
                  <div class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shrink-0">
                    <button @click="handleDecrement(item.id)" class="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-90 transition-all">
                      <Minus class="w-3 h-3" />
                    </button>
                    <span class="text-xs font-black text-slate-800 px-1 min-w-[20px] text-center">{{ item.quantity }}</span>
                    <button @click="handleIncrement(item.id)" class="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-90 transition-all">
                      <Plus class="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <!-- Notes input -->
                <div class="relative mt-1.5">
                  <FileText class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                  <input
                    :value="item.notes"
                    @input="e => cartStore.updateNotes(item.id, (e.target as HTMLInputElement).value)"
                    type="text"
                    placeholder="Catatan... (contoh: tidak pedas)"
                    class="w-full h-8 pl-7 pr-3 rounded-lg border border-slate-100 text-[10px] font-medium focus:outline-none focus:border-primary/40 bg-slate-50 transition-all"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Checkout summary -->
          <div class="px-6 pb-6 pt-4 border-t border-slate-100 space-y-4 shrink-0 bg-white">
            <div class="space-y-2 text-xs">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal ({{ cartItemCount }} item)</span>
                <span class="font-bold text-slate-700">Rp {{ cartSubtotal.toLocaleString('id-ID') }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Ongkos Kirim Bawaan</span>
                <span class="font-bold text-slate-700">Rp 10.000</span>
              </div>
              <div v-if="cartStore.deliveryFeeSurcharge > 0" class="flex justify-between text-primary">
                <span class="flex items-center gap-1">
                  Surcharge Item
                  <span class="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full bg-primary/10 uppercase">+Rp 2rb/item</span>
                </span>
                <span class="font-bold">Rp {{ cartStore.deliveryFeeSurcharge.toLocaleString('id-ID') }}</span>
              </div>
              <div class="flex justify-between items-center font-black text-slate-900 pt-2 border-t border-slate-100">
                <span class="text-xs">Total Estimasi</span>
                <span class="text-base text-primary">Rp {{ (cartSubtotal + 10000 + cartStore.deliveryFeeSurcharge).toLocaleString('id-ID') }}</span>
              </div>
            </div>

            <button
              @click="handleCheckout"
              :disabled="checkoutLoading || cartStore.items.length === 0"
              class="w-full h-12 bg-primary text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <span v-if="checkoutLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <ShoppingBag v-else class="w-4 h-4" />
              {{ checkoutLoading ? 'Memproses...' : 'Pesan & Kunci Escrow' }}
            </button>

            <p class="text-[9px] text-slate-400 text-center font-medium">
              🔒 Saldo dikunci via Escrow hingga pesanan selesai
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
