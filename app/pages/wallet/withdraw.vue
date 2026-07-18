<script setup lang="ts">
import { ArrowLeft, Wallet, AlertCircle, ArrowRight, ShieldCheck } from '@lucide/vue'
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
const inquiryLoading = ref(false)
const errorMsg = ref('')

// Step 2 PIN
const pin = ref('')
const pinError = ref('')
const submitting = ref(false)

onMounted(async () => {
  await walletStore.fetchBalance()
  await walletStore.fetchWithdrawalChannels()
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

watch([selectedChannelId, accountNo], () => {
  // Reset verification if user changes channel or account no
  verifiedAccountName.value = ''
  errorMsg.value = ''
})

const handleVerifyAccount = async () => {
  if (!selectedChannel.value || !accountNo.value) return
  inquiryLoading.value = true
  errorMsg.value = ''
  try {
    const res = await walletStore.inquiryAccount(selectedChannel.value.code, accountNo.value)
    if (res && res.account_name) {
      verifiedAccountName.value = res.account_name
    } else {
      errorMsg.value = 'Rekening tidak terverifikasi'
    }
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    errorMsg.value = error.data?.message || 'Gagal memverifikasi nomor rekening. Periksa kembali input Anda.'
  } finally {
    inquiryLoading.value = false
  }
}

const proceedToPin = () => {
  errorMsg.value = ''
  if (!selectedChannel.value) {
    errorMsg.value = 'Silakan pilih metode penarikan'
    return
  }
  if (!verifiedAccountName.value) {
    errorMsg.value = 'Nomor rekening harus diverifikasi terlebih dahulu'
    return
  }
  const minAmount = selectedChannel.value?.min_amount ?? 0
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
    // If PIN is wrong, stay on step 2, but allow user to try again
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
        
        <!-- STEP 1: Main Form -->
        <div v-if="step === 1" class="space-y-4">
          <!-- 1. Select Method -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 tracking-wide">Pilih Metode Penarikan</label>
            <div class="relative">
              <select
                v-model="selectedChannelId"
                class="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-800 focus:border-primary focus:bg-white focus:outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="" disabled>Pilih Bank atau E-Wallet</option>
                <option 
                  v-for="ch in walletStore.withdrawalChannels" 
                  :key="ch.id" 
                  :value="ch.id"
                >
                  {{ ch.name }} (Min. {{ formatCurrency(ch.min_amount) }})
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <svg class="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          <!-- 2. Account No -->
          <div v-if="selectedChannelId" class="space-y-2">
            <label class="text-xs font-bold text-slate-700 tracking-wide">Nomor Rekening / ID Akun</label>
            <div class="flex gap-2">
              <input
                v-model="accountNo"
                type="text"
                placeholder="Masukkan nomor rekening"
                class="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-all"
              >
              <button
                :disabled="!accountNo || inquiryLoading"
                class="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[90px]"
                @click="handleVerifyAccount"
              >
                <span v-if="inquiryLoading" class="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span v-else>Verifikasi</span>
              </button>
            </div>

            <!-- Verified Name Alert -->
            <div 
              v-if="verifiedAccountName" 
              class="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100/50 animate-in fade-in duration-300"
            >
              <ShieldCheck class="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <div class="text-xs">
                <span class="font-bold">Pemilik Rekening:</span>
                <p class="font-extrabold uppercase mt-0.5 tracking-wide">{{ verifiedAccountName }}</p>
              </div>
            </div>
          </div>

          <!-- 3. Amount -->
          <div v-if="verifiedAccountName" class="space-y-2 animate-in fade-in slide-in-from-top-3 duration-300">
            <div class="flex justify-between items-baseline">
              <label class="text-xs font-bold text-slate-700 tracking-wide">Nominal Penarikan</label>
              <span class="text-[10px] text-slate-400 font-bold">Min. {{ formatCurrency(selectedChannel?.min_amount || 10000) }}</span>
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
            <div v-if="amount && amount >= (selectedChannel?.min_amount || 10000)" class="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100 text-xs">
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
            v-if="verifiedAccountName"
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
              <span class="font-bold text-slate-800 uppercase">{{ selectedChannel?.name }} - {{ accountNo }}</span>
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
