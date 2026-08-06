<script setup lang="ts">
import { Settings, Save, RefreshCw, AlertCircle } from '@lucide/vue'
import { useConfigsStore } from '~/stores/configs'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'admin',
})

const configsStore = useConfigsStore()
const { success, error } = useToast()

const editedValues = ref<Record<string, string>>({})
const editedDescriptions = ref<Record<string, string>>({})

const fetchAllConfigs = async () => {
  await configsStore.fetchConfigs()
  // Initialize editable fields
  configsStore.configs.forEach((c) => {
    editedValues.value[c.key] = c.value
    editedDescriptions.value[c.key] = c.description || ''
  })
}

onMounted(() => {
  fetchAllConfigs()
})

const handleSave = async (key: string) => {
  const value = editedValues.value[key] || ''
  const desc = editedDescriptions.value[key] || ''
  const ok = await configsStore.updateConfig(key, value, desc)
  if (ok) {
    success(`Konfigurasi "${key}" berhasil diperbarui.`)
  } else {
    error(`Gagal memperbarui konfigurasi "${key}".`)
  }
}

// Helper to get friendly human-readable label
const getConfigLabel = (key: string): string => {
  const labels: Record<string, string> = {
    // Tarif Regular
    fee_base: 'Tarif Dasar Reguler (Jarak Jauh)',
    fee_per_km: 'Tarif per Kilometer (Reguler)',
    fee_per_kg: 'Tarif per Kilogram (Reguler)',
    fee_per_liter: 'Tarif per Liter Volume (Reguler)',

    // Tarif Instant
    fee_short_base: 'Tarif Dasar Instan (Jarak Dekat)',
    fee_short_per_kg: 'Tarif per Kilogram (Instan)',

    // Jasa & Layanan
    platform_fee_percent: 'Persentase Biaya Layanan Platform',
    order_checking_fee: 'Biaya Pemeriksaan / Deposit Pembatalan',

    // COD
    cod_enabled: 'Status Aktif COD',
    cod_max_amount: 'Batas Maksimal Nominal COD',
    cod_max_distance_km: 'Jarak Maksimal Pengantaran COD',
    min_trust_score_cod: 'Minimal Trust Score untuk COD',

    // KYC Limits
    kyc_daily_order_limit: 'Batas Pesanan Harian Non-KYC',
    kyc_daily_withdrawal_limit: 'Batas Penarikan Harian Non-KYC',

    // Lain-lain
    max_search_radius_km: 'Radius Maksimal Pencarian Mitra',
    support_auto_close_days: 'Auto-Close Tiket Dukungan (Hari)',
    support_cs_max_concurrent: 'Maksimal Tiket Aktif per CS',
    base_delivery_fee: 'Biaya Pengantaran Dasar (Flat Legacy)',
  }
  return labels[key] || key
}

// Group configs for better UI organization
const groupedConfigs = computed(() => {
  const groups = {
    'Tarif Reguler (Jarak Jauh > 5km)': [] as typeof configsStore.configs,
    'Tarif Instan (Jarak Dekat ≤ 5km)': [] as typeof configsStore.configs,
    'Biaya Layanan & Pemeriksaan': [] as typeof configsStore.configs,
    'Batas Transaksi & COD': [] as typeof configsStore.configs,
    'Limit Akun (Non-KYC)': [] as typeof configsStore.configs,
    'Lain-lain': [] as typeof configsStore.configs,
  }

  configsStore.configs.forEach((c) => {
    if (c.key.startsWith('fee_short_')) {
      groups['Tarif Instan (Jarak Dekat ≤ 5km)'].push(c)
    } else if (c.key.startsWith('fee_')) {
      groups['Tarif Reguler (Jarak Jauh > 5km)'].push(c)
    } else if (c.key === 'platform_fee_percent' || c.key === 'order_checking_fee') {
      groups['Biaya Layanan & Pemeriksaan'].push(c)
    } else if (c.key.startsWith('cod_') || c.key === 'min_trust_score_cod') {
      groups['Batas Transaksi & COD'].push(c)
    } else if (c.key.startsWith('kyc_') || c.key.includes('limit')) {
      groups['Limit Akun (Non-KYC)'].push(c)
    } else {
      groups['Lain-lain'].push(c)
    }
  })

  // Filter out empty groups
  return Object.fromEntries(Object.entries(groups).filter(([_, list]) => list.length > 0))
})
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">System Settings</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Modifikasi konfigurasi tarif, batasan COD, dan limit harian sistem secara langsung.
        </p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="configsStore.loading"
        @click="fetchAllConfigs"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </UiButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="!configsStore.loading && configsStore.configs.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center gap-3 bg-card rounded-xl border border-border"
    >
      <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Settings class="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p class="font-semibold text-foreground">Tidak ada konfigurasi ditemukan</p>
        <p class="text-sm text-muted-foreground mt-0.5">Hubungi pengembang sistem jika database kosong.</p>
      </div>
    </div>

    <!-- Config Form Groups -->
    <div v-else class="space-y-8">
      <div 
        v-for="(configs, groupName) in groupedConfigs" 
        :key="groupName" 
        class="space-y-4"
      >
        <h2 class="text-sm font-extrabold uppercase tracking-wider text-muted-foreground pl-1">
          {{ groupName }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UiCard 
            v-for="cfg in configs" 
            :key="cfg.key" 
            class="p-5 flex flex-col justify-between hover:border-primary/30 transition-colors"
          >
            <div class="space-y-3">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-extrabold text-slate-800">
                  {{ getConfigLabel(cfg.key) }}
                </span>
                <span class="font-mono text-[10px] text-slate-400" :title="cfg.key">
                  key: {{ cfg.key }}
                </span>
              </div>

              <!-- Boolean toggle for cod_enabled -->
              <template v-if="cfg.key === 'cod_enabled'">
                <div class="space-y-2">
                  <label class="text-[10px] font-bold text-muted-foreground uppercase">Status COD (Toggle)</label>
                  <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div class="space-y-0.5">
                      <p class="text-xs font-bold text-slate-800">
                        {{ editedValues[cfg.key] === 'true' ? 'COD Aktif' : 'COD Nonaktif' }}
                      </p>
                      <p class="text-[10px] text-slate-500 leading-relaxed max-w-[180px]">
                        Jika nonaktif, requester tidak bisa memilih COD saat buat pesanan.
                      </p>
                    </div>
                    <button
                      :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-all', editedValues[cfg.key]==='true' ? 'bg-primary' : 'bg-slate-300']"
                      @click="editedValues[cfg.key] = editedValues[cfg.key]==='true' ? 'false' : 'true'"
                    >
                      <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition', editedValues[cfg.key]==='true' ? 'translate-x-6' : 'translate-x-1']"/>
                    </button>
                  </div>
                  <div v-if="editedValues[cfg.key] !== cfg.value" class="text-[10px] text-amber-600 font-semibold">Perubahan belum disimpan — klik Simpan</div>
                </div>
              </template>
              <template v-else>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-muted-foreground uppercase">Nilai Konfigurasi</label>
                  <input
                    v-model="editedValues[cfg.key]"
                    type="text"
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
                  >
                </div>
              </template>

              <div class="space-y-1">
                <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
                <textarea
                  v-model="editedDescriptions[cfg.key]"
                  rows="2"
                  class="w-full text-xs p-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div class="pt-4 flex items-center justify-between border-t border-slate-100 mt-4">
              <span class="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle class="w-3.5 h-3.5 text-amber-500" />
                Disimpan dinamis ke DB
              </span>
              <UiButton
                size="sm"
                variant="primary"
                :disabled="configsStore.actionLoading"
                @click="handleSave(cfg.key)"
              >
                <Save class="w-3.5 h-3.5 mr-1.5" />
                Simpan
              </UiButton>
            </div>
          </UiCard>
        </div>
      </div>
    </div>
  </div>
</template>
