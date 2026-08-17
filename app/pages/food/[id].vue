<script setup lang="ts">
import { ChevronLeft, Star, MapPin, Plus, Minus, ShoppingCart, ShoppingBag, X, FileText, Flame, UtensilsCrossed, Wallet, CreditCard } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'
import { useCartStore } from '~/stores/cart'
import { useUserWalletStore } from '~/stores/user-wallet'

definePageMeta({
  layout: 'user',
})

const route = useRoute()
const router = useRouter()
const merchantsStore = useMerchantsStore()
const cartStore = useCartStore()
const walletStore = useUserWalletStore()
const { success, error } = useToast()
const { request } = useApi()

const merchantId = route.params.id as string
const showCartDrawer = ref(false)
const showClearCartConfirm = ref(false)
const checkoutLoading = ref(false)
const pendingItem = ref<{ id: string; name: string; price: number; image_url?: string } | null>(null)
const paymentSource = ref<'wallet' | 'qris'>('wallet')

const deliveryAddress = ref('Lolak, Sulawesi Utara')
const deliveryLat = ref(0.8760)
const deliveryLng = ref(124.0118)

const merchant = computed(() =>
  merchantsStore.merchants.find(m => m.id === merchantId) || merchantsStore.currentMerchant
)

const activePromo = ref<any>(null)
const promoCodeInput = ref('')
const promoValidating = ref(false)
const promoError = ref('')

const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

// ── SCROLL LOCK for modals: prevent background scroll bleeding ──
const lockBodyScroll = () => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'
  }
}
const unlockBodyScroll = () => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.overscrollBehavior = ''
    document.documentElement.style.overscrollBehavior = ''
  }
}
watch([showCartDrawer, showVariantPicker, showClearCartConfirm], ([cart, variant, clear]) => {
  if (cart || variant || clear) lockBodyScroll()
  else unlockBodyScroll()
})
onBeforeUnmount(() => unlockBodyScroll())

// Watcher COD: jika paymentSource berubah ke cod (future), voucher tidak bisa dan dikosongkan
watch(paymentSource, (newVal) => {
  if ((newVal as string) === 'cod') {
    if (cartStore.appliedPromotion || promoCodeInput.value) {
      cartStore.removePromotion()
      promoCodeInput.value = ''
      promoError.value = 'Voucher tidak dapat digunakan dengan metode COD. Silakan pilih Wallet atau QRIS dan voucher akan dikosongkan.'
      error('Voucher tidak dapat digunakan dengan COD. Voucher dikosongkan.')
    }
  }
})

onMounted(async () => {
  if (merchantsStore.merchants.length === 0) {
    await merchantsStore.fetchNearbyMerchants(0.876031736523683, 124.0118274994378, 15.0)
  }
  await merchantsStore.fetchMerchantMenuPublic(merchantId)
  await walletStore.fetchBalance()
  // fetch active promo for this merchant
  try {
    const { request: reqApi } = useApi()
    const res = await reqApi<{ data: any[] }>(`/promotions/active?merchant_id=${merchantId}`)
    if (res.data && res.data.length > 0) {
      activePromo.value = res.data[0]
      // auto apply if auto_apply
      if (activePromo.value.auto_apply && !cartStore.appliedPromotion) {
        try {
          await handleApplyPromo(activePromo.value.code || '')
        } catch {}
      }
    }
  } catch {}

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        deliveryLat.value = position.coords.latitude
        deliveryLng.value = position.coords.longitude
      },
      (err) => {
        console.warn('Geolocation error:', err)
      }
    )
  }
})

// Variant picker dengan foto varian/topping + price ±
const showVariantPicker = ref(false)
const variantPickerMenu = ref<any>(null)
const selectedVariantOption = ref<{ id: string; label: string; price_delta: number; image_url?: string } | null>(null)
const selectedToppings = ref<Array<{ id: string; label: string; price_delta: number; image_url?: string }>>([])

const variantFinalPrice = computed(() => {
  const base = variantPickerMenu.value?.price || 0
  const vDelta = selectedVariantOption.value?.price_delta || 0
  const tSum = selectedToppings.value.reduce((s,t)=>s+t.price_delta,0)
  return Math.max(0, base + vDelta + tSum)
})

const openVariantPicker = (menuItem: any) => {
  // Jika menu punya variant_groups atau topping_groups, buka picker
  const hasVariant = (menuItem.variant_groups && menuItem.variant_groups.length>0) || (menuItem.topping_groups && menuItem.topping_groups.length>0)
  if (!hasVariant) {
    // old flow langsung tambah
    doAddToCart(menuItem, null, [])
    return
  }
  variantPickerMenu.value = menuItem
  selectedVariantOption.value = null
  selectedToppings.value = []
  // auto select default variant if any
  const groups = menuItem.variant_groups || []
  for (const g of groups) {
    const def = (g.options||[]).find((o:any)=>o.is_default) || (g.is_required ? (g.options||[])[0] : null)
    if (def) { selectedVariantOption.value = { id: def.id, label: def.label, price_delta: def.price_delta, image_url: def.image_url }; break }
  }
  showVariantPicker.value = true
}

const doAddToCart = (menuItem: { id: string; name: string; price: number; image_url?: string }, variant: { id: string; label: string; price_delta: number; image_url?: string } | null, toppings: Array<{ id: string; label: string; price_delta: number; image_url?: string }>) => {
  const priceDelta = (variant?.price_delta||0) + toppings.reduce((s,t)=>s+t.price_delta,0)
  const finalPrice = Math.max(0, menuItem.price + priceDelta)
  try {
    cartStore.addToCart(
      {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        finalPrice,
        image_url: menuItem.image_url || '',
        variant: variant ? { optionId: variant.id, label: variant.label, priceDelta: variant.price_delta, imageUrl: variant.image_url } : null,
        toppings: toppings.map(t=>({ optionId: t.id, label: t.label, priceDelta: t.price_delta, imageUrl: t.image_url })),
        priceDelta,
      } as any,
      { id: merchant.value?.id || merchantId, name: merchant.value?.name || 'Toko' }
    )
    const vLabel = variant ? ` (${variant.label})` : ''
    const tLabel = toppings.length ? ` + ${toppings.map(t=>t.label).join(', ')}` : ''
    success(`'${menuItem.name}${vLabel}${tLabel}' ditambahkan! Rp ${finalPrice.toLocaleString('id-ID')}`)
    showVariantPicker.value = false
  } catch (err: unknown) {
    if ((err as Error).message === 'DIFFERENT_MERCHANT') {
      pendingItem.value = menuItem as any
      showClearCartConfirm.value = true
    } else if ((err as Error).message === 'MAX_ITEMS_LIMIT') {
      error('Maaf, Anda hanya dapat memesan maksimal 10 porsi dalam sekali jalan.')
    }
  }
}

const handleAdd = (menuItem: any) => {
  openVariantPicker(menuItem)
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
  } catch (err: unknown) {
    if ((err as Error).message === 'MAX_ITEMS_LIMIT') {
      error('Maaf, Anda hanya dapat memesan maksimal 10 porsi dalam sekali jalan.')
    }
  }
}

const handleDecrement = (itemId: string) => {
  cartStore.updateQuantity(itemId, getItemQty(itemId) - 1)
}

async function handleApplyPromo(codeOverride?: string) {
  // Prioritas Food Only + Wallet/QRIS only, COD tidak bisa voucher - per request
  // Food checkout hanya wallet/qris (escrow), jadi aman. Tapi jika paymentSource === 'cod' (future), block.
  if (paymentSource.value === 'cod' as any) {
    promoError.value = 'Voucher tidak dapat digunakan dengan metode COD. Silakan pilih Wallet atau QRIS.'
    cartStore.removePromotion()
    promoCodeInput.value = ''
    error('Voucher tidak dapat digunakan dengan COD. Silakan pilih Wallet atau QRIS dan voucher akan dikosongkan.')
    return
  }
  const codeToUse = (codeOverride !== undefined ? codeOverride : promoCodeInput.value || cartStore.appliedPromotion?.code || '') as string
  promoValidating.value = true
  promoError.value = ''
  try {
    const deliveryTotal = 10000 + cartStore.deliveryFeeSurcharge
    const result = await cartStore.applyPromotion(codeToUse, merchantId, deliveryTotal)
    if (result) {
      success(`Promo ${result.code || result.title} diterapkan! Hemat ${formatRp(result.discount_amount)} - Hanya untuk Nitip Food`)
      promoCodeInput.value = result.code || ''
    }
  } catch (e: any) {
    promoError.value = e?.data?.message || e?.message || 'Voucher tidak valid (contoh Merdeka81 atau pembelian pertama)'
  } finally {
    promoValidating.value = false
  }
}

function handleRemovePromo() {
  cartStore.removePromotion()
  promoCodeInput.value = ''
  promoError.value = ''
}

const handleCheckout = async () => {
  if (cartStore.items.length === 0) return
  checkoutLoading.value = true
  const itemsPayload = cartStore.items.map(i => ({
    menu_id: i.id,
    quantity: i.quantity,
    notes: i.notes,
    variant_option_id: (i as any).variant?.optionId || null,
    topping_option_ids: ((i as any).toppings||[]).map((t:any)=>t.optionId),
    variant_label: (i as any).variant?.label || null,
    topping_labels: ((i as any).toppings||[]).map((t:any)=>t.label),
    price_delta: (i as any).priceDelta || ((i as any).finalPrice - i.price),
    image_url: (i as any).variant?.imageUrl || i.image_url,
  }))
  const itemDetailsString = cartStore.items.map(i => `${i.name}${(i as any).variant ? ` (${(i as any).variant.label})` : ''}${((i as any).toppings||[]).length ? ` + ${(i as any).toppings.map((t:any)=>t.label).join(', ')}` : ''} (${i.quantity}x)`).join(', ')

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
        delivery_address: deliveryAddress.value,
        delivery_lat: deliveryLat.value,
        delivery_lng: deliveryLng.value,
        payment_method: 'escrow',
        payment_source: paymentSource.value,
        promotion_code: cartStore.appliedPromotion?.code || promoCodeInput.value?.trim() || (activePromo.value?.auto_apply ? undefined : undefined),
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
  } catch (err: unknown) {
    error((err as { data?: { message?: string } })?.data?.message || 'Gagal mengirimkan pesanan.')
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
          class="relative w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm shadow-primary/30 active:scale-95 transition-all"
          @click="showCartDrawer = true"
        >
          <ShoppingCart class="w-4 h-4" />
          <span class="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[8px] font-black rounded-full flex items-center justify-center border border-white shadow-sm">
            {{ cartItemCount }}
          </span>
        </button>
      </div>
    </div>

    <div class="px-4 pt-4 space-y-4">

      <!-- ── MERCHANT HERO CARD - FIX gepeng + cover_url & image_url display + anti potong ── -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-visible">
        <!-- Cover banner - height 180, uses cover_url, not overflow-hidden on outer to prevent logo potong -->
        <div class="relative h-[180px] w-full overflow-hidden bg-slate-100 rounded-t-3xl">
          <!-- Cover image from core - signed URL -->
          <img
            v-if="merchant?.cover_url"
            :src="merchant.cover_url"
            :alt="`${merchant.name} cover`"
            class="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            @error="(e) => { (e.target as HTMLImageElement).style.display='none' }"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center text-5xl bg-gradient-to-br from-primary/10 via-indigo-50 to-violet-50"
          >
            🍽️
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent pointer-events-none" />
          <div class="absolute top-3 left-3 flex gap-2 z-10">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase backdrop-blur-md border shadow-sm"
              :class="merchant?.is_open ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-slate-900/60 text-white border-white/20'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="merchant?.is_open ? 'bg-white animate-pulse' : 'bg-slate-300'" />
              {{ merchant?.is_open ? 'Sedang Buka' : 'Sedang Tutup' }}
            </span>
            <span v-if="merchant?.auto_confirm && merchant?.is_open" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white bg-primary/90 border border-white/20 backdrop-blur-md shadow-sm">
              <Flame class="w-3 h-3" /> Instan
            </span>
          </div>
          <div class="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/50 shadow-sm">
            <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span class="text-xs font-black text-amber-700">{{ merchant?.rating?.toFixed(1) || '5.0' }}</span>
          </div>
        </div>

        <!-- Logo row - hanya logo, tidak ada nama untuk hindari redundant (nama hanya 1x di bawah) -->
        <div class="relative px-4">
          <div class="flex items-end -mt-10 relative z-20">
            <div class="w-[84px] h-[84px] rounded-[20px] overflow-hidden border-[3px] border-white shadow-xl bg-white shrink-0">
              <img v-if="merchant?.image_url" :src="merchant.image_url" :alt="`${merchant.name} logo`" class="w-full h-full object-cover" loading="lazy" decoding="async" @error="(e) => { (e.target as HTMLImageElement).style.display='none' }" />
              <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-slate-50">🍽️</div>
            </div>
          </div>
        </div>

        <div class="px-4 pb-4 pt-3">
          <!-- Name hanya 1x - tidak redundant -->
          <div class="space-y-1.5">
            <h2 class="text-[18px] font-black text-slate-900 leading-tight truncate">{{ merchant?.name || 'Memuat...' }}</h2>
            <p class="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
              {{ merchant?.description || 'Toko mitra terpercaya di Nitip.' }}
            </p>
          </div>

          <!-- Info row - alamat hanya 1x, tidak duplikat -->
          <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border"
              :class="merchant?.is_open
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="merchant?.is_open ? 'bg-emerald-500' : 'bg-slate-300'" />
              {{ merchant?.is_open ? 'Sedang Buka' : 'Sedang Tutup' }}
            </span>

            <span class="text-[11px] text-slate-500 font-medium flex items-center gap-1 flex-1 min-w-0">
              <MapPin class="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span class="truncate">{{ merchant?.address || 'Trans Sulawesi, Lolak' }}</span>
            </span>
          </div>

          <!-- Opening hours -->
          <div v-if="merchant?.opening_hours" class="mt-2.5 flex items-center gap-1.5">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Buka:</span>
            <span class="text-[11px] text-slate-600 font-medium">Sen-Ming 08:00-22:00</span>
          </div>
        </div>
      </div>

      <!-- ── PROMO BANNER ── -->
      <div v-if="activePromo" class="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-3 flex items-center justify-between text-white shadow-sm">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-black truncate">Promo {{ activePromo.code || 'AUTO' }}: {{ activePromo.code ? 'Diskon '+ (activePromo.discount_type==='flat' ? formatRp(activePromo.discount_value) : activePromo.discount_value+'%') : 'Diskon Otomatis' }} untuk {{ activePromo.max_uses }} order pertama! Budget {{ formatRp(activePromo.budget_total || activePromo.budget_remaining) }}, sisa {{ activePromo.max_uses - activePromo.used_count }} order | Subsidi Platform</p>
          <p v-if="activePromo.first_purchase_only" class="text-[10px] mt-0.5 font-bold bg-white/20 inline-flex px-2 py-0.5 rounded-full">Hanya Pembelian Pertama</p>
          <p v-if="activePromo.title" class="text-[10px] mt-1 opacity-90 truncate">{{ activePromo.title }}</p>
        </div>
        <span class="ml-3 px-2.5 py-1 bg-white text-amber-600 rounded-full text-[10px] font-black shrink-0">{{ activePromo.discount_type==='flat' ? formatRp(activePromo.discount_value) : activePromo.discount_value+'% OFF' }}</span>
      </div>
      <div v-if="activePromo && cartStore.appliedPromotion" class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px] text-emerald-700 font-medium">
        ✅ Promo {{ cartStore.appliedPromotion.code || cartStore.appliedPromotion.title }} aktif! Hemat {{ formatRp(cartStore.appliedPromotion.discount_amount) }}
        <span v-if="cartStore.appliedPromotion.first_purchase_only" class="ml-1 inline-flex px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px]">First Buy</span>
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
            <!-- Image - lazy, compressed on backend now 300KB not 8MB -->
            <div class="w-[76px] h-[76px] shrink-0 relative overflow-hidden bg-slate-50">
              <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                loading="lazy"
                decoding="async"
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
                    :disabled="!merchant?.is_open"
                    class="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-[11px] font-black rounded-xl active:scale-95 transition-all shadow-sm shadow-primary/25 disabled:opacity-40"
                    @click="handleAdd(item)"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </div>
                <div v-else class="flex items-center bg-primary rounded-xl overflow-hidden shadow-sm">
                  <button class="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-primary-dark active:scale-90 transition-all" @click="handleDecrement(item.id)">
                    <Minus class="w-3.5 h-3.5" />
                  </button>
                  <span class="text-xs font-black text-white px-1 min-w-[20px] text-center">{{ getItemQty(item.id) }}</span>
                  <button class="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all" @click="handleIncrement(item.id)">
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
          class="w-full bg-primary text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl shadow-primary/30 active:scale-[0.99] transition-all"
          @click="showCartDrawer = true"
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
            <button class="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-all" @click="showClearCartConfirm = false">
              Batal
            </button>
            <button class="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all" @click="confirmClearCart">
              Ganti Toko
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── CART BOTTOM SHEET - FIXED: anti kejepit, scroll lock, overscroll-contain ── -->
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
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm overscroll-contain"
        @click.self="showCartDrawer = false"
        @touchmove.prevent
        @wheel.prevent
      >
        <div
          class="bg-white rounded-t-[2rem] w-full max-w-md flex flex-col overflow-hidden overscroll-contain"
          style="max-height: 92dvh; max-height: 92vh; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;"
          @touchmove.stop
          @wheel.stop
        >
          <!-- Handle + Header (fixed) -->
          <div class="px-6 pt-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
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
              <button class="w-8 h-8 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all" @click="showCartDrawer = false">
                <X class="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
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

          <!-- SCROLLABLE CONTENT: items + alamat + pembayaran + voucher (semua bisa scroll, tidak kejepit) -->
          <div
            class="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-5"
            style="overscroll-behavior: contain; -webkit-overflow-scrolling: touch; touch-action: pan-y;"
            @touchmove.stop
          >
            <!-- Cart items list -->
            <div class="space-y-3">
              <p class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Item Pesanan ({{ cartItemCount }})</p>
              <div
                v-for="item in cartStore.items"
                :key="item.id"
                class="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex gap-3 items-start"
              >
                <div class="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  <img v-if="(item as any).image_url" :src="(item as any).image_url" class="w-full h-full object-cover" />
                  <span v-else class="text-xl">🍴</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <h5 class="text-xs font-bold text-slate-800 leading-tight truncate">{{ item.name }}</h5>
                      <p v-if="(item as any).variant" class="text-[10px] text-primary font-semibold mt-0.5">Varian: {{ (item as any).variant.label }} {{ (item as any).variant.priceDelta ? `+Rp ${(item as any).variant.priceDelta.toLocaleString('id-ID')}` : '' }}</p>
                      <p v-if="((item as any).toppings||[]).length" class="text-[10px] text-amber-700 mt-0.5 truncate">+ {{ ((item as any).toppings||[]).map((t:any)=>t.label).join(', ') }}</p>
                      <p class="text-[11px] text-slate-600 mt-1 font-bold">
                        Rp {{ ((item as any).finalPrice || item.price).toLocaleString('id-ID') }} × {{ item.quantity }} = <span class="text-primary">Rp {{ (((item as any).finalPrice || item.price) * item.quantity).toLocaleString('id-ID') }}</span>
                      </p>
                    </div>
                    <div class="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-sm">
                      <button class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-90 transition-all" @click="handleDecrement(item.id)">
                        <Minus class="w-3.5 h-3.5" />
                      </button>
                      <span class="text-xs font-black text-slate-800 px-2 min-w-[24px] text-center">{{ item.quantity }}</span>
                      <button class="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-90 transition-all" @click="handleIncrement(item.id)">
                        <Plus class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div class="relative mt-2">
                    <FileText class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                    <input
                      :value="item.notes"
                      type="text"
                      placeholder="Catatan... (contoh: tidak pedas)"
                      class="w-full h-8 pl-7 pr-3 rounded-xl border border-white text-[10px] font-medium focus:outline-none focus:border-primary/40 bg-white transition-all shadow-sm"
                      @input="e => cartStore.updateNotes(item.id, (e.target as HTMLInputElement).value)"
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Delivery Address Input -->
            <div class="space-y-2">
              <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Alamat Pengantaran</label>
              <div class="relative">
                <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  v-model="deliveryAddress"
                  type="text"
                  placeholder="Tulis alamat pengantaran lengkap..."
                  class="w-full h-11 pl-9 pr-3 rounded-2xl border border-slate-100 text-xs font-bold focus:outline-none focus:border-primary/40 bg-slate-50 transition-all"
                >
              </div>
              <p class="text-[9px] text-slate-400 font-medium px-1">
                📍 Koordinat: {{ deliveryLat.toFixed(5) }}, {{ deliveryLng.toFixed(5) }}
              </p>
            </div>

            <!-- Payment Source Selection -->
            <div class="space-y-2">
              <label class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Metode Pembayaran</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  :class="[
                    'p-2.5 border rounded-2xl text-left transition-all flex flex-col justify-between h-[56px] select-none',
                    paymentSource === 'wallet' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50/50 text-slate-500'
                  ]"
                  @click="paymentSource = 'wallet'"
                >
                  <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                    <Wallet class="w-3.5 h-3.5" />
                    Wallet
                  </div>
                  <div class="text-[11px] font-black mt-0.5 truncate">
                    Rp {{ walletStore.balance.toLocaleString('id-ID') }}
                  </div>
                </button>
                <button
                  type="button"
                  :class="[
                    'p-2.5 border rounded-2xl text-left transition-all flex flex-col justify-between h-[56px] select-none',
                    paymentSource === 'qris' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50/50 text-slate-500'
                  ]"
                  @click="paymentSource = 'qris'"
                >
                  <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                    <CreditCard class="w-3.5 h-3.5" />
                    QRIS
                  </div>
                  <div class="text-[9px] font-bold text-slate-400 leading-none">
                    Bayar langsung
                  </div>
                </button>
              </div>
            </div>

            <!-- Voucher Input -->
            <div class="space-y-2 bg-amber-50/60 border border-amber-100 rounded-2xl p-3">
              <label class="text-[9px] font-extrabold text-amber-700 uppercase tracking-widest flex items-center gap-1">🎟️ Kode Voucher (contoh Merdeka81)</label>
              <div class="flex gap-2">
                <input
                  v-model="promoCodeInput"
                  type="text"
                  placeholder="Merdeka81"
                  class="flex-1 h-10 px-3 rounded-xl border border-amber-200 text-xs font-mono font-bold uppercase focus:outline-none focus:border-amber-400 bg-white"
                  @keyup.enter="handleApplyPromo()"
                />
                <button
                  class="h-10 px-5 bg-amber-500 text-white text-[11px] font-black rounded-xl active:scale-95 transition-all disabled:opacity-50 shrink-0"
                  :disabled="promoValidating"
                  @click="handleApplyPromo()"
                >
                  {{ promoValidating ? '...' : 'Apply' }}
                </button>
              </div>
              <div v-if="cartStore.appliedPromotion" class="flex items-center justify-between bg-white border border-emerald-200 rounded-xl px-3 py-2.5">
                <div class="text-[11px] min-w-0 flex-1">
                  <span class="font-black text-emerald-700">{{ cartStore.appliedPromotion.code || cartStore.appliedPromotion.title }}</span>
                  <span class="ml-1 text-emerald-600">-{{ formatRp(cartStore.appliedPromotion.discount_amount) }}</span>
                  <span v-if="cartStore.appliedPromotion.first_purchase_only" class="ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px]">First Buy</span>
                </div>
                <button class="text-[10px] font-bold text-rose-500 ml-2 shrink-0" @click="handleRemovePromo()">Hapus</button>
              </div>
              <p v-if="promoError" class="text-[10px] text-rose-600 font-medium">{{ promoError }}</p>
              <p v-else-if="activePromo && !cartStore.appliedPromotion" class="text-[10px] text-amber-700 leading-relaxed">Ada promo {{ activePromo.code || 'AUTO' }} {{ activePromo.discount_type==='flat' ? formatRp(activePromo.discount_value) : activePromo.discount_value+'%' }} - sisa {{ activePromo.max_uses - activePromo.used_count }} order. Ketik kode atau klik Apply.</p>
            </div>

            <!-- Price summary -->
            <div class="space-y-2.5 text-xs bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5">
              <div class="flex justify-between text-slate-600">
                <span>Subtotal ({{ cartItemCount }} item)</span>
                <span class="font-bold text-slate-800">Rp {{ cartSubtotal.toLocaleString('id-ID') }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Ongkos Kirim</span>
                <span class="font-bold text-slate-800">Rp 10.000</span>
              </div>
              <div v-if="cartStore.deliveryFeeSurcharge > 0" class="flex justify-between text-primary font-bold">
                <span class="flex items-center gap-1">
                  Surcharge
                  <span class="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 uppercase">+2RB/item</span>
                </span>
                <span>Rp {{ cartStore.deliveryFeeSurcharge.toLocaleString('id-ID') }}</span>
              </div>
              <div v-if="cartStore.appliedPromotion" class="flex justify-between text-emerald-600 font-black">
                <span class="truncate mr-2">Diskon {{ cartStore.appliedPromotion.code || 'AUTO' }}</span>
                <span class="shrink-0">-{{ formatRp(cartStore.discountTotal) }}</span>
              </div>
              <div class="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <span class="text-[14px] shrink-0">ℹ️</span>
                <div class="text-[10px] leading-relaxed">
                  <p class="font-bold text-indigo-800">Biaya layanan ditanggung merchant</p>
                  <p class="text-indigo-700/80">Harga yang kamu bayar tetap murni. Fee tier 1k/3k/5k dipotong dari saldo merchant saat settlement.</p>
                </div>
              </div>
              <div class="flex justify-between items-center font-black text-slate-900 pt-2.5 border-t border-slate-200">
                <span class="text-[13px]">Total Estimasi</span>
                <span class="text-[16px] text-primary">Rp {{ (cartSubtotal + 10000 + cartStore.deliveryFeeSurcharge - cartStore.discountTotal).toLocaleString('id-ID') }}</span>
              </div>
              <p v-if="cartStore.discountTotal>0" class="text-[10px] text-emerald-600 font-black text-right">Hemat {{ formatRp(cartStore.discountTotal) }}!</p>
            </div>
          </div>

          <!-- Footer fixed: checkout button only (tidak kejepit karena content sudah scrollable) -->
          <div class="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 border-t border-slate-100 space-y-2.5 shrink-0 bg-white">
            <button
              :disabled="checkoutLoading || cartStore.items.length === 0"
              class="w-full h-[52px] bg-primary text-white font-black text-[13px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-50"
              @click="handleCheckout"
            >
              <span v-if="checkoutLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <ShoppingBag v-else class="w-4 h-4" />
              {{ checkoutLoading ? 'Memproses...' : paymentSource === 'qris' ? 'Pesan & Bayar QRIS' : 'Pesan & Kunci Escrow' }}
            </button>
            <p class="text-[9px] text-slate-400 text-center font-medium pb-1">
              {{ paymentSource === 'qris' ? '⚡️ Bayar langsung instan QRIS' : '🔒 Saldo dikunci via Escrow' }}
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Variant + Topping Picker dengan Foto - FIXED scroll lock, overscroll-contain -->
    <Transition enter-active-class="transition ease-out duration-300" enter-from-class="translate-y-full" enter-to-class="translate-y-0" leave-active-class="transition ease-in duration-200" leave-from-class="translate-y-0" leave-to-class="translate-y-full">
      <div
        v-if="showVariantPicker"
        class="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm overscroll-contain"
        @click.self="showVariantPicker=false"
        @touchmove.prevent
        @wheel.prevent
      >
        <div
          class="bg-white rounded-t-[2rem] w-full max-w-md flex flex-col overflow-hidden overscroll-contain"
          style="max-height: 88dvh; max-height: 88vh; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;"
          @touchmove.stop
          @wheel.stop
        >
          <div class="px-6 pt-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
            <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="variantPickerMenu?.image_url" :src="variantPickerMenu.image_url" class="w-full h-full object-cover" /><span v-else class="text-lg">🍽️</span></div>
                <div class="min-w-0">
                  <h3 class="text-sm font-black text-slate-900 truncate">{{ variantPickerMenu?.name }}</h3>
                  <p class="text-[11px] text-slate-500 truncate">Pilih varian ± harga & topping + foto</p>
                  <p class="text-xs font-black text-primary mt-0.5">Rp {{ variantFinalPrice.toLocaleString('id-ID') }}</p>
                </div>
              </div>
              <button class="w-8 h-8 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 shrink-0 ml-2" @click="showVariantPicker=false"><X class="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div
            class="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-5"
            style="overscroll-behavior: contain; -webkit-overflow-scrolling: touch; touch-action: pan-y;"
            @touchmove.stop
          >
            <!-- Variant Groups -->
            <div v-for="vg in (variantPickerMenu?.variant_groups||variantPickerMenu?.variantGroups||[])" :key="vg.id" class="space-y-2">
              <p class="text-[11px] font-black uppercase flex items-center gap-1.5">{{ vg.name }} <span v-if="vg.is_required" class="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[8px] border border-rose-100">Wajib</span><span class="text-[9px] font-normal text-slate-400">{{ vg.type==='single'?'Pilih 1':'Boleh banyak' }}</span></p>
              <div class="space-y-2">
                <button v-for="opt in (vg.options||[])" :key="opt.id" class="w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all" :class="selectedVariantOption?.id===opt.id ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white hover:bg-slate-50'" @click="selectedVariantOption={ id: opt.id, label: opt.label, price_delta: opt.price_delta, image_url: opt.image_url }">
                  <div class="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.image_url" :src="opt.image_url" class="w-full h-full object-cover" /><span v-else class="text-[10px]">🍽️</span></div>
                  <div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">{{ opt.label }}</p><p class="text-[10px] font-bold" :class="opt.price_delta>=0 ? 'text-emerald-600' : 'text-rose-600'">{{ opt.price_delta===0 ? 'Harga dasar' : (opt.price_delta>0 ? `+Rp ${opt.price_delta.toLocaleString('id-ID')}` : `-Rp ${Math.abs(opt.price_delta).toLocaleString('id-ID')}`) }}</p></div>
                  <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" :class="selectedVariantOption?.id===opt.id ? 'border-primary bg-primary' : 'border-slate-300'"><div v-if="selectedVariantOption?.id===opt.id" class="w-2 h-2 rounded-full bg-white" /></div>
                </button>
              </div>
            </div>
            <!-- Topping Groups -->
            <div v-for="tg in (variantPickerMenu?.topping_groups||variantPickerMenu?.toppingGroups||[])" :key="tg.id" class="space-y-2">
              <p class="text-[11px] font-black uppercase flex items-center gap-1.5">{{ tg.name }} <span class="text-[9px] font-normal text-slate-400">{{ tg.type==='single'?'Pilih 1':'Boleh banyak' }}</span></p>
              <div class="space-y-2">
                <button v-for="opt in (tg.options||[])" :key="opt.id" class="w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all" :class="selectedToppings.find(t=>t.id===opt.id) ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white'" @click="(()=>{ const exists=selectedToppings.find(t=>t.id===opt.id); if (exists) selectedToppings=selectedToppings.filter(t=>t.id!==opt.id); else selectedToppings=[...selectedToppings,{ id:opt.id, label:opt.label, price_delta:opt.price_delta, image_url:opt.image_url }] })()">
                  <div class="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.image_url" :src="opt.image_url" class="w-full h-full object-cover" /><span v-else class="text-[9px]">🧀</span></div>
                  <div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">{{ opt.label }}</p><p class="text-[10px] font-bold text-emerald-600">+Rp {{ opt.price_delta.toLocaleString('id-ID') }}</p></div>
                  <div class="w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0" :class="selectedToppings.find(t=>t.id===opt.id) ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'"><span v-if="selectedToppings.find(t=>t.id===opt.id)">✓</span></div>
                </button>
              </div>
            </div>
          </div>
          <div class="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white shrink-0 space-y-3">
            <div class="flex justify-between text-xs"><span class="text-slate-500 font-medium">Total</span><span class="font-black text-primary text-[13px]">Rp {{ variantFinalPrice.toLocaleString('id-ID') }}</span></div>
            <button class="w-full h-[52px] bg-primary text-white rounded-2xl font-black text-[13px] flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all" @click="doAddToCart(variantPickerMenu, selectedVariantOption as any, selectedToppings as any)"><ShoppingBag class="w-4 h-4" /> Tambah ke Keranjang • Rp {{ variantFinalPrice.toLocaleString('id-ID') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
