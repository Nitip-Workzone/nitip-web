<script setup lang="ts">
import { ArrowLeft, ShoppingBag, CreditCard, ChevronRight, MapPin, Store } from '@lucide/vue'
import { useUserOrdersStore } from '~/stores/user-orders'
import { useToastStore } from '~/stores/toast'
import { useCurrencyInput } from '~/composables/useCurrencyInput'

definePageMeta({
  layout: 'user',
})

const router = useRouter()
const ordersStore = useUserOrdersStore()
const toastStore = useToastStore()
const { request } = useApi()

// Multi-step state
const step = ref(1)

// Form data
const serviceCategory = ref<'beli' | 'kirim'>('beli')
const itemDetails = ref('')
const estimatedCostInput = useCurrencyInput()
const paymentMethod = ref<'cod' | 'escrow'>('escrow')
const paymentSource = ref<'wallet' | 'qris'>('wallet')
const tipInput = useCurrencyInput()

// Weight & Volume
const weightOptions = [
  { label: '0.5 kg', value: 0.5 },
  { label: '1 kg', value: 1 },
  { label: '2 kg', value: 2 },
  { label: '5 kg', value: 5 },
]
const volumeOptions = [
  { label: 'Kecil (S)', value: 1 },
  { label: 'Sedang (M)', value: 5 },
  { label: 'Besar (L)', value: 15 },
]
const selectedWeight = ref(0.5)
const selectedVolume = ref(1)

// Location data
const pickupAddress = ref('')
const pickupLat = ref<number | null>(null)
const pickupLng = ref<number | null>(null)
const deliveryAddress = ref('')
const deliveryLat = ref<number | null>(null)
const deliveryLng = ref<number | null>(null)

// Location picker modal state
const showPickupPicker = ref(false)
const showDeliveryPicker = ref(false)

// Fee estimation
const deliveryFee = ref(0)
const estimatingFee = ref(false)

// Auto-detect current location for delivery on first load
const locationDetected = ref(false)

function detectCurrentLocation() {
  if (!navigator.geolocation || locationDetected.value) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!deliveryAddress.value) {
        deliveryLat.value = pos.coords.latitude
        deliveryLng.value = pos.coords.longitude
        // Do reverse geocode to get address
        reverseGeocodeDelivery(pos.coords.latitude, pos.coords.longitude)
      }
      locationDetected.value = true
    },
    () => {
      locationDetected.value = true
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

async function reverseGeocodeDelivery(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`
    )
    const data = await response.json()
    deliveryAddress.value = data.display_name || `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  } catch {
    deliveryAddress.value = `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  }
}

function onPickupSelected(payload: { lat: number; lng: number; address: string }) {
  pickupLat.value = payload.lat
  pickupLng.value = payload.lng
  pickupAddress.value = payload.address
  showPickupPicker.value = false
}

function onDeliverySelected(payload: { lat: number; lng: number; address: string }) {
  deliveryLat.value = payload.lat
  deliveryLng.value = payload.lng
  deliveryAddress.value = payload.address
  showDeliveryPicker.value = false
}

async function estimateFee() {
  if (!pickupLat.value || !pickupLng.value || !deliveryLat.value || !deliveryLng.value) return
  estimatingFee.value = true
  try {
    const res = await request<{ data: { estimated_fee: number } }>('/orders/estimate-fee', {
      method: 'POST',
      body: {
        pickup_lat: pickupLat.value,
        pickup_lng: pickupLng.value,
        delivery_lat: deliveryLat.value,
        delivery_lng: deliveryLng.value,
        weight_kg: selectedWeight.value,
        volume_liters: selectedVolume.value,
      }
    })
    if (res.data) {
      deliveryFee.value = res.data.estimated_fee || 0
    }
  } catch (err) {
    console.error('Gagal memperkirakan ongkir:', err)
  } finally {
    estimatingFee.value = false
  }
}

function nextStep() {
  if (step.value === 1) {
    if (!itemDetails.value) {
      toastStore.add('Harap isi detail barang/paket.')
      return
    }
    if (serviceCategory.value === 'beli') {
      const cost = estimatedCostInput.numericValue.value
      if (!cost || cost <= 0) {
        toastStore.add('Harap isi estimasi harga belanja dengan benar.')
        return
      }
    }
    // Auto-detect location when entering step 2
    detectCurrentLocation()
  } else if (step.value === 2) {
    if (!pickupAddress.value || !deliveryAddress.value) {
      toastStore.add('Harap pilih lokasi penjemputan dan pengantaran.')
      return
    }
    estimateFee()
  }
  step.value++
}

function prevStep() {
  step.value--
}

async function submitOrder() {
  const totalTip = tipInput.numericValue.value || 0
  const cost = estimatedCostInput.numericValue.value || 0
  const payload = {
    item_details: itemDetails.value,
    estimated_cost: serviceCategory.value === 'kirim' ? 0 : cost,
    pickup_address: pickupAddress.value,
    pickup_lat: pickupLat.value!,
    pickup_lng: pickupLng.value!,
    delivery_address: deliveryAddress.value,
    delivery_lat: deliveryLat.value!,
    delivery_lng: deliveryLng.value!,
    tip_amount: totalTip,
    payment_method: paymentMethod.value,
    payment_source: paymentMethod.value === 'escrow' ? paymentSource.value : 'wallet',
    weight_kg: selectedWeight.value,
    volume_liters: selectedVolume.value,
    service_category: serviceCategory.value,
  }

  const order = await ordersStore.createOrder(payload)
  if (order) {
    toastStore.add('Pesanan berhasil dibuat!')
    router.push(`/orders/${order.id}`)
  } else {
    toastStore.add('Gagal membuat pesanan. Silakan periksa saldo Anda atau coba lagi.')
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}
</script>

<template>
  <div class="p-4 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <button class="p-2 -ml-2 text-muted-foreground hover:text-foreground" @click="step > 1 ? prevStep() : router.push('/dashboard')">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-lg font-bold text-foreground">Titip Beli Baru</h1>
        <p class="text-[11px] text-muted-foreground">Langkah {{ step }} dari 3</p>
      </div>
    </div>

    <!-- Step Progress Bar -->
    <div class="flex gap-2 h-1 bg-slate-100 rounded-full overflow-hidden">
      <div 
        :class="['h-full rounded-full transition-all duration-300', step >= 1 ? 'bg-primary' : 'bg-transparent']"
        :style="{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }"
      />
    </div>

      <!-- Step 1: Detail Barang -->
      <div v-if="step === 1" class="space-y-4">
        <!-- Service Category Tabs -->
        <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
          <button 
            type="button"
            :class="[
              'py-2 px-3 text-xs font-bold rounded-xl transition-all',
              serviceCategory === 'beli' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            ]"
            @click="serviceCategory = 'beli'"
          >
            Titip Beli
          </button>
          <button 
            type="button"
            :class="[
              'py-2 px-3 text-xs font-bold rounded-xl transition-all',
              serviceCategory === 'kirim' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            ]"
            @click="serviceCategory = 'kirim'"
          >
            Kirim Barang
          </button>
        </div>

        <div class="bg-white border border-border/40 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {{ serviceCategory === 'kirim' ? 'Detail Paket / Barang Kiriman' : 'Detail Barang Titipan' }}
            </label>
            <textarea 
              v-model="itemDetails" 
              rows="4" 
              :placeholder="serviceCategory === 'kirim' ? 'Tuliskan jenis barang paket, instruksi pengantaran, atau catatan khusus...' : 'Tuliskan nama barang, jumlah, varian, warna, atau catatan detail lainnya...'"
              class="w-full text-xs p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          <div v-if="serviceCategory === 'beli'" class="space-y-1.5">
            <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estimasi Harga Barang</label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
              <input 
                :value="estimatedCostInput.displayValue.value"
                type="text"
                inputmode="numeric"
                placeholder="50.000"
                class="w-full text-xs pl-10 p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50"
                @input="estimatedCostInput.onInput"
              >
            </div>
            <p class="text-[10px] text-muted-foreground">Isi dengan perkiraan harga total barang belanjaan Anda.</p>
          </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Berat (Estimasi)</label>
            <select
              v-model="selectedWeight"
              class="w-full text-xs p-3.5 border border-border/60 rounded-2xl bg-white focus:outline-none focus:border-primary/50 cursor-pointer appearance-none"
            >
              <option v-for="opt in weightOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ukuran</label>
            <select
              v-model="selectedVolume"
              class="w-full text-xs p-3.5 border border-border/60 rounded-2xl bg-white focus:outline-none focus:border-primary/50 cursor-pointer appearance-none"
            >
              <option v-for="opt in volumeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <button 
        class="w-full bg-primary text-white text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] shadow-md shadow-primary/10" 
        @click="nextStep"
      >
        Lanjut ke Lokasi
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Step 2: Lokasi Penjemputan & Pengantaran -->
    <div v-if="step === 2" class="space-y-4">
      <div class="bg-white border border-border/40 rounded-3xl p-5 shadow-sm space-y-3">
        <!-- Pickup Location Card -->
        <button
          class="w-full p-4 border border-border/60 rounded-2xl flex items-center gap-3 hover:bg-slate-50 transition-all text-left"
          @click="showPickupPicker = true"
        >
          <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Store class="w-5 h-5 text-orange-500" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lokasi Belanja / Penjemputan</p>
            <p
              :class="pickupAddress ? 'text-xs font-semibold text-foreground' : 'text-xs text-muted-foreground'"
              class="mt-0.5 truncate"
            >
              {{ pickupAddress || 'Pilih lokasi toko/warung...' }}
            </p>
          </div>
          <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        <!-- Delivery Location Card -->
        <button
          class="w-full p-4 border border-border/60 rounded-2xl flex items-center gap-3 hover:bg-slate-50 transition-all text-left"
          @click="showDeliveryPicker = true"
        >
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin class="w-5 h-5 text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alamat Pengantaran (Tujuan)</p>
            <p
              :class="deliveryAddress ? 'text-xs font-semibold text-foreground' : 'text-xs text-muted-foreground'"
              class="mt-0.5 truncate"
            >
              {{ deliveryAddress || 'Pilih lokasi tujuan...' }}
            </p>
          </div>
          <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        <p class="text-[10px] text-muted-foreground text-center">Tap kartu untuk memilih lokasi dari peta atau cari alamat</p>
      </div>

      <button 
        class="w-full bg-primary text-white text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] shadow-md shadow-primary/10" 
        @click="nextStep"
      >
        Lanjut ke Pembayaran
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Step 3: Pembayaran & Konfirmasi -->
    <div v-if="step === 3" class="space-y-6">
      <!-- Metode Pembayaran -->
      <div class="bg-white border border-border/40 rounded-3xl p-5 shadow-sm space-y-4">
        <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Metode Pembayaran</label>
        
        <div class="grid grid-cols-2 gap-3">
          <button 
            :class="[
              'p-4 border rounded-2xl text-center transition-all flex flex-col items-center gap-1.5',
              paymentMethod === 'escrow' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground'
            ]"
            @click="paymentMethod = 'escrow'"
          >
            <CreditCard class="w-5 h-5" />
            <span class="text-xs font-bold">Nitip Pay (Escrow)</span>
          </button>

          <button 
            :class="[
              'p-4 border rounded-2xl text-center transition-all flex flex-col items-center gap-1.5',
              paymentMethod === 'cod' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 text-muted-foreground'
            ]"
            @click="paymentMethod = 'cod'"
          >
            <ShoppingBag class="w-5 h-5" />
            <span class="text-xs font-bold">Bayar di Tempat (COD)</span>
          </button>
        </div>

        <!-- Sumber Dana Escrow (Wallet / QRIS) -->
        <div v-if="paymentMethod === 'escrow'" class="pt-4 border-t border-slate-100 space-y-3">
          <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Sumber Dana Escrow</label>
          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button"
              :class="[
                'p-3 border rounded-xl text-center transition-all flex items-center justify-center gap-2',
                paymentSource === 'wallet' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border/60 text-muted-foreground text-xs'
              ]"
              @click="paymentSource = 'wallet'"
            >
              <span class="w-2 h-2 rounded-full" :class="paymentSource === 'wallet' ? 'bg-primary' : 'bg-transparent border border-slate-400'" />
              Saldo Wallet
            </button>

            <button 
              type="button"
              :class="[
                'p-3 border rounded-xl text-center transition-all flex items-center justify-center gap-2',
                paymentSource === 'qris' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border/60 text-muted-foreground text-xs'
              ]"
              @click="paymentSource = 'qris'"
            >
              <span class="w-2 h-2 rounded-full" :class="paymentSource === 'qris' ? 'bg-primary' : 'bg-transparent border border-slate-400'" />
              Bayar QRIS
            </button>
          </div>
        </div>
      </div>

      <!-- Tip untuk Runner -->
      <div class="bg-white border border-border/40 rounded-3xl p-5 shadow-sm space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tip Tambahan untuk Runner (Opsional)</label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
            <input 
              :value="tipInput.displayValue.value"
              type="text"
              inputmode="numeric"
              placeholder="5.000"
              class="w-full text-xs pl-10 p-3.5 border border-border/60 rounded-2xl focus:outline-none focus:border-primary/50"
              @input="tipInput.onInput"
            >
          </div>
          <p class="text-[10px] text-muted-foreground">Berikan tip ekstra agar runner lebih cepat menerima pesanan Anda.</p>
        </div>
      </div>

      <!-- Rincian Biaya -->
      <div class="bg-white border border-border/40 rounded-3xl p-5 shadow-sm space-y-3">
        <label class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Rincian Biaya</label>
        
        <div class="flex justify-between text-xs">
          <span class="text-muted-foreground">Estimasi Harga Barang</span>
          <span class="font-medium text-foreground">{{ formatCurrency(estimatedCostInput.numericValue.value || 0) }}</span>
        </div>

        <div class="flex justify-between text-xs">
          <span class="text-muted-foreground">Ongkos Kirim (Estimasi)</span>
          <span v-if="estimatingFee" class="w-10 h-4 bg-slate-100 rounded animate-pulse" />
          <span v-else class="font-medium text-foreground">{{ formatCurrency(deliveryFee) }}</span>
        </div>

        <div v-if="tipInput.numericValue.value" class="flex justify-between text-xs">
          <span class="text-muted-foreground">Tip Tambahan</span>
          <span class="font-medium text-foreground">{{ formatCurrency(tipInput.numericValue.value || 0) }}</span>
        </div>

        <div class="flex justify-between text-xs font-extrabold text-foreground pt-3 border-t border-slate-100">
          <span>Total Pembayaran</span>
          <span class="text-primary text-sm">{{ formatCurrency((estimatedCostInput.numericValue.value || 0) + deliveryFee + (tipInput.numericValue.value || 0)) }}</span>
        </div>
      </div>

      <button 
        :disabled="ordersStore.actionLoading" 
        class="w-full bg-primary text-white text-xs font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] shadow-md shadow-primary/10"
        @click="submitOrder"
      >
        <span v-if="ordersStore.actionLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Buat Order Sekarang
      </button>
    </div>

    <!-- Location Picker Modals -->
    <CommonLocationPickerModal
      v-if="showPickupPicker"
      title="Pilih Lokasi Belanja"
      :initial-lat="pickupLat ?? 0.8811"
      :initial-lng="pickupLng ?? 124.014"
      @close="showPickupPicker = false"
      @select="onPickupSelected"
    />

    <CommonLocationPickerModal
      v-if="showDeliveryPicker"
      title="Pilih Lokasi Pengantaran"
      :initial-lat="deliveryLat ?? 0.8811"
      :initial-lng="deliveryLng ?? 124.014"
      @close="showDeliveryPicker = false"
      @select="onDeliverySelected"
    />
  </div>
</template>