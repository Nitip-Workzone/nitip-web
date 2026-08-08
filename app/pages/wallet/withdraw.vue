<script setup lang="ts">
import { ArrowLeft, Wallet, AlertCircle, ArrowRight, ShieldCheck, Lock } from '@lucide/vue'
import { useUserWalletStore } from '~/stores/user-wallet'
import { useToastStore } from '~/stores/toast'
import { useCurrencyInput } from '~/composables/useCurrencyInput'

definePageMeta({
  layout: 'user',
})

const walletStore = useUserWalletStore()
const toastStore = useToastStore()
const router = useRouter()

const step = ref<1 | 2>(1) // Step 1: Channel & Account & Amount. Step 2: PIN Verification.
const selectedChannelId = ref('')
const accountNo = ref('')
const amountInput = useCurrencyInput()
const verifiedAccountName = ref('')
const errorMsg = ref('')

const selectedType = ref<'TRANSFER' | 'CASH'>('TRANSFER')
const registeredAccount = ref<{ account_no: string; account_name: string; bank_name: string } | null>(null)
const hasCheckedAccount = ref(false)
const withdrawalSchedule = ref('Setiap hari pukul 09:00 WITA')

const hasManualChannel = computed(() => {
  return walletStore.withdrawalChannels.some(c => c.code.toLowerCase() === 'manual' && c.is_active)
})

// Step 2 PIN
const pin = ref('')
const pinError = ref('')
const submitting = ref(false)

onMounted(async () => {
  await walletStore.fetchBalance()
  await walletStore.fetchWithdrawalChannels()
  
  // Fetch dynamic withdrawal schedule configuration
  try {
    const { request } = useApi()
    const configRes = await request<{ data: Record<string, unknown> }>('/configs/public')
    if (configRes.data && (configRes.data as { withdrawal_schedule?: string }).withdrawal_schedule) {
      {
        const _data = configRes.data as { withdrawal_schedule?: string }
        if (_data.withdrawal_schedule) withdrawalSchedule.value = _data.withdrawal_schedule
      }
    }
  } catch { /* noop */ }

  // Fetch registered bank account
  registeredAccount.value = (await walletStore.fetchRegisteredBankAccount()) as { account_no: string; account_name: string; bank_name: string } | null
  hasCheckedAccount.value = true

  if (registeredAccount.value) {
    accountNo.value = registeredAccount.value!.account_no
      verifiedAccountName.value = registeredAccount.value!.account_name
  }
})

const selectedChannel = computed(() => {
  return walletStore.withdrawalChannels.find(c => c.id === selectedChannelId.value)
})

const amount = computed(() => amountInput.numericValue.value || 0)

const adminFee = computed(() => {
  if (!selectedChannel.value || !amount.value) return 0
  const flat = selectedChannel.value.admin_fee_flat || 0
  const pct = selectedChannel.value.admin_fee_percent || 0
  return flat + (amount.value * pct / 100)
})

const totalDeduction = computed(() => {
  if (!amount.value) return 0
  return amount.value + adminFee.value
})

const syncChannel = () => {
  const channels = walletStore.withdrawalChannels
  if (!channels || channels.length === 0) return

  if (selectedType.value === 'TRANSFER' && registeredAccount.value) {
    const matched = channels.find(c => c.code.toLowerCase() === registeredAccount.value.bank_name.toLowerCase())
    if (matched) {
      selectedChannelId.value = matched.id
    } else {
      selectedChannelId.value = channels[0].id
    }
  } else if (selectedType.value === 'CASH') {
    const matched = channels.find(c => c.code.toLowerCase() === 'manual')
    if (matched) {
      selectedChannelId.value = matched.id
    } else {
      selectedChannelId.value = channels[0].id
    }
  }
}

watch([() => walletStore.withdrawalChannels, registeredAccount, selectedType], () => {
  syncChannel()
}, { immediate: true })

const proceedToPin = () => {
  errorMsg.value = ''
  if (!selectedChannel.value) {
    errorMsg.value = 'Silakan pilih metode penarikan'
    return
  }
  if (!verifiedAccountName.value) {
    errorMsg.value = 'Rekening tujuan belum didaftarkan'
    return
  }
  const minAmount = Math.max(selectedChannel.value?.min_amount ?? 50000, 50000)
  if (!amount.value || amount.value < minAmount) {
    errorMsg.value = `Minimal penarikan adalah ${formatCurrency(minAmount)}`
    return
  }
  if (totalDeduction.value > walletStore.balance) {
    errorMsg.value = 'Saldo Anda tidak mencukupi (termasuk biaya admin)'
    return
  }

  step.value = 2
}

const handleWithdraw = async () => {
  if (pin.value.length !== 6 || !/^\d+$/.test(pin.value)) {
    pinError.value = 'PIN harus 6 digit angka'
    return
  }

  submitting.value = true
  pinError.value = ''
  try {
    await walletStore.withdraw({
      amount: amount.value,
      channel_id: selectedChannelId.value,
      pin: pin.value,
      metadata: {
        account_no: accountNo.value,
        account_name: verifiedAccountName.value
      }
    })
    toastStore.add('Penarikan dana berhasil diajukan!')
    router.push('/wallet/history')
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    pinError.value = error.data?.message || 'Gagal memproses penarikan. Pastikan PIN Anda benar.'
  } finally {
    submitting.value = false
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50">
    <!-- Top Gradient Accent -->
    <div class="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

    <div class="relative z-10 max-w-md mx-auto px-5 pt-5 pb-24 space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <button 
          class="p-2 -ml-2 text-slate-500 hover:text-slate-900 bg-white rounded-full border border-slate-100 shadow-sm transition-all active:scale-90"
          @click="step === 2 ? step = 1 : router.push('/dashboard')"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-lg font-black text-slate-900 tracking-tight">Tarik Saldo</h1>
      </div>

      <!-- Manual Transfer Notice Banner -->
      <div class="bg-amber-50 rounded-2xl p-4 border border-amber-200/60 flex items-start gap-3 text-amber-800 text-xs">
        <AlertCircle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div class="space-y-1">
          <p class="font-bold text-amber-950">Metode Pencairan Manual Transfer</p>
          <p class="leading-relaxed font-semibold">Pencairan dana menggunakan transfer manual ke rekening Anda dengan estimasi waktu maksimal 1x12 jam.</p>
          <p class="leading-relaxed font-bold mt-1 text-[10px] uppercase tracking-wider text-amber-900">Jadwal Pencairan: {{ withdrawalSchedule }}</p>
        </div>
      </div>

      <!-- Balance Card -->
      <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
        <div class="space-y-1">
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Aktif Anda</p>
          <h2 class="text-xl font-extrabold text-slate-900 leading-none">
            {{ formatCurrency(walletStore.balance) }}
          </h2>
        </div>
        <div class="p-3 bg-primary/5 rounded-xl text-primary">
          <Wallet class="w-6 h-6" />
        </div>
      </div>

      <!-- Main Step Container -->
      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft space-y-5">
        
        <!-- Loading State -->
        <div v-if="!hasCheckedAccount" class="py-12 flex flex-col items-center justify-center space-y-3">
          <span class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p class="text-xs text-slate-400 font-bold">Memeriksa rekening terdaftar...</p>
        </div>

        <!-- Account Not Registered Warning -->
        <div v-else-if="!registeredAccount" class="py-6 text-center space-y-4">
          <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
            <AlertCircle class="w-8 h-8 text-amber-600" />
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-extrabold text-slate-900">Rekening Belum Terdaftar</h3>
            <p class="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Pendaftaran rekening tujuan pencairan dana hanya dapat dilakukan oleh admin demi alasan keamanan. Silakan hubungi admin atau CS untuk mendaftarkan rekening Anda.
            </p>
          </div>
          <button 
            class="w-full h-11 bg-slate-900 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
            @click="router.push('/dashboard')"
          >
            Kembali ke Dashboard
          </button>
        </div>

        <!-- STEP 1: Main Form (Only shown if account is registered) -->
        <div v-else-if="step === 1" class="space-y-4">
          <!-- 1. Select Method -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 tracking-wide">Pilih Metode Penarikan</label>
            
            <!-- Segmented Control for Transfer vs Cash -->
            <div v-if="hasManualChannel" class="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                :class="selectedType === 'TRANSFER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
                @click="selectedType = 'TRANSFER'"
              >
                Transfer Rekening
              </button>
              <button
                type="button"
                class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                :class="selectedType === 'CASH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
                @click="selectedType = 'CASH'"
              >
                Tarik Tunai (Cash)
              </button>
            </div>

            <!-- Read Only Channel Display -->
            <div v-if="selectedType === 'CASH'" class="relative flex items-center mt-2">
              <div v-if="selectedChannel" class="absolute left-3 flex items-center pointer-events-none">
                <img 
                  v-if="['BCA', 'MANDIRI', 'BRI', 'DANA', 'OVO'].includes(selectedChannel.code.toUpperCase())" 
                  :src="`/images/providers/${selectedChannel.code.toLowerCase()}.png`" 
                  class="w-7 h-7 object-contain p-0.5 bg-white rounded border border-slate-100"
                  alt="Channel Logo"
                >
                <div v-else class="w-7 h-7 flex items-center justify-center bg-white rounded border border-slate-100 text-xs shrink-0 select-none">
                  💵
                </div>
              </div>
              <div
                class="w-full h-12 flex items-center rounded-xl border border-slate-200 bg-slate-100/80 pr-10 text-sm font-semibold text-slate-800 focus:outline-none transition-all cursor-not-allowed"
                :class="selectedChannel ? 'pl-12' : 'pl-4'"
              >
                {{ selectedChannel ? `${selectedChannel.name} (Estimasi: ${selectedChannel.estimated_time})` : 'Metode tidak terpilih' }}
              </div>
              <div class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <Lock class="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          <!-- 2. Account Details Card (Read Only) -->
          <div v-if="selectedChannelId && selectedType === 'TRANSFER'" class="space-y-2">
            <label class="text-xs font-bold text-slate-700 tracking-wide">Rekening Tujuan Terdaftar</label>
            <div class="flex items-center gap-4 p-4 bg-slate-50 text-slate-800 rounded-2xl border border-slate-100">
              <img 
                v-if="['BCA', 'MANDIRI', 'BRI', 'DANA', 'OVO'].includes(registeredAccount.bank_name.toUpperCase())" 
                :src="`/images/providers/${registeredAccount.bank_name.toLowerCase()}.png`" 
                class="w-12 h-12 object-contain p-1.5 bg-white rounded-xl border border-slate-200 shrink-0"
                alt="Bank Logo"
              >
              <div v-else class="p-3 bg-primary/5 rounded-xl text-primary shrink-0">
                <ShieldCheck class="w-6 h-6 text-emerald-600" />
              </div>
              <div class="text-xs space-y-0.5 flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="font-black text-slate-900 uppercase tracking-wide">{{ registeredAccount.bank_name }}</p>
                  <span class="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase">Terverifikasi</span>
                </div>
                <p class="font-mono font-bold text-slate-600">{{ registeredAccount.account_no }}</p>
                <p class="font-extrabold text-slate-900 uppercase">{{ registeredAccount.account_name }}</p>
              </div>
            </div>
          </div>

          <!-- 3. Amount -->
          <div v-if="selectedChannelId" class="space-y-2 animate-in fade-in slide-in-from-top-3 duration-300">
            <div class="flex justify-between items-baseline">
              <label class="text-xs font-bold text-slate-700 tracking-wide">Nominal Penarikan</label>
              <span class="text-[10px] text-slate-400 font-bold">Min. {{ formatCurrency(Math.max(selectedChannel?.min_amount || 50000, 50000)) }}</span>
            </div>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">Rp</span>
              <input
                :value="amountInput.displayValue.value"
                type="text"
                inputmode="numeric"
                placeholder="0"
                class="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm font-extrabold text-slate-800 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-all"
                @input="amountInput.onInput"
              >
            </div>

            <!-- Fee & Net Info -->
            <div v-if="amount && amount >= Math.max(selectedChannel?.min_amount || 50000, 50000)" class="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100 text-xs">
              <div class="flex justify-between text-slate-500">
                <span>Biaya Admin ({{ selectedChannel?.name }}):</span>
                <span class="font-bold">{{ adminFee > 0 ? formatCurrency(adminFee) : 'Gratis' }}</span>
              </div>
              <div class="flex justify-between text-slate-800 font-bold border-t border-slate-200/60 pt-1.5">
                <span>Total Potong Saldo:</span>
                <span class="text-primary">{{ formatCurrency(totalDeduction) }}</span>
              </div>
            </div>
          </div>

          <!-- Action Error -->
          <div v-if="errorMsg" class="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 text-xs">
            <AlertCircle class="w-4.5 h-4.5 shrink-0" />
            <span>{{ errorMsg }}</span>
          </div>

          <!-- Continue Button -->
          <button
            v-if="selectedChannelId && amount >= Math.max(selectedChannel?.min_amount || 50000, 50000)"
            class="w-full h-12 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover-lift transition-all active:scale-[0.98] shadow-sm shadow-primary/20"
            @click="proceedToPin"
          >
            Lanjutkan Penarikan
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>

        <!-- STEP 2: PIN Verification -->
        <div v-if="step === 2" class="space-y-5 animate-in fade-in duration-300">
          <div class="text-center space-y-1.5">
            <h3 class="text-base font-extrabold text-slate-900">Verifikasi PIN</h3>
            <p class="text-xs text-slate-400">Masukkan 6-digit PIN keamanan dompet Anda untuk memproses penarikan.</p>
          </div>

          <!-- PIN Inputs -->
          <div class="space-y-2">
            <input
              v-model="pin"
              type="password"
              maxlength="6"
              placeholder="••••••"
              class="w-full h-12 text-center text-xl font-extrabold tracking-[0.5em] rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:tracking-normal"
            >
            <p v-if="pinError" class="text-center text-xs font-semibold text-rose-500">{{ pinError }}</p>
          </div>

          <!-- Summary Summary -->
          <div class="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 text-xs space-y-2">
            <div class="flex justify-between">
              <span class="text-slate-400">Tujuan:</span>
              <span class="font-bold text-slate-800 uppercase">
                {{ selectedChannel?.name }} <template v-if="selectedType === 'TRANSFER'">- {{ accountNo }}</template>
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Pemilik Rekening:</span>
              <span class="font-bold text-slate-800 uppercase">{{ verifiedAccountName }}</span>
            </div>
            <div class="flex justify-between border-t border-slate-200/50 pt-2 font-bold text-slate-900">
              <span>Dana Dikirim:</span>
              <span class="text-primary">{{ formatCurrency(amount || 0) }}</span>
            </div>
          </div>

          <!-- Confirm Button -->
          <button
            :disabled="submitting || pin.length !== 6"
            class="w-full h-12 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover-lift transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-primary/20"
            @click="handleWithdraw"
          >
            <span v-if="submitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Konfirmasi &amp; Tarik Dana
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
